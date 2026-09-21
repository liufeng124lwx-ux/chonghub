import { AppError } from '@chonghub/core/server/errors';
import { query } from '@chonghub/core/server/db';
import { randomToken, sha256Hex } from '@chonghub/core/server/crypto';
import type { SessionActor, SessionKind } from './contracts';

export const SESSION_COOKIE = 'chonghub_session';
export const SESSION_DURATIONS_MS = {
  user: 7 * 24 * 60 * 60 * 1000,
  admin: 12 * 60 * 60 * 1000,
} as const;

export function sessionTokenFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === SESSION_COOKIE) return decodeURIComponent(value.join('='));
  }
  return null;
}

interface SessionRow {
  user_id: string;
  session_kind: SessionKind;
  expires_at: Date | string;
}

export async function createSession(userId: string, kind?: SessionKind): Promise<{
  token: string;
  actor: SessionActor;
}> {
  if (!userId) throw new TypeError('userId is required');
  const token = randomToken(32);
  const tokenDigest = sha256Hex(token);
  const now = new Date();
  const requestedKind = kind ?? 'user';
  const expiresAt = new Date(now.getTime() + SESSION_DURATIONS_MS[requestedKind]);
  await query(
    `INSERT INTO sessions (user_id, token_digest, session_kind, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [userId, tokenDigest, requestedKind, expiresAt],
  );
  return {
    token,
    actor: { userId, kind: requestedKind, expiresAt: expiresAt.toISOString() },
  };
}

export async function readSession(token: string, now = new Date()): Promise<SessionActor | null> {
  if (typeof token !== 'string' || token.length < 20 || token.length > 512) return null;
  const result = await query<SessionRow>(
    `SELECT user_id, session_kind, expires_at
     FROM sessions
     WHERE token_digest = $1 AND revoked_at IS NULL AND expires_at > $2
     LIMIT 1`,
    [sha256Hex(token), now],
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    userId: row.user_id,
    kind: row.session_kind,
    expiresAt: new Date(row.expires_at).toISOString(),
  };
}

export async function revokeSession(token: string): Promise<void> {
  if (typeof token !== 'string' || token.length < 20 || token.length > 512) return;
  await query(
    `UPDATE sessions SET revoked_at = now() WHERE token_digest = $1 AND revoked_at IS NULL`,
    [sha256Hex(token)],
  );
}

export function sessionCookie(token: string, expiresAt: Date, secure = process.env.NODE_ENV === 'production'): string {
  if (!token) throw new AppError('INVALID_SESSION', '会话无效。', 401);
  const attributes = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    `Max-Age=${Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000))}`,
  ];
  if (secure) attributes.push('Secure');
  return attributes.join('; ');
}

export function clearSessionCookie(secure = process.env.NODE_ENV === 'production'): string {
  return sessionCookie('cleared', new Date(0), secure).replace(/Max-Age=\d+/, 'Max-Age=0');
}
