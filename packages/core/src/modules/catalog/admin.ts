import 'server-only';
import { withTransaction } from '@chonghub/core/server/db';
import { AppError } from '@chonghub/core/server/errors';
import { hmacHex } from '@chonghub/core/server/crypto';

type CatalogStatus = 'draft' | 'published' | 'unlisted';
type AdminActor = { kind: 'admin'; userId: string };

function slug(value: unknown, name: string): string {
  if (typeof value !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) || value.length > 80) throw new AppError('INVALID_REQUEST', `${name} 只能使用小写字母、数字和短横线。`);
  return value;
}

function text(value: unknown, name: string, max = 5000): string {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > max) throw new AppError('INVALID_REQUEST', `${name} 无效。`);
  return value.trim();
}

function cents(value: unknown): number {
  if (!Number.isSafeInteger(value) || Number(value) < 0) throw new AppError('INVALID_REQUEST', '价格必须是非负整数分。');
  return Number(value);
}

export async function updateCatalogEntry(id: string, input: { name?: string; description?: string; priceCents?: number; skuId?: string }, actor: AdminActor, idempotencyKey: string): Promise<void> {
  if (!id) throw new AppError('INVALID_REQUEST', '商品标识无效。');
  if (input.priceCents !== undefined && (!Number.isSafeInteger(input.priceCents) || input.priceCents < 0)) throw new AppError('INVALID_REQUEST', '价格必须是非负整数分。');
  if (!idempotencyKey || idempotencyKey.length < 16 || idempotencyKey.length > 200) throw new AppError('INVALID_REQUEST', '操作标识无效。');
  const bodyDigest = hmacHex(JSON.stringify(input));
  await withTransaction(async (client) => {
    const replay = await client.query<{ body_digest: string }>('SELECT body_digest FROM catalog_commands WHERE idempotency_key=$1', [idempotencyKey]);
    if (replay.rows[0]) {
      if (replay.rows[0].body_digest !== bodyDigest) throw new AppError('IDEMPOTENCY_CONFLICT', '操作标识已用于其他商品修改。', 409);
      return;
    }
    const product = await client.query<{ id: string }>('SELECT id FROM products WHERE id=$1 FOR UPDATE', [id]);
    if (!product.rows[0]) throw new AppError('NOT_FOUND', '商品不存在。', 404);
    if (input.name !== undefined || input.description !== undefined) await client.query(`UPDATE products SET name=COALESCE($1,name), description=COALESCE($2,description), updated_at=now() WHERE id=$3`, [input.name ?? null, input.description ?? null, id]);
    if (input.priceCents !== undefined) {
      if (!input.skuId) throw new AppError('INVALID_REQUEST', '缺少规格标识。');
      const updated = await client.query(`UPDATE skus SET price_cents=$1, updated_at=now() WHERE id=$2 AND product_id=$3`, [input.priceCents, input.skuId, id]);
      if (!updated.rowCount) throw new AppError('NOT_FOUND', '规格不存在。', 404);
    }
    await client.query('INSERT INTO catalog_commands (product_id,action,idempotency_key,body_digest,result) VALUES ($1,$2,$3,$4,$5::jsonb)', [id, 'update', idempotencyKey, bodyDigest, JSON.stringify({ id })]);
    await client.query(`INSERT INTO audit_events (actor_user_id,action,details) VALUES ($1,'catalog_product_updated',$2::jsonb)`, [actor.userId, JSON.stringify({ productId: id, skuId: input.skuId ?? null, priceCents: input.priceCents ?? null })]);
  });
}

