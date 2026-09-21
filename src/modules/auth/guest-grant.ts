import { query } from '@/server/db';
import {
  hashPassword,
  parsePasswordHash,
  serializePasswordHash,
  validatePassword,
  verifyPassword,
  randomToken,
  sha256Hex,
} from '@/server/crypto';
import type { GuestGrant } from './contracts';

const GUEST_GRANT_TTL_MS = 24 * 60 * 60 * 1000;

export async function hashGuestPassword(password: string): Promise<string> {
  validatePassword(password);
  return serializePasswordHash(await hashPassword(password));
}

export async function verifyGuestPassword(password: string, encoded: string): Promise<boolean> {
  if (typeof password !== 'string' || password.length < 12 || password.length > 128) return false;
  const parsed = parsePasswordHash(encoded);
  return parsed ? verifyPassword(password, parsed) : false;
}

export async function createGuestGrant(orderId: string, grantVersion = 1): Promise<{ token: string; grant: GuestGrant }> {
  if (!orderId || !Number.isSafeInteger(grantVersion) || grantVersion < 1) throw new TypeError('invalid guest grant');
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + GUEST_GRANT_TTL_MS);
  await query(
    `INSERT INTO guest_grants (order_id, token_digest, grant_version, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [orderId, sha256Hex(token), grantVersion, expiresAt],
  );
  return { token, grant: { orderId, grantVersion, expiresAt: expiresAt.toISOString() } };
}

export async function readGuestGrant(token: string, now = new Date()): Promise<GuestGrant | null> {
  if (typeof token !== 'string' || token.length < 20 || token.length > 512) return null;
  const result = await query<{ order_id: string; grant_version: number; expires_at: Date | string }>(
    `SELECT order_id, grant_version, expires_at
     FROM guest_grants
     WHERE token_digest = $1 AND revoked_at IS NULL AND expires_at > $2
     LIMIT 1`,
    [sha256Hex(token), now],
  );
  const row = result.rows[0];
  return row
    ? { orderId: row.order_id, grantVersion: row.grant_version, expiresAt: new Date(row.expires_at).toISOString() }
    : null;
}

export async function revokeGuestGrants(orderId: string): Promise<void> {
  await query('UPDATE guest_grants SET revoked_at = now(), grant_version = grant_version + 1 WHERE order_id = $1 AND revoked_at IS NULL', [orderId]);
}

export { GUEST_GRANT_TTL_MS };
