/* eslint-disable @typescript-eslint/no-explicit-any */
import 'server-only';
import { hmacHex } from '@/server/crypto';
import { withTransaction } from '@/server/db';
import { AppError } from '@/server/errors';
import { calculateDueAt } from '@/modules/fulfillment/business-time';
import { enqueueEvent } from '@/modules/notifications/outbox';
import { isScreeningReport, type ScreeningReport } from '@/modules/screening/report-schema';
import type { Actor, PublicOrder } from './contracts';
import { mapPublicOrder } from './public-view';
import { readTimeline } from './repository';

export type AdminCommand =
  | { type: 'confirm_quote'; priceCents: number; customerConfirmedAt: string }
  | { type: 'confirm_receipt'; amountCents: number; receivedAt: string; reference: string }
  | { type: 'confirm_materials' }
  | { type: 'start_processing' }
  | { type: 'needs_info'; message: string }
  | { type: 'complete'; successAt: string; result: string }
  | { type: 'cancel'; reason: string }
  | { type: 'add_note'; text: string; visibility: 'internal' | 'customer' };

function commandText(value: unknown, name: string, max = 2000): string {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > max) throw new AppError('INVALID_REQUEST', `${name} 无效。`);
  return value.trim();
}

function commandDate(value: unknown, name: string): string {
  if (typeof value !== 'string') throw new AppError('INVALID_REQUEST', `${name} 无效。`);
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime()) || parsed.getTime() > Date.now()) throw new AppError('INVALID_REQUEST', `${name} 无效。`);
  return value;
}

export function parseAdminCommand(value: unknown): AdminCommand {
  if (!value || typeof value !== 'object' || Array.isArray(value) || typeof (value as { type?: unknown }).type !== 'string') throw new AppError('INVALID_REQUEST', '管理员操作格式无效。');
  const command = value as Record<string, unknown>;
  switch (command.type) {
    case 'confirm_quote':
      if (!Number.isSafeInteger(command.priceCents) || Number(command.priceCents) <= 0) throw new AppError('INVALID_REQUEST', '报价金额无效。');
      return { type: 'confirm_quote', priceCents: command.priceCents as number, customerConfirmedAt: commandDate(command.customerConfirmedAt, '客户确认时间') };
    case 'confirm_receipt':
      if (!Number.isSafeInteger(command.amountCents) || Number(command.amountCents) <= 0) throw new AppError('INVALID_REQUEST', '收款金额无效。');
      return { type: 'confirm_receipt', amountCents: command.amountCents as number, receivedAt: commandDate(command.receivedAt, '收款时间'), reference: commandText(command.reference, '收款参考号', 200) };
    case 'confirm_materials': return { type: 'confirm_materials' };
    case 'start_processing': return { type: 'start_processing' };
    case 'needs_info': return { type: 'needs_info', message: commandText(command.message, '待补充内容') };
    case 'complete': return { type: 'complete', successAt: commandDate(command.successAt, '完成时间'), result: commandText(command.result, '完成结果') };
    case 'cancel': return { type: 'cancel', reason: commandText(command.reason, '取消原因') };
    case 'add_note':
      if (command.visibility !== 'internal' && command.visibility !== 'customer') throw new AppError('INVALID_REQUEST', '备注可见范围无效。');
      return { type: 'add_note', text: commandText(command.text, '备注'), visibility: command.visibility };
    default: throw new AppError('INVALID_REQUEST', '管理员操作类型无效。');
  }
}

const fields = `id, number, snapshot, quoted_price_cents, payment_status, delivery_status,
  screening_status, due_at, completed_at, warranty_ends_at, refund_cents, version`;

function assertAdmin(actor: Actor): asserts actor is Extract<Actor, { kind: 'admin' }> {
  if (actor.kind !== 'admin') throw new AppError('FORBIDDEN', '只有管理员可以执行该操作。', 403);
}