export async function createCatalogProduct(input: {
  name: unknown; slug: unknown; description: unknown; skuName: unknown; skuSlug: unknown;
  priceCents: unknown; categorySlug?: unknown; productType?: unknown; screening?: unknown; eligibilityText?: unknown; cycleText?: unknown; warrantyText?: unknown; status?: unknown;
}, actor: AdminActor, idempotencyKey: string): Promise<{ id: string }> {
  const productSlug = slug(input.slug, '商品 slug');
  const productName = text(input.name, '商品名称', 120);
  const description = text(input.description, '商品说明', 2000);
  const skuName = text(input.skuName, '套餐名称', 120);
  const skuSlug = slug(input.skuSlug, '套餐 slug');
  const priceCents = cents(input.priceCents);
  const categorySlug = typeof input.categorySlug === 'string' && input.categorySlug ? slug(input.categorySlug, '平台 slug') : 'chatgpt';
  const productType: 'recharge' | 'account' = input.productType === 'account' ? 'account' : 'recharge';
  const screening: 'gpt_session' | 'none' = productType === 'account' ? 'none' : input.screening === 'none' ? 'none' : 'gpt_session';
  const cycleText = typeof input.cycleText === 'string' && input.cycleText.trim() ? input.cycleText.trim().slice(0, 80) : '月卡';
  const warrantyText = typeof input.warrantyText === 'string' && input.warrantyText.trim() ? input.warrantyText.trim().slice(0, 500) : '以商品详情页说明为准。';
  const eligibility = typeof input.eligibilityText === 'string' && input.eligibilityText.trim() ? input.eligibilityText.trim().slice(0, 5000) : productType === 'account' ? '由客服确认账号商品规格、交付方式与受理条件。' : '仅支持当前无有效订阅的账号；实际能否充值以人工复核为准。';
  const status: Extract<CatalogStatus, 'draft' | 'published'> = input.status === 'published' ? 'published' : 'draft';
  if (typeof idempotencyKey !== 'string' || idempotencyKey.length < 16 || idempotencyKey.length > 200) throw new AppError('INVALID_REQUEST', '操作标识无效。');
  return withTransaction(async (client) => {
    const bodyDigest = hmacHex(JSON.stringify({ productSlug, productName, description, skuName, skuSlug, priceCents, categorySlug, productType, screening, eligibility, cycleText, warrantyText, status }));
    const replay = await client.query<{ product_id: string | null; body_digest: string }>('SELECT product_id,body_digest FROM catalog_commands WHERE idempotency_key=$1', [idempotencyKey]);
    if (replay.rows[0]) {
      if (replay.rows[0].body_digest !== bodyDigest) throw new AppError('IDEMPOTENCY_CONFLICT', '操作标识已用于其他商品创建。', 409);
      if (replay.rows[0].product_id) return { id: replay.rows[0].product_id };
    }
    const duplicate = await client.query('SELECT 1 FROM products WHERE slug=$1 UNION ALL SELECT 1 FROM skus WHERE slug=$2 LIMIT 1', [productSlug, skuSlug]);
    if (duplicate.rowCount) throw new AppError('CONFLICT', '商品或套餐 slug 已存在，请更换后重试。', 409);
    const platformNames: Record<string, string> = { chatgpt: 'ChatGPT', claude: 'Claude', google: 'Google' };
    const category = await client.query<{ id: string }>('INSERT INTO categories (slug,name) VALUES ($1,$2) ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name RETURNING id', [categorySlug, platformNames[categorySlug] ?? categorySlug]);
    const categoryId = category.rows[0]?.id;
    if (!categoryId) throw new AppError('INVALID_REQUEST', '商品分类不存在。');
    const maxOrder = await client.query<{ max: number | null }>('SELECT MAX(sort_order)::int AS max FROM products WHERE category_id=$1', [categoryId]);
    const product = await client.query<{ id: string }>(`INSERT INTO products (category_id,slug,name,description,eligibility_text,delivery_method,screening_method,product_type,status,sort_order)
      VALUES ($1,$2,$3,$4,$5,'manual',$6,$7,$8,$9) RETURNING id`, [categoryId, productSlug, productName, description, eligibility, screening, productType, status, (maxOrder.rows[0]?.max ?? -1) + 1]);
    const productId = product.rows[0]?.id;
    if (!productId) throw new AppError('INTERNAL_ERROR', '商品创建失败。', 500);
    await client.query(`INSERT INTO skus (product_id,slug,name,cycle_text,price_cents,status,warranty_text,sort_order,availability)
      VALUES ($1,$2,$3,$4,$5,$6,$7,0,'available')`, [productId, skuSlug, skuName, cycleText, priceCents, status, warrantyText]);
    await client.query('INSERT INTO catalog_commands (product_id,action,idempotency_key,body_digest,result) VALUES ($1,$2,$3,$4,$5::jsonb)', [productId, 'create', idempotencyKey, bodyDigest, JSON.stringify({ id: productId })]);
    await client.query(`INSERT INTO audit_events (actor_user_id,action,details) VALUES ($1,'catalog_product_created',$2::jsonb)`, [actor.userId, JSON.stringify({ productId, slug: productSlug })]);
    return { id: productId };
  });
}

