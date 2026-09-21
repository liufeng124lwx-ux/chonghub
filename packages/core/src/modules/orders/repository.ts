import 'server-only';
import type { PoolClient } from 'pg';
import { query } from '@chonghub/core/server/db';
import type { PublicOrder } from './contracts';
import { mapPublicOrder, type OrderRow } from './public-view';

const orderFields = `id, number, snapshot, quoted_price_cents, payment_status, delivery_status,
  screening_status, due_at, completed_at, warranty_ends_at, refund_cents, version`;

export async function readOrderByNumber(number: string, client?: PoolClient): Promise<(OrderRow & { owner_user_id: string | null; contact_email: string; ready_at: Date | string | null; sku_id: string }) | null> {
  const sql = `SELECT ${orderFields}, owner_user_id, contact_email, ready_at, sku_id FROM orders WHERE number = $1 LIMIT 1`;
  const result = client
    ? await client.query<OrderRow & { owner_user_id: string | null; contact_email: string; ready_at: Date | string | null; sku_id: string }>(sql, [number])
    : await query<OrderRow & { owner_user_id: string | null; contact_email: string; ready_at: Date | string | null; sku_id: string }>(sql, [number]);
  return result.rows[0] ?? null;
}

export async function readTimeline(orderId: string, includeInternal = false, client?: PoolClient): Promise<PublicOrder['timeline']> {
  const sql = `SELECT created_at, message FROM order_events WHERE order_id=$1 ${includeInternal ? '' : "AND visibility='customer'"} ORDER BY created_at ASC`;
  const result = client
    ? await client.query<{ created_at: Date | string; message: string }>(sql, [orderId])
    : await query<{ created_at: Date | string; message: string }>(sql, [orderId]);
  return result.rows.map((row) => ({ at: new Date(row.created_at).toISOString(), message: row.message }));
}

export async function publicOrderFromRow(row: OrderRow & { id: string }, includeInternal = false, client?: PoolClient): Promise<PublicOrder> {
  return mapPublicOrder(row, await readTimeline(row.id, includeInternal, client));
}
