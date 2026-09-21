'use client';
import { useState } from 'react';
import type { ProductView } from '@chonghub/core/modules/catalog/contracts';

export function AdminProductEditor({ product }: { product: ProductView }) {
  const [prices, setPrices] = useState<Record<string, string>>(Object.fromEntries(product.skus.map((sku) => [sku.id, String(sku.priceCents / 100)])));
  const [message, setMessage] = useState('');
  async function save(skuId: string) { const response = await fetch(`/api/admin/products/${product.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ skuId, priceCents: Math.round(Number(prices[skuId]) * 100) }) }); const json = await response.json(); setMessage(response.ok ? '价格已保存' : (json.error?.message ?? '保存失败')); }
  return <div className="admin-product-editor">{product.skus.map((sku) => <div className="admin-edit-row" key={sku.id}><span>{product.name} · {sku.name}</span><label>¥<input inputMode="decimal" value={prices[sku.id]} onChange={(event) => setPrices((current) => ({ ...current, [sku.id]: event.target.value }))} /></label><button className="button button-secondary" type="button" onClick={() => save(sku.id)}>保存</button></div>)}{message && <small>{message}</small>}</div>;
}