export async function recordScreening(orderId: string, actor: Actor, report: ScreeningReport, key: string): Promise<void> {
  if (!isScreeningReport(report)) throw new AppError('INVALID_REQUEST', '初筛报告格式无效。');
  if (typeof key !== 'string' || key.length < 16 || key.length > 200) throw new AppError('INVALID_REQUEST', '操作标识无效。');
  const keyDigest = hmacHex(`screening:${orderId}:${key}`);
  const reportDigest = hmacHex(JSON.stringify(report));
  await withTransaction(async (client) => {
    const order = await client.query<{ id: string; number: string; owner_user_id: string | null; contact_email: string; screening_status: string }>('SELECT id, number, owner_user_id, contact_email, screening_status FROM orders WHERE id=$1 FOR UPDATE', [orderId]);
    const row = order.rows[0];
    if (!row || (actor.kind === 'user' && row.owner_user_id !== actor.userId) || (actor.kind === 'guest' && actor.orderId !== orderId)) throw new AppError('NOT_FOUND', '订单不存在。', 404);
    const prior = await client.query<{ body_digest: string | null }>(
      'SELECT body_digest FROM screening_reports WHERE order_id=$1 AND idempotency_key_digest=$2 LIMIT 1',
      [orderId, keyDigest],
    );
    if (prior.rows[0]) {
      if (prior.rows[0].body_digest !== reportDigest) throw new AppError('IDEMPOTENCY_CONFLICT', '操作标识已用于其他初筛报告。', 409);
      return;
    }
    await client.query(`INSERT INTO screening_reports (order_id,status,plan_type,reason,rule_version,idempotency_key_digest,body_digest) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [orderId, report.status, report.planType, report.reason, report.ruleVersion, keyDigest, reportDigest]);
    const mappedStatus = report.status === 'passed' ? 'passed' : report.status;
    await client.query(`UPDATE orders SET screening_status=$1, version=version+1, updated_at=now() WHERE id=$2`, [mappedStatus, orderId]);
    await client.query(`INSERT INTO order_events (order_id,type,message,visibility) VALUES ($1,'screening', $2, 'customer')`, [orderId, report.status === 'passed' ? '账号初筛通过，请添加微信客服确认。' : report.status === 'subscribed' ? '当前账号仍有订阅，请等待订阅结束后再联系。' : '账号初筛未通过，请检查登录状态或联系微信客服。']);
    if (report.status === 'passed' && row.screening_status !== 'passed') {
      await enqueueEvent(client, { dedupeKey: `order:${orderId}:screening:first-pass`, channel: 'email', type: 'screening_passed', payload: { email: row.contact_email, orderNumber: row.number } });
      await enqueueEvent(client, { dedupeKey: `order:${orderId}:screening:first-pass:feishu`, channel: 'feishu', type: 'screening_passed', payload: { orderNumber: row.number } });
    }
  });
}

export async function addCustomerMessage(orderId: string, actor: Actor, message: string, key: string): Promise<void> {
  if (typeof message !== 'string' || message.trim().length === 0 || message.length > 2000) throw new AppError('INVALID_REQUEST', '补充内容不能为空且不超过 2000 个字符。');
  if (typeof key !== 'string' || key.length < 16 || key.length > 200) throw new AppError('INVALID_REQUEST', '操作标识无效。');
  const keyDigest = hmacHex(`message:${orderId}:${key}`);
  const messageDigest = hmacHex(JSON.stringify({ message: message.trim() }));
  await withTransaction(async (client) => {
    const order = await client.query<{ id: string; number: string; owner_user_id: string | null; contact_email: string }>('SELECT id, number, owner_user_id, contact_email FROM orders WHERE id=$1 FOR UPDATE', [orderId]);
    const row = order.rows[0];
    if (!row || (actor.kind === 'user' && row.owner_user_id !== actor.userId) || (actor.kind === 'guest' && actor.orderId !== orderId)) throw new AppError('NOT_FOUND', '订单不存在。', 404);
    const prior = await client.query<{ body_digest: string | null }>(
      `SELECT body_digest FROM order_events WHERE order_id=$1 AND type='customer_message' AND idempotency_key_digest=$2 LIMIT 1`,
      [orderId, keyDigest],
    );
    if (prior.rows[0]) {
      if (prior.rows[0].body_digest !== messageDigest) throw new AppError('IDEMPOTENCY_CONFLICT', '操作标识已用于其他补充内容。', 409);
      return;
    }
    await client.query(`INSERT INTO order_events (order_id,type,message,visibility,created_by,idempotency_key_digest,body_digest) VALUES ($1,'customer_message',$2,'customer',$3,$4,$5)`, [orderId, message.trim(), actor.kind, keyDigest, messageDigest]);
    await enqueueEvent(client, { dedupeKey: `order:${orderId}:message:${keyDigest}`, channel: 'email', type: 'customer_message', payload: { email: row.contact_email, orderNumber: row.number } });
    await enqueueEvent(client, { dedupeKey: `order:${orderId}:message:${keyDigest}:feishu`, channel: 'feishu', type: 'customer_message', payload: { orderNumber: row.number } });
  });
}

export async function executeAdminCommand(number: string, actor: Actor, command: AdminCommand, key: string, expectedVersion: number): Promise<PublicOrder> {
  assertAdmin(actor);
  command = parseAdminCommand(command);
  if (typeof key !== 'string' || key.length < 16 || key.length > 200) throw new AppError('INVALID_REQUEST', '操作标识无效。');
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0) throw new AppError('INVALID_REQUEST', '版本号无效。');
  const bodyDigest = hmacHex(JSON.stringify(command));
  return withTransaction(async (client) => {
    const orderResult = await client.query<any>(`SELECT ${fields}, owner_user_id, contact_email, ready_at FROM orders WHERE number=$1 FOR UPDATE`, [number]);
    const row = orderResult.rows[0];
    if (!row) throw new AppError('NOT_FOUND', '订单不存在。', 404);
    const prior = await client.query<{ body_digest: string; result: PublicOrder }>('SELECT body_digest, result FROM order_commands WHERE order_id=$1 AND idempotency_key=$2', [row.id, key]);
    if (prior.rows[0]) {
      if (prior.rows[0].body_digest !== bodyDigest) throw new AppError('IDEMPOTENCY_CONFLICT', '操作标识已用于其他命令。', 409);
      return prior.rows[0].result;
    }
    if (row.version !== expectedVersion) throw new AppError('VERSION_CONFLICT', '订单已被其他操作更新，请刷新后重试。', 409);
    const now = new Date();
    let message: string | null = null;
    switch (command.type) {
      case 'confirm_quote':
        if (!Number.isSafeInteger(command.priceCents) || command.priceCents <= 0 || row.payment_status !== 'unpaid') throw new AppError('INVALID_STATE', '当前状态不能确认报价。', 409);
        await client.query(`UPDATE orders SET quoted_price_cents=$1, updated_at=now() WHERE id=$2`, [command.priceCents, row.id]); message = `已确认报价 ¥${(command.priceCents / 100).toFixed(2)}`; break;
      case 'confirm_receipt':
        if (row.payment_status !== 'unpaid' || row.quoted_price_cents === null || command.amountCents !== row.quoted_price_cents) throw new AppError('INVALID_STATE', '收款金额必须等于已确认报价。', 409);
        await client.query(`INSERT INTO receipts (order_id,amount_cents,received_at,reference) VALUES ($1,$2,$3,$4)`, [row.id, command.amountCents, command.receivedAt, command.reference]); await client.query(`UPDATE orders SET payment_status='paid', updated_at=now() WHERE id=$1`, [row.id]); message = '已确认收款'; break;
      case 'confirm_materials':
        // Screening is a client-provided preliminary report. It must never be
        // the authorization that makes an order fulfillable; the operator's
        // explicit materials confirmation is the manual eligibility check.
        if (row.payment_status !== 'paid' || !row.quoted_price_cents) throw new AppError('NOT_READY', '需要先确认报价和收款，再由客服人工确认资料。', 409);
        { const readyAt = row.ready_at ?? now; const dueAt = row.ready_at ? row.due_at : calculateDueAt(readyAt, row.snapshot.policy); await client.query(`UPDATE orders SET ready_at=COALESCE(ready_at,$1), due_at=COALESCE(due_at,$2), delivery_status='pending', updated_at=now() WHERE id=$3`, [readyAt, dueAt, row.id]); } message = '资料已确认齐全'; break;
      case 'start_processing':
        if (row.payment_status !== 'paid' || !row.ready_at || !row.due_at) throw new AppError('NOT_READY', '需要先确认报价、收款和资料。', 409);
        await client.query(`UPDATE orders SET delivery_status='processing', updated_at=now() WHERE id=$1`, [row.id]); message = '开始人工处理'; break;
      case 'needs_info':
        if (!command.message.trim()) throw new AppError('INVALID_REQUEST', '请填写待补充内容。'); await client.query(`UPDATE orders SET delivery_status='needs_info', updated_at=now() WHERE id=$1`, [row.id]); message = command.message.trim(); break;
      case 'complete':
        if (row.payment_status !== 'paid' || !['processing', 'pending'].includes(row.delivery_status)) throw new AppError('INVALID_STATE', '当前状态不能完成交付。', 409);
        { const successAt = new Date(command.successAt); if (!Number.isFinite(successAt.getTime()) || successAt > now) throw new AppError('INVALID_REQUEST', '完成时间无效。'); const warrantyEndsAt = new Date(successAt.getTime() + row.snapshot.policy.warrantyDays * 86400000); await client.query(`UPDATE orders SET delivery_status='completed', completed_at=$1, warranty_ends_at=$2, updated_at=now() WHERE id=$3`, [successAt, warrantyEndsAt, row.id]); } message = `交付完成：${command.result.trim()}`; break;
      case 'cancel':
        await client.query(`UPDATE orders SET delivery_status='cancelled', updated_at=now() WHERE id=$1`, [row.id]); message = `订单已取消：${command.reason.trim()}`; break;
      case 'add_note':
        if (!command.text.trim()) throw new AppError('INVALID_REQUEST', '备注不能为空。'); message = command.text.trim(); await client.query(`INSERT INTO order_events (order_id,type,message,visibility,created_by) VALUES ($1,'note',$2,$3,$4)`, [row.id, message, command.visibility, actor.userId]); break;
    }
    if (message && command.type !== 'add_note') await client.query(`INSERT INTO order_events (order_id,type,message,visibility,created_by) VALUES ($1,$2,$3,'customer',$4)`, [row.id, command.type, message, actor.userId]);
    const updatedResult = await client.query<any>(`UPDATE orders SET version=version+1, updated_at=now() WHERE id=$1 RETURNING ${fields}`, [row.id]);
    const result = mapPublicOrder(updatedResult.rows[0], await readTimeline(row.id, false, client));
    await client.query(`INSERT INTO order_commands (order_id,idempotency_key,body_digest,result) VALUES ($1,$2,$3,$4::jsonb)`, [row.id, key, bodyDigest, JSON.stringify(result)]);
    if (command.type === 'complete') await enqueueEvent(client, { dedupeKey: `order:${row.id}:completed`, channel: 'email', type: 'delivery_completed', payload: { email: row.contact_email, orderNumber: row.number } });
    return result;
  });
}
