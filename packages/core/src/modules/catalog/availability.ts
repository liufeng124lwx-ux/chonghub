import 'server-only';
import { withTransaction } from '@chonghub/core/server/db';
import { AppError } from '@chonghub/core/server/errors';
import type { SkuAvailability } from './contracts';

export async function setSkuAvailability(productId: string, skuId: string, availability: SkuAvailability, actor: { kind: 'admin'; userId: string }, key: string, expectedVersion: number): Promise<void> {
  if (!productId || !skuId || (availability !== 'available' && availability !== 'sold_out') || !key || key.length < 16 || key.length > 200 || !Number.isInteger(expectedVersion) || expectedVersion < 0) throw new AppError('INVALID_REQUEST', '售卖状态参数无效。');
  await withTransaction(async (client) => {
    const row = await client.query<{ version: number }>('SELECT version FROM skus WHERE id=$1 AND product_id=$2 FOR UPDATE', [skuId, productId]);
    if (!row.rows[0]) throw new AppError('NOT_FOUND', '规格不存在。', 404);
    const replay = await client.query('SELECT 1 FROM catalog_availability_commands WHERE sku_id=$1 AND idempotency_key=$2', [skuId, key]);
    if (replay.rowCount) return;
    if (row.rows[0].version !== expectedVersion) throw new AppError('CONFLICT', '规格已被其他操作修改，请刷新后重试。', 409);
    await client.query('INSERT INTO catalog_availability_commands (sku_id, idempotency_key, availability) VALUES ($1,$2,$3)', [skuId, key, availability]);
    await client.query('UPDATE skus SET availability=$1, version=version+1, updated_at=now() WHERE id=$2', [availability, skuId]);
    await client.query(`INSERT INTO audit_events (actor_user_id, action, details) VALUES ($1, 'catalog_availability_changed', $2::jsonb)`, [actor.userId, JSON.stringify({ skuId, availability, idempotencyKey: key, expectedVersion })]);
  });
}
