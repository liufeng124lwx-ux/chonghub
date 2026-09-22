import 'server-only';
import { randomBytes } from 'node:crypto';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { withTransaction } from '@chonghub/core/server/db';
import { AppError } from '@chonghub/core/server/errors';
import { hmacHex, randomToken, sha256Hex } from '@chonghub/core/server/crypto';
import { assertValidServicePolicy } from '@chonghub/core/modules/fulfillment/guards';
import { normalizeEmail } from '@chonghub/core/modules/auth/contracts';
import { enqueueEvent } from '@chonghub/core/modules/notifications/outbox';
import type { Actor, CreateRequestInput, OrderSnapshot, PublicOrder, ServicePolicy } from './contracts';
import { mapPublicOrder } from './public-view';
import { readTimeline } from './repository';

const defaultPolicy: ServicePolicy = { version: 1, zone: 'Asia/Shanghai', opensAt: '09:30', closesAt: '23:00', deliveryMinutes: 120, warrantyDays: 30, termsVersion: 'draft-v1' };

function makeOrderNumber() { return `CH${Date.now().toString(36).toUpperCase()}${randomBytes(4).toString('hex').toUpperCase()}`; }
function platformLabel(slug: string, name: string) { return ({ chatgpt: 'ChatGPT', claude: 'Claude', google: 'Google' } as Record<string, string>)[slug] ?? name; }
function validateInput(input: CreateRequestInput) {
  if (!input || typeof input.skuId !== 'string' || !input.skuId) throw new AppError('INVALID_REQUEST', '请选择有效套餐。');
  const email = normalizeEmail(input.contactEmail);
  if (input.note.length > 2000) throw new AppError('INVALID_REQUEST', '备注不能超过 2000 个字符。');
  if (!['free', 'subscribed', 'unknown'].includes(input.declaredSubscription)) throw new AppError('INVALID_REQUEST', '订阅状态无效。');
  return { ...input, contactEmail: email, note: input.note.trim() };
}

export async function createRequest(input: CreateRequestInput, actor: Actor | null, key: string, draftScope: string): Promise<{ order: PublicOrder; guestToken?: string }> {
  const normalized = validateInput(input);
  if (typeof key !== 'string' || key.length < 16 || key.length > 128) throw new AppError('INVALID_REQUEST', '提交标识无效。');
  const scope = actor?.kind === 'user' ? `user:${actor.userId}` : `guest:${draftScope}`;
  if (actor?.kind === 'admin') throw new AppError('FORBIDDEN', '管理员不能通过公开下单入口创建订单。', 403);
  if (actor?.kind !== 'user' && (!draftScope || draftScope.length < 16)) throw new AppError('INVALID_REQUEST', '访客草稿凭据无效。');
  const bodyDigest = hmacHex(JSON.stringify(normalized));
  return withTransaction(async (client) => {
    // Serialize same-scope retries before testing the unique create key.
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`${scope}:${key}`]);
    async function issueGuestToken(orderId: string, grantVersion = 1) {
      if (actor?.kind === 'user') return undefined;
      const token = randomToken(32);
      await client.query(`INSERT INTO guest_grants (order_id,token_digest,grant_version,expires_at) VALUES ($1,$2,$3,$4)`, [orderId, sha256Hex(token), grantVersion, new Date(Date.now() + 24 * 60 * 60 * 1000)]);
      return token;
    }
    const existing = await client.query<{ body_digest: string; order_id: string }>('SELECT body_digest, order_id FROM create_keys WHERE actor_scope=$1 AND key=$2 FOR SHARE', [scope, key]);
    if (existing.rows[0]) {
      if (existing.rows[0].body_digest !== bodyDigest) throw new AppError('IDEMPOTENCY_CONFLICT', '重复提交标识已用于其他内容。', 409);
      const found = await client.query<any>(`SELECT id, number, owner_user_id, snapshot, quoted_price_cents, payment_status, delivery_status, screening_status, due_at, completed_at, warranty_ends_at, refund_cents, version FROM orders WHERE id=$1 FOR UPDATE`, [existing.rows[0].order_id]);
      if (!found.rows[0]) throw new AppError('NOT_FOUND', '订单不存在。', 404);
      if (actor?.kind !== 'user' && found.rows[0].owner_user_id) throw new AppError('AUTH_REQUIRED', '订单已关联账号，请登录后查看。', 401);
      return { order: mapPublicOrder(found.rows[0], await readTimeline(found.rows[0].id, false, client)), guestToken: await issueGuestToken(found.rows[0].id) };
    }
    const sku = await client.query<{ id: string; product_name: string; product_eligibility: string; product_screening: 'gpt_session' | 'none'; product_type: 'recharge' | 'account'; platform_slug: string; platform_name: string; sku_name: string; cycle_text: string; price_cents: number; warranty_text: string; availability: 'available' | 'sold_out' }>(
      `SELECT s.id, p.name product_name, p.eligibility_text product_eligibility, p.screening_method product_screening, p.product_type, c.slug platform_slug, c.name platform_name,
              s.name sku_name, s.cycle_text, s.price_cents, s.warranty_text, s.availability
       FROM skus s JOIN products p ON p.id=s.product_id JOIN categories c ON c.id=p.category_id
       WHERE s.id=$1 AND s.status='published' AND p.status='published' FOR UPDATE`, [normalized.skuId],
    );
    const product = sku.rows[0];
    if (!product || product.availability !== 'available') throw new AppError('SKU_UNAVAILABLE', '该套餐暂不可提交，请刷新后重试。', 409);
    const policySetting = await client.query<{ value: ServicePolicy }>(`SELECT value FROM site_settings WHERE key='service_policy' LIMIT 1`);
    const policy = policySetting.rows[0]?.value ?? defaultPolicy;
    assertValidServicePolicy(policy);
    const snapshot: OrderSnapshot = { productName: product.product_name, productType: product.product_type, platform: { slug: product.platform_slug, name: platformLabel(product.platform_slug, product.platform_name) }, skuName: product.sku_name, displayPriceCents: product.price_cents, eligibilityText: product.product_eligibility, warrantyText: product.warranty_text, screening: product.product_screening, policy };
    const number = makeOrderNumber();
    const created = await client.query<any>(
      `INSERT INTO orders (number, sku_id, owner_user_id, contact_email, guest_password_digest, snapshot)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb)
       RETURNING id, number, snapshot, quoted_price_cents, payment_status, delivery_status, screening_status, due_at, completed_at, warranty_ends_at, refund_cents, version`,
      [number, product.id, actor?.kind === 'user' ? actor.userId : null, normalized.contactEmail, null, JSON.stringify(snapshot)],
    );
    const row = created.rows[0];
    await client.query(`INSERT INTO create_keys (actor_scope, key, body_digest, order_id) VALUES ($1,$2,$3,$4)`, [scope, key, bodyDigest, row.id]);
    await client.query(`INSERT INTO order_events (order_id,type,message,visibility) VALUES ($1,'request_created',$2,'customer')`, [row.id, product.product_screening === 'gpt_session' ? '需求已提交，等待账号状态初筛。' : '需求已提交，等待客服确认并人工交付。']);
    const guestToken = await issueGuestToken(row.id);
    await enqueueEvent(client, { dedupeKey: `order:${row.id}:created`, channel: 'email', type: 'request_created', payload: { email: normalized.contactEmail, orderNumber: number } });
    return { order: mapPublicOrder(row, [{ at: new Date().toISOString(), message: product.product_screening === 'gpt_session' ? '需求已提交，等待账号状态初筛。' : '需求已提交，等待客服确认并人工交付。' }]), guestToken };
  });
}
