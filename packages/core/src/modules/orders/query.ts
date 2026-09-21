/* eslint-disable @typescript-eslint/no-explicit-any */
import 'server-only';
import { query } from '@chonghub/core/server/db';
import { AppError } from '@chonghub/core/server/errors';
import type { Actor, PublicOrder } from './contracts';
import { mapPublicOrder } from './public-view';
import { readTimeline } from './repository';

function assertCanRead(actor: Actor | null, row: { id: string; owner_user_id: string | null }) {
  if (!actor) throw new AppError('AUTH_REQUIRED', '请先登录或使用访客查询凭据。', 401);
  if (actor.kind === 'admin') return;
  if (actor.kind === 'user' && actor.userId === row.owner_user_id) return;
  if (actor.kind === 'guest' && actor.orderId === row.id) return;
  throw new AppError('NOT_FOUND', '订单不存在。', 404);
}

const fields = `id, number, snapshot, quoted_price_cents, payment_status, delivery_status,
  screening_status, due_at, completed_at, warranty_ends_at, refund_cents, version, owner_user_id`;

export async function getPublicOrder(number: string, actor: Actor | null): Promise<PublicOrder> {
  const result = await query<any>(`SELECT ${fields} FROM orders WHERE number=$1 LIMIT 1`, [number]);
  const row = result.rows[0];
  if (!row) throw new AppError('NOT_FOUND', '订单不存在。', 404);
  assertCanRead(actor, row);
  return mapPublicOrder(row, await readTimeline(row.id, actor?.kind === 'admin'));
}

export async function listMyOrders(actor: Actor, cursor?: string): Promise<{ items: PublicOrder[]; nextCursor: string | null }> {
  if (actor.kind === 'guest') return { items: [await getPublicOrderById(actor.orderId, actor)], nextCursor: null };
  if (actor.kind !== 'user' && actor.kind !== 'admin') throw new AppError('FORBIDDEN', '无权查看订单。', 403);
  const values: unknown[] = actor.kind === 'admin' ? [] : [actor.userId];
  const where = actor.kind === 'admin' ? '' : 'WHERE owner_user_id=$1';
  if (cursor) { values.push(new Date(cursor)); }
  const cursorClause = cursor ? `${where ? ' AND' : 'WHERE'} created_at < $${values.length}` : '';
  const result = await query<any>(`SELECT ${fields}, created_at FROM orders ${where}${cursorClause} ORDER BY created_at DESC, id DESC LIMIT 21`, values);
  const items = await Promise.all(result.rows.slice(0, 20).map(async (row) => mapPublicOrder(row, await readTimeline(row.id, actor.kind === 'admin'))));
  const nextCursor = result.rows.length > 20 ? new Date(result.rows[19].created_at).toISOString() : null;
  return { items, nextCursor };
}

async function getPublicOrderById(id: string, actor: Actor): Promise<PublicOrder> {
  const result = await query<any>(`SELECT ${fields} FROM orders WHERE id=$1 LIMIT 1`, [id]);
  const row = result.rows[0];
  if (!row) throw new AppError('NOT_FOUND', '订单不存在。', 404);
  assertCanRead(actor, row);
  return mapPublicOrder(row, await readTimeline(row.id));
}
