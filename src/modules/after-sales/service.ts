import 'server-only';

import { hmacHex } from '@/server/crypto';
import { withTransaction, query } from '@/server/db';
import { AppError } from '@/server/errors';
import { refundTargetCents } from '@/modules/fulfillment/refund';
import { enqueueEvent } from '@/modules/notifications/outbox';
import type { Actor } from '@/modules/orders/contracts';
import type { AfterSaleStatus, AfterSaleType, AfterSaleView } from './contracts';
import { listAttachments } from './attachments';

interface RefundRow {
  id: string;
  order_id: string;
  after_sale_id: string;
  version: number;
  number: string;
  contact_email: string;
  status: AfterSaleStatus;
  payment_status: string;
  refund_cents: number;
  snapshot: { policy?: { warrantyDays?: number } };
  quoted_price_cents: number | null;
  paid_cents: number;
  completed_at: Date | string | null;
  warranty_ends_at: Date | string | null;
  idempotency_key_digest: string | null;
  body_digest: string | null;
}

function assertInput(input: { type: AfterSaleType; description: string }): void {
  if (!['subscription_lost', 'delivery_issue', 'other'].includes(input.type)
    || input.description.trim().length < 2
    || input.description.length > 2000) {
    throw new AppError('INVALID_REQUEST', '售后信息无效。');
  }
}

function assertActorCanRead(actor: Actor, orderId: string, ownerUserId: string | null): void {
  if (actor.kind === 'admin') return;
  if (actor.kind === 'user' && actor.userId === ownerUserId) return;
  if (actor.kind === 'guest' && actor.orderId === orderId) return;
  throw new AppError('NOT_FOUND', '售后不存在。', 404);
}

function parseDate(value: string, field: string): Date {
  const parsed = new Date(value);
  if (!value || !Number.isFinite(parsed.getTime())) throw new AppError('INVALID_REQUEST', `${field} 无效。`);
  return parsed;
}

function bodyDigest(input: unknown): string {
  return hmacHex(JSON.stringify(input));
}

