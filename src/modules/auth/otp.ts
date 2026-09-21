import { randomUUID } from 'node:crypto';
import { AppError } from '@/server/errors';
import { withTransaction } from '@/server/db';
import {
  decryptSecret,
  encryptSecret,
  hmacHex,
  randomOtp,
  randomToken,
  safeEqualHex,
  sha256Hex,
} from '@/server/crypto';
import { normalizeEmail, type OtpPurpose } from './contracts';
import { consumeRateLimit } from './rate-limit';
import { hashPassword, serializePasswordHash, validatePassword } from '@/server/crypto';

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_MS = 60 * 1000;
const OTP_ATTEMPT_LIMIT = 5;

interface ChallengeRow {
  id: string;
  code_digest: string;
  expires_at: Date | string;
  attempts: number;
}

export async function sendOtp(
  email: string,
  purpose: OtpPurpose,
  orderNumber?: string,
  requestIp = 'unknown',
): Promise<void> {
  const canonicalEmail = normalizeEmail(email);
  if (purpose === 'guest_reset' && (!orderNumber || orderNumber.length > 64)) {
    throw new AppError('INVALID_REQUEST', '找回订单需要有效的订单号。', 400);
  }
  const code = randomOtp();
  const now = new Date();
  const encryptedCode = encryptSecret(code);
  let limited = false;

  await withTransaction(async (client) => {
    const recent = await client.query<{ id: string }>(
      `SELECT id FROM otp_challenges
       WHERE canonical_email = $1 AND purpose = $2 AND created_at > $3
       ORDER BY created_at DESC LIMIT 1`,
      [canonicalEmail, purpose, new Date(now.getTime() - OTP_RESEND_MS)],
    );
    if (recent.rowCount) {
      limited = true;
      return;
    }

    const emailAllowed = await consumeRateLimit(client, {
      namespace: 'otp-email',
      identity: canonicalEmail,
      max: 5,
    }, now);
    const ipAllowed = await consumeRateLimit(client, {
      namespace: 'otp-ip',
      identity: requestIp || 'unknown',
      max: 20,
    }, now);
    if (!emailAllowed || !ipAllowed) {
      limited = true;
      return;
    }

    const challengeId = randomUUID();
    await client.query(
      `INSERT INTO otp_challenges
         (id, purpose, canonical_email, code_digest, expires_at, request_ip_digest, order_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        challengeId,
        purpose,
        canonicalEmail,
        hmacHex(`${purpose}:${canonicalEmail}:${code}`),
        new Date(now.getTime() + OTP_TTL_MS),
        hmacHex(requestIp || 'unknown'),
        orderNumber ?? null,
      ],
    );
    await client.query(
      `INSERT INTO outbox (channel, type, dedupe_key, payload)
       VALUES ('email', 'otp', $1, $2::jsonb)`,
      [
        `otp:${challengeId}`,
        JSON.stringify({
          challengeId,
          email: canonicalEmail,
          purpose,
          orderNumber: orderNumber ?? null,
          codeCiphertext: encryptedCode,
        }),
      ],
    );
  });

  if (limited) throw new AppError('OTP_RATE_LIMITED', '验证码发送过于频繁，请稍后再试。', 429);
}

export async function verifyLogin(
  email: string,
  code: string,
): Promise<{ userId: string; sessionToken: string; expiresAt: string }> {
  const canonicalEmail = normalizeEmail(email);
  if (!/^\d{6}$/.test(code)) throw new AppError('INVALID_CODE', '验证码错误或已过期。', 400);
  let outcome: { userId: string; sessionToken: string; expiresAt: string } | null = null;
  let invalid = false;

  await withTransaction(async (client) => {
    const now = new Date();
    const challengeResult = await client.query<ChallengeRow>(
      `SELECT id, code_digest, expires_at, attempts
       FROM otp_challenges
       WHERE canonical_email = $1 AND purpose = 'login'
         AND consumed_at IS NULL AND expires_at > $2 AND attempts < $3
       ORDER BY created_at DESC
       LIMIT 1 FOR UPDATE`,
      [canonicalEmail, now, OTP_ATTEMPT_LIMIT],
    );
    const challenge = challengeResult.rows[0];
    if (!challenge) {
      invalid = true;
      return;
    }

    const digest = hmacHex(`login:${canonicalEmail}:${code}`);
    if (!safeEqualHex(digest, challenge.code_digest)) {
      await client.query('UPDATE otp_challenges SET attempts = attempts + 1 WHERE id = $1', [challenge.id]);
      invalid = true;
      return;
    }

    await client.query('UPDATE otp_challenges SET consumed_at = $1 WHERE id = $2', [now, challenge.id]);
    const userResult = await client.query<{ id: string }>(
      `INSERT INTO users (canonical_email, verified_at)
       VALUES ($1, $2)
       ON CONFLICT (canonical_email)
       DO UPDATE SET verified_at = EXCLUDED.verified_at, updated_at = now()
       RETURNING id`,
      [canonicalEmail, now],
    );
    const userId = userResult.rows[0]?.id;
    if (!userId) throw new AppError('AUTH_UNAVAILABLE', '登录暂时不可用，请稍后再试。', 503);
    await client.query(`UPDATE orders SET owner_user_id=$1, updated_at=now() WHERE owner_user_id IS NULL AND contact_email=$2`, [userId, canonicalEmail]);
    await client.query(`UPDATE guest_grants SET revoked_at=now(), grant_version=grant_version+1 WHERE order_id IN (SELECT id FROM orders WHERE owner_user_id=$1) AND revoked_at IS NULL`, [userId]);

    const adminResult = await client.query<{ id: number }>(
      'SELECT id FROM admin_identity WHERE user_id = $1 LIMIT 1',
      [userId],
    );
    const kind = adminResult.rowCount ? 'admin' : 'user';
    const token = randomToken(32);
    const tokenDigest = sha256Hex(token);
    const expiresAt = new Date(now.getTime() + (kind === 'admin' ? 12 : 24 * 7) * 60 * 60 * 1000);
    await client.query(
      `INSERT INTO sessions (user_id, token_digest, session_kind, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [userId, tokenDigest, kind, expiresAt],
    );
    outcome = { userId, sessionToken: token, expiresAt: expiresAt.toISOString() };
  });

  if (invalid || !outcome) throw new AppError('INVALID_CODE', '验证码错误或已过期。', 400);
  return outcome;
}

export async function verifyGuestReset(email: string, orderNumber: string, code: string, newPassword: string): Promise<{ orderId: string }> {
  const canonicalEmail = normalizeEmail(email);
  if (!/^\d{6}$/.test(code)) throw new AppError('INVALID_CODE', '验证码错误或已过期。', 400);
  try { validatePassword(newPassword); } catch { throw new AppError('INVALID_REQUEST', '新密码需要设置 12 至 128 位字符。'); }
  const passwordHash = serializePasswordHash(await hashPassword(newPassword));
  let orderId: string | null = null;
  await withTransaction(async (client) => {
    const challenge = await client.query<ChallengeRow & { order_number: string }>(`SELECT id,code_digest,expires_at,attempts,order_number FROM otp_challenges WHERE canonical_email=$1 AND purpose='guest_reset' AND order_number=$2 AND consumed_at IS NULL AND expires_at > now() AND attempts < $3 ORDER BY created_at DESC LIMIT 1 FOR UPDATE`, [canonicalEmail, orderNumber, OTP_ATTEMPT_LIMIT]);
    const row = challenge.rows[0];
    if (!row || !safeEqualHex(hmacHex(`guest_reset:${canonicalEmail}:${code}`), row.code_digest)) { if (row) await client.query('UPDATE otp_challenges SET attempts=attempts+1 WHERE id=$1', [row.id]); throw new AppError('INVALID_CODE', '验证码错误或已过期。', 400); }
    const order = await client.query<{ id: string }>('SELECT id FROM orders WHERE number=$1 AND contact_email=$2 AND owner_user_id IS NULL FOR UPDATE', [orderNumber, canonicalEmail]);
    if (!order.rows[0]) throw new AppError('INVALID_CODE', '验证码错误或已过期。', 400);
    orderId = order.rows[0].id;
    await client.query('UPDATE otp_challenges SET consumed_at=now() WHERE id=$1', [row.id]);
    await client.query('UPDATE orders SET guest_password_digest=$1, updated_at=now() WHERE id=$2', [passwordHash, orderId]);
    await client.query('UPDATE guest_grants SET revoked_at=now(), grant_version=grant_version+1 WHERE order_id=$1 AND revoked_at IS NULL', [orderId]);
  });
  if (!orderId) throw new AppError('INVALID_CODE', '验证码错误或已过期。', 400);
  return { orderId };
}

/** Verify the contact email for a guest order before issuing a short-lived grant. */
export async function verifyGuestAccess(email: string, orderNumber: string, code: string): Promise<{ orderId: string }> {
  const canonicalEmail = normalizeEmail(email);
  if (!/^\d{6}$/.test(code)) throw new AppError('INVALID_CODE', '验证码错误或已过期。', 400);
  let orderId: string | null = null;
  await withTransaction(async (client) => {
    const challenge = await client.query<ChallengeRow & { order_number: string }>(
      `SELECT id,code_digest,expires_at,attempts,order_number
       FROM otp_challenges
       WHERE canonical_email=$1 AND purpose='guest_reset' AND order_number=$2
         AND consumed_at IS NULL AND expires_at > now() AND attempts < $3
       ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
      [canonicalEmail, orderNumber, OTP_ATTEMPT_LIMIT],
    );
    const row = challenge.rows[0];
    if (!row || !safeEqualHex(hmacHex(`guest_reset:${canonicalEmail}:${code}`), row.code_digest)) {
      if (row) await client.query('UPDATE otp_challenges SET attempts=attempts+1 WHERE id=$1', [row.id]);
      throw new AppError('INVALID_CODE', '验证码错误或已过期。', 400);
    }
    const order = await client.query<{ id: string }>(
      'SELECT id FROM orders WHERE number=$1 AND contact_email=$2 AND owner_user_id IS NULL FOR UPDATE',
      [orderNumber, canonicalEmail],
    );
    if (!order.rows[0]) throw new AppError('INVALID_CODE', '验证码错误或已过期。', 400);
    orderId = order.rows[0].id;
    await client.query('UPDATE otp_challenges SET consumed_at=now() WHERE id=$1', [row.id]);
  });
  if (!orderId) throw new AppError('INVALID_CODE', '验证码错误或已过期。', 400);
  return { orderId };
}

export function decodeOtpForDelivery(payload: { codeCiphertext: { ciphertext: string; iv: string; tag: string } }): string {
  return decryptSecret(payload.codeCiphertext);
}

export { OTP_ATTEMPT_LIMIT, OTP_RESEND_MS, OTP_TTL_MS };