export async function setSkuStatus(productId: string, skuId: string, status: CatalogStatus, actor: AdminActor, idempotencyKey: string): Promise<void> {
  if (!productId || !skuId || !['draft', 'published', 'unlisted'].includes(status) || idempotencyKey.length < 16) throw new AppError('INVALID_REQUEST', '套餐状态参数无效。');
  await withTransaction(async (client) => {
    const action = `sku_${status}`;
    const bodyDigest = hmacHex(JSON.stringify({ productId, skuId, status }));
    const replay = await client.query<{ body_digest: string }>('SELECT body_digest FROM catalog_commands WHERE idempotency_key=$1', [idempotencyKey]);
    if (replay.rows[0]) {
      if (replay.rows[0].body_digest !== bodyDigest) throw new AppError('IDEMPOTENCY_CONFLICT', '操作标识已用于其他套餐修改。', 409);
      return;
    }
    const sku = await client.query('SELECT id FROM skus WHERE id=$1 AND product_id=$2 FOR UPDATE', [skuId, productId]);
    if (!sku.rows[0]) throw new AppError('NOT_FOUND', '套餐不存在。', 404);
    await client.query('UPDATE skus SET status=$1,updated_at=now() WHERE id=$2', [status, skuId]);
    await client.query('INSERT INTO catalog_commands (product_id,action,idempotency_key,body_digest,result) VALUES ($1,$2,$3,$4,$5::jsonb)', [productId, action, idempotencyKey, bodyDigest, JSON.stringify({ skuId, status })]);
    await client.query('INSERT INTO audit_events (actor_user_id,action,details) VALUES ($1,$2,$3::jsonb)', [actor.userId, `catalog_sku_${status}`, JSON.stringify({ productId, skuId })]);
  });
}

export async function publishProduct(id: string): Promise<void> {
  await withTransaction(async (client) => {
    const result = await client.query<{ screening_method: string; delivery_method: string }>('SELECT screening_method,delivery_method FROM products WHERE id=$1 FOR UPDATE', [id]);
    const row=result.rows[0]; if(!row) throw new AppError('NOT_FOUND','商品不存在。',404); if(row.delivery_method!=='manual') throw new AppError('INVALID_REQUEST','首版只允许人工交付商品上架。');
    const sku=await client.query<{id:string}>('SELECT id FROM skus WHERE product_id=$1 AND status=\'published\' LIMIT 1',[id]); if(!sku.rows[0]) throw new AppError('INVALID_REQUEST','至少需要一个已上架规格。');
    await client.query(`UPDATE products SET status='published',updated_at=now() WHERE id=$1`,[id]);
  });
}

export async function setProductStatus(id: string, status: Extract<CatalogStatus, 'published' | 'unlisted'>, actor: AdminActor, idempotencyKey: string): Promise<void> {
  if (!id || !idempotencyKey || idempotencyKey.length < 16) throw new AppError('INVALID_REQUEST', '商品操作参数无效。');
  await withTransaction(async (client) => {
    const action = status === 'published' ? 'publish' : 'archive';
    const bodyDigest = hmacHex(JSON.stringify({ id, status }));
    const replay = await client.query<{ body_digest: string }>('SELECT body_digest FROM catalog_commands WHERE idempotency_key=$1', [idempotencyKey]);
    if (replay.rows[0]) {
      if (replay.rows[0].body_digest !== bodyDigest) throw new AppError('IDEMPOTENCY_CONFLICT', '操作标识已用于其他商品状态修改。', 409);
      return;
    }
    const product = await client.query<{ delivery_method: string; status: CatalogStatus }>('SELECT delivery_method,status FROM products WHERE id=$1 FOR UPDATE', [id]);
    const row = product.rows[0];
    if (!row) throw new AppError('NOT_FOUND', '商品不存在。', 404);
    if (status === 'published') {
      if (row.delivery_method !== 'manual') throw new AppError('INVALID_REQUEST', '首版只允许人工交付商品上架。');
      const sku = await client.query('SELECT id FROM skus WHERE product_id=$1 AND status=\'published\' LIMIT 1', [id]);
      if (!sku.rows[0]) throw new AppError('INVALID_REQUEST', '至少需要一个已上架规格。请先在商品设置中完成套餐上架。');
    }
    await client.query('UPDATE products SET status=$1,updated_at=now() WHERE id=$2', [status, id]);
    await client.query('INSERT INTO catalog_commands (product_id,action,idempotency_key,body_digest,result) VALUES ($1,$2,$3,$4,$5::jsonb)', [id, action, idempotencyKey, bodyDigest, JSON.stringify({ id, status })]);
    await client.query(`INSERT INTO audit_events (actor_user_id,action,details) VALUES ($1,$2,$3::jsonb)`, [actor.userId, status === 'published' ? 'catalog_product_published' : 'catalog_product_archived', JSON.stringify({ productId: id })]);
  });
}