export async function openAfterSale(
  number: string,
  actor: Actor,
  input: { type: AfterSaleType; description: string },
  key: string,
): Promise<{ id: string }> {
  assertInput(input);
  if (typeof key !== 'string' || key.length < 16 || key.length > 200) {
    throw new AppError('INVALID_REQUEST', '操作标识无效。');
  }
  const keyDigest = hmacHex(`after-sale:${key}`);
  const digest = bodyDigest({ type: input.type, description: input.description.trim() });

  return withTransaction(async (client) => {
    const order = await client.query<{ id: string; number: string; owner_user_id: string | null; contact_email: string }>(
      'SELECT id, number, owner_user_id, contact_email FROM orders WHERE number=$1 FOR UPDATE',
      [number],
    );
    const row = order.rows[0];
    if (!row) throw new AppError('NOT_FOUND', '订单不存在。', 404);
    assertActorCanRead(actor, row.id, row.owner_user_id);

    const prior = await client.query<{ id: string; body_digest: string | null }>(
      'SELECT id, body_digest FROM after_sales WHERE order_id=$1 AND idempotency_key_digest=$2 LIMIT 1',
      [row.id, keyDigest],
    );
    if (prior.rows[0]) {
      if (prior.rows[0].body_digest !== digest) throw new AppError('IDEMPOTENCY_CONFLICT', '操作标识已用于其他售后申请。', 409);
      return { id: prior.rows[0].id };
    }

    const existing = await client.query<{ id: string }>(
      `SELECT id FROM after_sales
        WHERE order_id=$1 AND status IN ('open','reviewing')
        ORDER BY created_at DESC LIMIT 1`,
      [row.id],
    );
    if (existing.rows[0]) return { id: existing.rows[0].id };

    const created = await client.query<{ id: string }>(
      `INSERT INTO after_sales (order_id,type,description,idempotency_key_digest,body_digest)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [row.id, input.type, input.description.trim(), keyDigest, digest],
    );
    const id = created.rows[0].id;
    await client.query(
      `INSERT INTO order_events (order_id,type,message,visibility)
       VALUES ($1,'after_sale','已提交售后申请，等待人工处理。','customer')`,
      [row.id],
    );
    await enqueueEvent(client, {
      dedupeKey: `after-sale:${id}:opened`,
      channel: 'email',
      type: 'after_sale_opened',
      payload: { email: row.contact_email, orderNumber: row.number },
    });
    await enqueueEvent(client, {
      dedupeKey: `after-sale:${id}:opened:feishu`,
      channel: 'feishu',
      type: 'after_sale_opened',
      payload: { orderNumber: row.number },
    });
    return { id };
  });
}

export async function recordRefund(
  caseId: string,
  admin: Actor,
  input: { amountCents: number; refundedAt: string; reference: string; verifiedLossAt?: string },
  key: string,
  version: number,
): Promise<void> {
  if (admin.kind !== 'admin') throw new AppError('FORBIDDEN', '只有管理员可以登记退款。', 403);
  if (!Number.isSafeInteger(input.amountCents) || input.amountCents <= 0
    || input.reference.trim().length === 0 || input.reference.length > 200
    || typeof key !== 'string' || key.length < 16 || key.length > 200
    || !Number.isSafeInteger(version) || version < 0) {
    throw new AppError('INVALID_REQUEST', '退款信息无效。');
  }
  const refundedAt = parseDate(input.refundedAt, '退款时间');
  const verifiedLossAt = input.verifiedLossAt === undefined ? null : parseDate(input.verifiedLossAt, '掉订阅时间');
  if (refundedAt.getTime() > Date.now()) throw new AppError('INVALID_REQUEST', '退款时间不能晚于当前时间。');
  if (verifiedLossAt && verifiedLossAt.getTime() > Date.now()) throw new AppError('INVALID_REQUEST', '掉订阅时间不能晚于当前时间。');

  const keyDigest = hmacHex(`refund:${caseId}:${key}`);
  const digest = bodyDigest({
    amountCents: input.amountCents,
    refundedAt: refundedAt.toISOString(),
    reference: input.reference.trim(),
    verifiedLossAt: verifiedLossAt?.toISOString() ?? null,
  });

  await withTransaction(async (client) => {
    const result = await client.query<RefundRow>(
      `SELECT a.id,a.order_id,a.version,a.status,o.number,o.contact_email,
              o.payment_status,o.refund_cents,o.snapshot,o.quoted_price_cents,
              o.completed_at,o.warranty_ends_at,
              COALESCE((SELECT SUM(r.amount_cents)::int FROM receipts r WHERE r.order_id=o.id), o.quoted_price_cents, 0)::int AS paid_cents,
              NULL::text AS idempotency_key_digest, NULL::text AS body_digest
         FROM after_sales a
         JOIN orders o ON o.id=a.order_id
        WHERE a.id=$1
        FOR UPDATE`,
      [caseId],
    );
    const row = result.rows[0];
    if (!row) throw new AppError('NOT_FOUND', '售后不存在。', 404);

    const prior = await client.query<{ body_digest: string | null }>(
      'SELECT body_digest FROM refunds WHERE after_sale_id=$1 AND idempotency_key_digest=$2 LIMIT 1',
      [caseId, keyDigest],
    );
    if (prior.rows[0]) {
      if (prior.rows[0].body_digest !== digest) throw new AppError('IDEMPOTENCY_CONFLICT', '操作标识已用于其他退款。', 409);
      return;
    }
    if (row.version !== version) throw new AppError('VERSION_CONFLICT', '售后已更新，请刷新。', 409);
    if (row.status === 'closed') throw new AppError('INVALID_STATE', '售后已关闭，不能再登记退款。', 409);

    const paid = row.paid_cents;
    const remaining = Math.max(0, paid - row.refund_cents);
    if (paid <= 0 || row.payment_status === 'unpaid' || input.amountCents > remaining) {
      throw new AppError('INVALID_REQUEST', '退款累计不能超过已确认收款金额。');
    }
    if (verifiedLossAt && row.completed_at && row.warranty_ends_at
      && (verifiedLossAt < new Date(row.completed_at) || verifiedLossAt > new Date(row.warranty_ends_at))) {
      throw new AppError('INVALID_REQUEST', '掉订阅时间必须在保障期间内。');
    }

    await client.query(
      `INSERT INTO refunds
        (after_sale_id,order_id,amount_cents,refunded_at,reference,verified_loss_at,idempotency_key_digest,body_digest)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [caseId, row.order_id, input.amountCents, refundedAt, input.reference.trim(), verifiedLossAt, keyDigest, digest],
    );
    const newRefund = row.refund_cents + input.amountCents;
    await client.query(
      `UPDATE orders SET refund_cents=$1,
          payment_status=CASE WHEN $1 >= $2 THEN 'refunded' ELSE 'partial_refund' END,
          version=version+1,updated_at=now() WHERE id=$3`,
      [newRefund, paid, row.order_id],
    );
    await client.query(
      `UPDATE after_sales SET version=version+1,status='resolved',updated_at=now() WHERE id=$1`,
      [caseId],
    );
    await client.query(
      `INSERT INTO order_events (order_id,type,message,visibility,created_by)
       VALUES ($1,'after_sale','已登记人工退款，客服将继续通过微信同步处理结果。','customer',$2)`,
      [row.order_id, admin.userId],
    );
    await enqueueEvent(client, {
      dedupeKey: `after-sale:${caseId}:refund:${keyDigest}`,
      channel: 'email',
      type: 'after_sale_resolved',
      payload: { email: row.contact_email, orderNumber: row.number },
    });
  });
}

