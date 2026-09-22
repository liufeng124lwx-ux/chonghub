'use client';

import { useState } from 'react';
import type { AdminProductView } from '@chonghub/core/modules/catalog/repository';

const statusLabels = { draft: '草稿', published: '已上架', unlisted: '已归档' } as const;
function key() { return crypto.randomUUID(); }
type AdminSku = AdminProductView['skus'][number];

export function AdminProductEditor({ product }: { product: AdminProductView }) {
  const [skus, setSkus] = useState<AdminSku[]>(product.skus);
  const [prices, setPrices] = useState<Record<string, string>>(Object.fromEntries(product.skus.map((sku) => [sku.id, String(sku.priceCents / 100)])));
  const [status, setStatus] = useState(product.status);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  async function savePrice(skuId: string) {
    const rawPrice = prices[skuId].trim();
    const price = Number(rawPrice);
    if (!/^\d+(?:\.\d{1,2})?$/.test(rawPrice) || !Number.isFinite(price) || price < 0) { setMessage('价格最多保留两位小数。'); return; }
    setBusy(`price:${skuId}`); setMessage('');
    const response = await fetch(`/api/admin/products/${product.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ skuId, priceCents: Math.round(price * 100), idempotencyKey: key() }) });
    const json = await response.json().catch(() => ({}));
    setBusy(null); setMessage(response.ok ? '价格已保存，历史订单不受影响。' : (json.error?.message ?? '价格保存失败。'));
  }

  async function toggleAvailability(sku: typeof skus[number]) {
    const availability = sku.availability === 'available' ? 'sold_out' : 'available';
    setBusy(`availability:${sku.id}`); setMessage('');
    const response = await fetch(`/api/admin/products/${product.id}/skus/${sku.id}/availability`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ productId: product.id, skuId: sku.id, availability, expectedVersion: sku.version, idempotencyKey: key() }) });
    const json = await response.json().catch(() => ({}));
    setBusy(null);
    if (!response.ok) { setMessage(response.status === 409 ? '规格已被其他操作修改，请刷新后重试。' : (json.error?.message ?? '售卖状态保存失败。')); return; }
    setSkus((current) => current.map((item) => item.id === sku.id ? { ...item, availability, version: item.version + 1, isPurchasable: availability === 'available' && item.status === 'published' && status === 'published' } : item));
    setMessage(availability === 'sold_out' ? `${sku.name} 已标记为售罄，仍会在公开页展示。` : `${sku.name} 已恢复售卖。`);
  }

  async function setSkuLifecycle(sku: typeof skus[number]) {
    const next = sku.status === 'published' ? 'unlisted' : 'published';
    setBusy(`status:${sku.id}`); setMessage('');
    const response = await fetch(`/api/admin/products/${product.id}/skus/${sku.id}/status`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: next, idempotencyKey: key() }) });
    const json = await response.json().catch(() => ({}));
    setBusy(null);
    if (!response.ok) { setMessage(json.error?.message ?? '套餐状态保存失败。'); return; }
    setSkus((current) => current.map((item) => item.id === sku.id ? { ...item, status: next, isPurchasable: next === 'published' && item.availability === 'available' && status === 'published' } : item));
    setMessage(next === 'published' ? `${sku.name} 已上架。` : `${sku.name} 已下架，历史订单不受影响。`);
  }

  async function setProductLifecycle(next: 'published' | 'unlisted') {
    setBusy(`product:${next}`); setMessage('');
    const response = await fetch(`/api/admin/products/${product.id}/${next === 'published' ? 'publish' : 'archive'}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ idempotencyKey: key() }) });
    const json = await response.json().catch(() => ({}));
    setBusy(null);
    if (!response.ok) { setMessage(json.error?.message ?? '商品状态保存失败。'); return; }
    setStatus(next);
    if (next === 'unlisted') setSkus((current) => current.map((sku) => ({ ...sku, isPurchasable: false })));
    setMessage(next === 'published' ? '商品已上架，公开站点会读取最新状态。' : '商品已归档，公开站点不再接收新订单，历史订单保留。');
  }

  return <article className="admin-product-editor">
    <header className="admin-product-heading"><div><div className="admin-product-title-row"><h2>{product.name}</h2><span className="admin-product-platform">{product.platform.name} · {product.productType === 'account' ? '账号商品' : '会员充值'}</span><span className={`admin-status-badge is-${status}`}>{statusLabels[status]}</span></div><p>{product.description || '暂无商品说明'}</p><small>slug /{product.slug} · 最近更新 {new Date(product.updatedAt).toLocaleDateString('zh-CN')}</small></div><div className="admin-product-actions">{status !== 'published' && <button className="button button-primary" type="button" disabled={busy !== null} onClick={() => void setProductLifecycle('published')}>发布商品</button>}{status === 'published' && <button className="button button-danger" type="button" disabled={busy !== null} onClick={() => void setProductLifecycle('unlisted')}>归档商品</button>}</div></header>
    <div className="admin-sku-list"><div className="admin-section-label">套餐与售卖状态 <span>{skus.length} 个套餐</span></div>{skus.length === 0 ? <p className="admin-empty-inline">还没有套餐，请重新创建商品并填写至少一个套餐。</p> : skus.map((sku) => <div className="admin-sku-row" key={sku.id}><div className="admin-sku-info"><strong>{sku.name}</strong><span>{sku.cycleText || '未填写周期'} · {sku.status === 'published' ? '公开展示' : sku.status === 'unlisted' ? '已下架' : '草稿'}</span></div><label className="admin-price-field"><span>价格</span><span className="admin-price-input"><b>¥</b><input aria-label={`${sku.name} 价格`} inputMode="decimal" value={prices[sku.id]} onChange={(event) => setPrices((current) => ({ ...current, [sku.id]: event.target.value }))} /></span></label><span className={`admin-availability-badge ${sku.availability === 'sold_out' ? 'is-sold-out' : 'is-available'}`}>{sku.availability === 'sold_out' ? '已售罄' : '可售'}</span><div className="admin-sku-actions"><button className="button button-secondary" type="button" disabled={busy !== null} onClick={() => void savePrice(sku.id)}>保存价格</button><button className="button button-secondary" type="button" disabled={busy !== null || status !== 'published'} onClick={() => void toggleAvailability(sku)}>{sku.availability === 'sold_out' ? '恢复售卖' : '标记售罄'}</button><button className="text-button" type="button" disabled={busy !== null} onClick={() => void setSkuLifecycle(sku)}>{sku.status === 'published' ? '下架套餐' : '上架套餐'}</button></div></div>)}</div>
    {message && <p className="admin-inline-message" role="status">{message}</p>}
  </article>;
}

