import { AppError } from '@chonghub/core/server/errors';
import { query } from '@chonghub/core/server/db';
import { parsePasswordHash, verifyPassword } from '@chonghub/core/server/crypto';
import { createAdminSession } from './admin-session';

const INVALID_CREDENTIALS = '用户名或密码错误。';

// A fixed encoded digest keeps the failure path comparable when the username
// does not exist. It is a digest, never a usable password or a stored secret.
const DUMMY_PASSWORD_HASH = 'scrypt$N=32768$r=8$p=1$ZVYtvn4Dp6aKth5KrTTTAw$S9FQrVyW8U9E4QTG2SJcCkrDgLemVtvVVlndjLqAe88';

export function normalizeAdminUsername(value: string): string {
  if (typeof value !== 'string') throw new TypeError('invalid admin username');
  const username = value.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9_.-]{2,63}$/.test(username)) throw new TypeError('invalid admin username');
  return username;
}

export async function authenticateAdmin(
  usernameInput: unknown,
  passwordInput: unknown,
): Promise<{ userId: string; sessionToken: string; expiresAt: string }> {
  const username = typeof usernameInput === 'string' ? usernameInput.trim().toLowerCase() : '';
  const password = typeof passwordInput === 'string' ? passwordInput : '';
  const normalizedUsername = /^[a-z0-9][a-z0-9_.-]{2,63}$/.test(username) ? username : null;
  const result = await query<{ user_id: string; password_digest: string }>(
    `SELECT c.user_id, c.password_digest
     FROM admin_credentials c
     JOIN admin_identity i ON i.user_id = c.user_id
     WHERE lower(c.username) = $1
     LIMIT 1`,
    [normalizedUsername ?? ''],
  );
  const row = result.rows[0];
  const stored = parsePasswordHash(row?.password_digest ?? DUMMY_PASSWORD_HASH);
  let valid = false;
  if (stored) {
    try {
      valid = await verifyPassword(password, stored);
    } catch {
      valid = false;
    }
  }
  if (!row || !valid) throw new AppError('INVALID_CREDENTIALS', INVALID_CREDENTIALS, 401);
  const session = await createAdminSession(row.user_id);
  return { userId: row.user_id, sessionToken: session.token, expiresAt: session.expiresAt.toISOString() };
}

export { INVALID_CREDENTIALS };