export async function getRefundSuggestion(number: string, actor: Actor, caseId?: string): Promise<number> {
  const result = await query<{
    id: string;
    owner_user_id: string | null;
    quoted_price_cents: number | null;
    paid_cents: number;
    completed_at: Date | string | null;
    warranty_ends_at: Date | string | null;
    refund_cents: number;
  }>(
    `SELECT o.id,o.owner_user_id,o.quoted_price_cents,o.completed_at,o.warranty_ends_at,o.refund_cents,
            COALESCE((SELECT SUM(r.amount_cents)::int FROM receipts r WHERE r.order_id=o.id), o.quoted_price_cents, 0)::int AS paid_cents
       FROM orders o WHERE o.number=$1`,
    [number],
  );
  const row = result.rows[0];
  if (!row) throw new AppError('NOT_FOUND', '订单不存在。', 404);
  assertActorCanRead(actor, row.id, row.owner_user_id);
  if (typeof row.paid_cents !== 'number' || row.paid_cents <= 0 || !row.completed_at || !row.warranty_ends_at) return 0;

  let lossAt: Date | null = null;
  let caseRefundCents = 0;
  if (caseId) {
    const caseResult = await query<{ id: string; order_id: string; verified_loss_at: Date | string | null; case_refund_cents: number }>(
      `SELECT a.id,a.order_id,MAX(r.verified_loss_at) AS verified_loss_at,
              COALESCE(SUM(r.amount_cents), 0)::int AS case_refund_cents
         FROM after_sales a LEFT JOIN refunds r ON r.after_sale_id=a.id
        WHERE a.id=$1 GROUP BY a.id,a.order_id`,
      [caseId],
    );
    const caseRow = caseResult.rows[0];
    if (!caseRow || caseRow.order_id !== row.id) throw new AppError('NOT_FOUND', '售后不存在。', 404);
    lossAt = caseRow.verified_loss_at ? new Date(caseRow.verified_loss_at) : null;
    caseRefundCents = caseRow.case_refund_cents;
  } else {
    const lossResult = await query<{ verified_loss_at: Date | string | null }>(
      `SELECT MAX(r.verified_loss_at) AS verified_loss_at
         FROM refunds r WHERE r.order_id=$1`,
      [row.id],
    );
    lossAt = lossResult.rows[0]?.verified_loss_at ? new Date(lossResult.rows[0].verified_loss_at) : null;
  }

  // Before an operator verifies a loss time, show the current upper-bound
  // estimate. A verified time is authoritative and does not move with UI lag.
  const end = new Date(row.warranty_ends_at).getTime();
  const start = new Date(row.completed_at).getTime();
  const reference = lossAt?.getTime() ?? Date.now();
  const suggested = refundTargetCents(row.paid_cents, end - reference, end - start);
  const caseRemaining = Math.max(0, suggested - caseRefundCents);
  return Math.max(0, Math.min(caseRemaining, row.paid_cents - row.refund_cents));
}

export interface AfterSaleDetail extends AfterSaleView {
  attachments: Array<{ id: string; mime: string; bytes: number; createdAt: string }>;
}

export async function listAfterSales(number: string, actor: Actor): Promise<AfterSaleDetail[]> {
  const order = await query<{ id: string; number: string; owner_user_id: string | null }>(
    'SELECT id,number,owner_user_id FROM orders WHERE number=$1',
    [number],
  );
  const orderRow = order.rows[0];
  if (!orderRow) throw new AppError('NOT_FOUND', '订单不存在。', 404);
  assertActorCanRead(actor, orderRow.id, orderRow.owner_user_id);
  const cases = await query<{
    id: string;
    order_number: string;
    type: AfterSaleType;
    description: string;
    status: AfterSaleStatus;
    version: number;
    created_at: Date | string;
    refund_cents: number;
  }>(
    `SELECT a.id,o.number AS order_number,a.type,a.description,a.status,a.version,a.created_at,COALESCE(o.refund_cents,0)::int AS refund_cents
       FROM after_sales a JOIN orders o ON o.id=a.order_id
      WHERE o.id=$1 ORDER BY a.created_at DESC`,
    [orderRow.id],
  );
  return Promise.all(cases.rows.map(async (item) => ({
    id: item.id,
    orderNumber: item.order_number,
    type: item.type,
    description: item.description,
    status: item.status,
    version: item.version,
    createdAt: new Date(item.created_at).toISOString(),
    refundCents: item.refund_cents,
    attachments: await listAttachments(item.id, actor),
  })));
}
