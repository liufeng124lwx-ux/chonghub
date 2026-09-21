import 'server-only';
import { withTransaction } from '@/server/db';
import { AppError } from '@/server/errors';

export async function updateCatalogEntry(id: string, input: { name?: string; description?: string; priceCents?: number; skuId?: string }): Promise<void> {
  if (!id) throw new AppError('INVALID_REQUEST', '商品标识无效。');
  if (input.priceCents !== undefined && (!Number.isSafeInteger(input.priceCents) || input.priceCents < 0)) throw new AppError('INVALID_REQUEST', '价格必须是非负整数分。');
  await withTransaction(async (client) => {
    const product = await client.query<{ id: string }>('SELECT id FROM products WHERE id=$1 FOR UPDATE', [id]);
    if (!product.rows[0]) throw new AppError('NOT_FOUND', '商品不存在。', 404);
    if (input.name !== undefined || input.description !== undefined) await client.query(`UPDATE products SET name=COALESCE($1,name), description=COALESCE($2,description), updated_at=now() WHERE id=$3`, [input.name ?? null, input.description ?? null, id]);
    if (input.priceCents !== undefined) {
      if (!input.skuId) throw new AppError('INVALID_REQUEST', '缺少规格标识。');
      const updated = await client.query(`UPDATE skus SET price_cents=$1, updated_at=now() WHERE id=$2 AND product_id=$3`, [input.priceCents, input.skuId, id]);
      if (!updated.rowCount) throw new AppError('NOT_FOUND', '规格不存在。', 404);
    }
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
