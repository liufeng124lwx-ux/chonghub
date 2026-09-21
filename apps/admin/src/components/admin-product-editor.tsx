'use client';
import { useState } from 'react';
import type { ProductView } from '@chonghub/core/modules/catalog/contracts';

export function AdminProductEditor({ product }: { product: ProductView }) {
  const [prices, setPrices] = useState<Record<string, string>>(Object.fromEntries(product.skus.map((sku) => [sku.id, String(sku.priceCents / 100)])));
  const [skus, setSkus] = useState(product.skus);
  const [message, setMessage] = useState('');
  async function save(skuId: string) { const response = await fetch(`/api/admin/products/${product.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ skuId, priceCents: Math.round(Number(prices[skuId]) * 100) }) }); const json = await response.json(); setMessage(response.ok ? '价格已保存' : (json.error?.message ?? '保存失败')); }
  async function toggleAvailability(sku: typeof skus[number]) {
    const availability = sku.availability === 'available' ? 'sold_out' : 'available';
    const response = await fetch(`/api/admin/products/${product.id}/skus/${sku.id}/availability`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ productId: product.id, skuId: sku.id, availability, expectedVersion: sku.version, idempotencyKey: crypto.randomUUID() }) });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) { setMessage(response.status === 409 ? '规格已被其他操作修改，请刷新后重试。' : (json.error?.message ?? '售卖状态保存失败')); return; }
    setSkus((current) => current.map((item) => item.id === sku.id ? { ...item, availability, version: item.version + 1, isPurchasable: availability === 'available' } : item));
    setMessage(availability === 'sold_out' ? '已标记售罄' : '已恢复售卖');
  }
  return <div className="admin-product-editor">{skus.map((sku) => <div className="admin-edit-row" key={sku.id}><span>{product.name} · {sku.name}</span><label>¥<input inputMode="decimal" value={prices[sku.id]} onChange={(event) => setPrices((current) => ({ ...current, [sku.id]: event.target.value }))} /></label><span aria-label="售卖状态">{sku.availability === 'sold_out' ? '已售罄' : '可售'}</span><button className="button button-secondary" type="button" onClick={() => save(sku.id)}>保存价格</button><button className="button button-secondary" type="button" onClick={() => void toggleAvailability(sku)}>{sku.availability === 'sold_out' ? '恢复售卖' : '标记售罄'}</button></div>)}{message && <small role="status">{message}</small>}</div>;
}
