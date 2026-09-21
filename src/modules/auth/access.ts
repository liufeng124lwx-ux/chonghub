import type { Actor } from '@/modules/orders/contracts';
import { AppError } from '@/server/errors';
import { query } from '@/server/db';
import { readGuestGrant } from './guest-grant';
import { SESSION_COOKIE, readSession } from './session';

const GUEST_COOKIE = 'chonghub_guest_grant';

function cookieValue(request: Request, name: string): string | null {
  const header = request.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) return decodeURIComponent(value.join('='));
  }
  return null;
}

export async function readActor(request: Request): Promise<Actor | null> {
  const sessionToken = cookieValue(request, SESSION_COOKIE);
  if (sessionToken) {
    const session = await readSession(sessionToken);
    if (session) {
      if (session.kind === 'admin') {
        const admin = await query('SELECT 1 FROM admin_identity WHERE user_id = $1 LIMIT 1', [session.userId]);
        if (admin.rowCount) return { kind: 'admin', userId: session.userId };
      } else {
        return { kind: 'user', userId: session.userId };
      }
    }
  }
  const guestToken = cookieValue(request, GUEST_COOKIE);
  if (guestToken) {
    const grant = await readGuestGrant(guestToken);
    if (grant) return { kind: 'guest', orderId: grant.orderId, grantVersion: grant.grantVersion };
  }
  return null;
}

export async function authorizeOrder(actor: Actor, orderId: string): Promise<void> {
  if (!actor || !orderId) throw new AppError('NOT_FOUND', '订单不存在。', 404);
  if (actor.kind === 'admin') {
    const admin = await query('SELECT 1 FROM admin_identity WHERE user_id = $1 LIMIT 1', [actor.userId]);
    if (admin.rowCount) return;
    throw new AppError('NOT_FOUND', '订单不存在。', 404);
  }

  // The order table and owner checks are introduced by migration 003. Keep
  // this authorization boundary here so callers cannot accidentally use a
  // public order number as an authentication token.
  if (actor.kind === 'guest' && actor.orderId === orderId) {
    const grant = await query(
      `SELECT 1 FROM guest_grants
       WHERE order_id = $1 AND grant_version = $2 AND revoked_at IS NULL AND expires_at > now()
       LIMIT 1`,
      [orderId, actor.grantVersion],
    );
    if (grant.rowCount) return;
  }
  if (actor.kind === 'user') {
    const owner = await query(
      'SELECT 1 FROM orders WHERE id = $1 AND owner_user_id = $2 LIMIT 1',
      [orderId, actor.userId],
    );
    if (owner.rowCount) return;
  }
  throw new AppError('NOT_FOUND', '订单不存在。', 404);
}

export { GUEST_COOKIE };
