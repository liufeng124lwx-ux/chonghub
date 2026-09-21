/* eslint-disable @typescript-eslint/no-explicit-any */
import { jsonData } from '@chonghub/core/server/http';
import { routeSafely } from '@chonghub/core/server/router';
import { AppError } from '@chonghub/core/server/errors';
import { readAdminActor, createAdminSession, adminSessionCookie, revokeAdminSession, clearAdminSessionCookie } from '@chonghub/core/modules/auth/admin-session';
import { sendOtp, verifyLogin } from '@chonghub/core/modules/auth/otp';
import { normalizeEmail } from '@chonghub/core/modules/auth/contracts';
import { query } from '@chonghub/core/server/db';
import { executeAdminCommand, parseAdminCommand } from '@chonghub/core/modules/orders/commands';
import { updatePublicSettings } from '@chonghub/core/modules/settings/service';
import { updateCatalogEntry, publishProduct } from '@chonghub/core/modules/catalog/admin';
import { setSkuAvailability } from '@chonghub/core/modules/catalog/availability';
import { getNotificationSummary, retryNotification } from '@chonghub/core/modules/notifications/admin';
import { recordRefund } from '@chonghub/core/modules/after-sales/service';

type Ctx = { params: Promise<{ path?: string[] }> };
async function body(request: Request): Promise<Record<string, unknown>> {
  const value: unknown = JSON.parse(await request.text());
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new AppError('INVALID_REQUEST', '请求格式无效。');
  return value as Record<string, unknown>;
}
function text(value: unknown, name: string): string { if (typeof value !== 'string' || !value) throw new AppError('INVALID_REQUEST', `${name} 无效。`); return value; }
async function handler(request: Request, { params }: Ctx) {
  const path = `/${((await params).path ?? []).join('/')}`;
  const origin = request.headers.get('origin');
  if (request.method !== 'GET' && (!origin || origin !== (process.env.APP_ORIGIN || new URL(request.url).origin))) throw new AppError('CSRF_REJECTED', '请求来源不受信任。', 403);
  if (request.method === 'POST' && path === '/auth/otp') { const data = await body(request); await sendOtp(normalizeEmail(text(data.email, '邮箱')), 'login', undefined, request.headers.get('x-forwarded-for') ?? 'unknown'); return jsonData({ accepted: true }); }
  if (request.method === 'POST' && path === '/auth/verify') { const data = await body(request); const result = await verifyLogin(normalizeEmail(text(data.email, '邮箱')), text(data.code, '验证码')); const admin = await createAdminSession(result.userId); const response = jsonData({ userId: result.userId }); response.headers.append('Set-Cookie', adminSessionCookie(admin.token, admin.expiresAt)); return response; }
  if (request.method === 'POST' && path === '/auth/logout') { await revokeAdminSession(request); const response = jsonData({ loggedOut: true }); response.headers.append('Set-Cookie', clearAdminSessionCookie()); return response; }
  const actor = await readAdminActor(request);
  if (!actor) throw new AppError('FORBIDDEN', '无权访问后台。', 403);
  const command = path.match(/^\/orders\/([^/]+)\/commands$/);
  if (request.method === 'POST' && command) { const data = await body(request); return jsonData(await executeAdminCommand(command[1], actor, parseAdminCommand(data.command), text(data.idempotencyKey, '操作标识'), Number(data.expectedVersion))); }
  if (request.method === 'GET' && path === '/dashboard') {
    const [counts, afterSales, overdue, notifications] = await Promise.all([
      query<{ delivery_status: string; count: string }>('SELECT delivery_status,count(*)::text count FROM orders GROUP BY delivery_status'),
      query<{ count: string }>(`SELECT count(*)::text AS count FROM after_sales WHERE status IN ('open','reviewing')`),
      query<{ count: string }>(`SELECT count(*)::text AS count FROM orders WHERE due_at IS NOT NULL AND due_at < now() AND delivery_status NOT IN ('completed','cancelled')`),
      getNotificationSummary(),
    ]);
    return jsonData({ counts: Object.fromEntries(counts.rows.map((row) => [row.delivery_status, Number(row.count)])), afterSalesPending: Number(afterSales.rows[0]?.count ?? 0), overdueOrders: Number(overdue.rows[0]?.count ?? 0), notifications });
  }
  if (request.method === 'GET' && path === '/notifications') return jsonData(await getNotificationSummary());
  const retry = path.match(/^\/notifications\/([^/]+)\/retry$/);
  if (request.method === 'POST' && retry) { const result = await retryNotification(retry[1], actor.userId); return jsonData({ retried: result }); }
  if (request.method === 'GET' && path === '/orders') {
    const url = new URL(request.url); const q = url.searchParams.get('q')?.trim() ?? ''; const status = url.searchParams.get('status')?.trim() ?? '';
    const values: unknown[] = []; const filters: string[] = []; if (q) { values.push(`%${q}%`); filters.push(`(number ILIKE $${values.length} OR contact_email ILIKE $${values.length})`); } if (status) { values.push(status); filters.push(`delivery_status=$${values.length}`); }
    values.push(Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? 100) || 100))); const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const orders = await query<{ number: string; contact_email: string; delivery_status: string; payment_status: string; screening_status: string; quoted_price_cents: number | null; due_at: Date | null; created_at: Date }>(`SELECT number,contact_email,delivery_status,payment_status,screening_status,quoted_price_cents,due_at,created_at FROM orders ${where} ORDER BY created_at DESC LIMIT $${values.length}`, values);
    return jsonData(orders.rows.map((row) => ({ number: row.number, email: row.contact_email, deliveryStatus: row.delivery_status, paymentStatus: row.payment_status, screeningStatus: row.screening_status, quotedPriceCents: row.quoted_price_cents, dueAt: row.due_at ? new Date(row.due_at).toISOString() : null, createdAt: new Date(row.created_at).toISOString() })));
  }
  if (request.method === 'PATCH' && path === '/settings') { const data = await body(request); await updatePublicSettings(data as any); return jsonData({ updated: true }); }
  const product = path.match(/^\/products\/([^/]+)$/); if (request.method === 'PATCH' && product) { const data = await body(request); await updateCatalogEntry(product[1], data as any); return jsonData({ updated: true }); }
  const publish = path.match(/^\/products\/([^/]+)\/publish$/); if (request.method === 'POST' && publish) { await publishProduct(publish[1]); return jsonData({ published: true }); }
  const availability = path.match(/^\/products\/([^/]+)\/skus\/([^/]+)\/availability$/); if (request.method === 'PATCH' && availability) { const data = await body(request); await setSkuAvailability(availability[1], availability[2], data.availability as 'available' | 'sold_out', actor, text(data.idempotencyKey, '操作标识'), Number(data.expectedVersion)); return jsonData({ updated: true }); }
  const refund = path.match(/^\/after-sales\/([^/]+)\/refunds$/); if (request.method === 'POST' && refund) { const data = await body(request); await recordRefund(refund[1], actor, data as any, text(data.idempotencyKey, '操作标识'), Number(data.version)); return jsonData({ recorded: true }); }
  throw new AppError('NOT_FOUND', '接口不存在。', 404);
}
export async function GET(request: Request, context: Ctx) { return routeSafely(() => handler(request, context)); }
export async function POST(request: Request, context: Ctx) { return routeSafely(() => handler(request, context)); }
export async function PATCH(request: Request, context: Ctx) { return routeSafely(() => handler(request, context)); }