export function AdminProductCreateForm() {
  const [form, setForm] = useState({ name: '', slug: '', description: '', skuName: '', skuSlug: '', price: '', status: 'draft', productType: 'recharge', platformSlug: 'chatgpt', screening: 'gpt_session' });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const update = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage('');
    if (!/^\d+(?:\.\d{1,2})?$/.test(form.price.trim())) { setBusy(false); setMessage('价格最多保留两位小数。'); return; }
    const response = await fetch('/api/admin/products', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: form.name, slug: form.slug, description: form.description, skuName: form.skuName, skuSlug: form.skuSlug, priceCents: Math.round(Number(form.price) * 100), status: form.status, productType: form.productType, categorySlug: form.platformSlug, screening: form.productType === 'account' ? 'none' : form.screening, idempotencyKey: key() }) });
    const json = await response.json().catch(() => ({})); setBusy(false);
    if (!response.ok) { setMessage(json.error?.message ?? '商品创建失败，请检查字段。'); return; }
    setMessage(form.status === 'published' ? '商品已创建并上架。刷新页面即可继续编辑。' : '商品已保存为草稿。刷新页面后可发布。');
    setForm({ name: '', slug: '', description: '', skuName: '', skuSlug: '', price: '', status: 'draft', productType: 'recharge', platformSlug: 'chatgpt', screening: 'gpt_session' });
  }
  return <form className="admin-create-panel" onSubmit={submit}><div className="admin-create-heading"><div><span className="eyebrow">新增商品</span><h2>上新一个商品</h2><p>先保存草稿，确认商品类型、平台、说明和价格后再发布。</p></div><span className="admin-create-step">01 / 01</span></div><div className="admin-create-grid"><label>商品类型<select value={form.productType} onChange={(event) => update('productType', event.target.value)}><option value="recharge">会员充值服务</option><option value="account">账号商品</option></select></label><label>所属平台<select value={form.platformSlug} onChange={(event) => update('platformSlug', event.target.value)}><option value="chatgpt">ChatGPT</option><option value="claude">Claude</option><option value="google">Google</option></select></label><label>商品名称<input required value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="例如 Claude Pro · 月卡" /></label><label>商品 slug<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={form.slug} onChange={(event) => update('slug', event.target.value)} placeholder="claude-pro" /></label><label className="is-wide">商品说明<textarea required value={form.description} onChange={(event) => update('description', event.target.value)} placeholder="面向什么用户，如何人工交付，哪些情况不受理" /></label><label>套餐名称<input required value={form.skuName} onChange={(event) => update('skuName', event.target.value)} placeholder="Pro 月卡 / 美国区账号" /></label><label>套餐 slug<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={form.skuSlug} onChange={(event) => update('skuSlug', event.target.value)} placeholder="claude-pro-monthly" /></label><label>价格（人民币）<input required min="0" step="0.01" inputMode="decimal" type="number" value={form.price} onChange={(event) => update('price', event.target.value)} placeholder="299" /></label><label>保存方式<select value={form.status} onChange={(event) => update('status', event.target.value)}><option value="draft">保存为草稿</option><option value="published">创建并立即上架</option></select></label></div><div className="admin-create-footer"><p>当前所有商品均由客服人工确认、收款和交付；归档只会停止新订单，不会删除历史订单。</p><button className="button button-primary" disabled={busy} type="submit">{busy ? '保存中…' : '创建商品'}</button></div>{message && <p className="admin-inline-message" role="status">{message}</p>}</form>;
}
