import { AppError } from '@chonghub/core/server/errors';
import { query } from '@chonghub/core/server/db';
import { createSession, readSession, revokeSession, SESSION_DURATIONS_MS } from './session';
import type { Actor } from '@chonghub/core/modules/orders/contracts';

export const ADMIN_SESSION_COOKIE = 'chonghub_admin_session';

function cookieValue(request: Request, name: string): string | null {
  const header = request.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) return decodeURIComponent(value.join('='));
  }
  return null;
}

export function adminSessionTokenFromRequest(request: Request): string | null {
  return cookieValue(request, ADMIN_SESSION_COOKIE);
}

export async function createAdminSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const identity = await query('SELECT 1 FROM admin_identity WHERE user_id = $1 LIMIT 1', [userId]);
  if (!identity.rowCount) throw new AppError('FORBIDDEN', '无权访问后台。', 403);
  const session = await createSession(userId, 'admin');
  return { token: session.token, expiresAt: new Date(session.actor.expiresAt) };
}

export async function readAdminActor(request: Request): Promise<Extract<Actor, { kind: 'admin' }> | null> {
  const token = adminSessionTokenFromRequest(request);
  if (!token) return null;
  const session = await readSession(token);
  if (!session || session.kind !== 'admin') return null;
  const identity = await query('SELECT 1 FROM admin_identity WHERE user_id = $1 LIMIT 1', [session.userId]);
  return identity.rowCount ? { kind: 'admin', userId: session.userId } : null;
}

export function adminSessionCookie(token: string, expiresAt: Date, secure = process.env.NODE_ENV === 'production'): string {
  if (!token) throw new AppError('INVALID_SESSION', '会话无效。', 401);
  const attributes = [`${ADMIN_SESSION_COOKIE}=${encodeURIComponent(token)}`, 'HttpOnly', 'Path=/', 'SameSite=Lax', `Max-Age=${Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000))}`];
  if (secure) attributes.push('Secure');
  return attributes.join('; ');
}

export function clearAdminSessionCookie(secure = process.env.NODE_ENV === 'production'): string {
  return adminSessionCookie('cleared', new Date(0), secure).replace(/Max-Age=\d+/, 'Max-Age=0');
}

export async function revokeAdminSession(request: Request): Promise<void> {
  const token = adminSessionTokenFromRequest(request);
  if (token) await revokeSession(token);
}

export const ADMIN_SESSION_DURATION_MS = SESSION_DURATIONS_MS.admin;
