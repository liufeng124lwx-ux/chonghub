'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type AdminCase = {
  id: string;
  type: string;
  description: string;
  status: string;
  version: number;
  createdAt: string;
  refundCents: number;
  suggestionCents: number;
};

function money(cents: number) { return `¥${(cents / 100).toFixed(2)}`; }

export function AdminAfterSales({ cases }: { cases: AdminCase[] }) {
  const router = useRouter();
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [references, setReferences] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function refund(item: AdminCase) {
    const amount = Number(amounts[item.id]);
    const amountCents = Number.isSafeInteger(Math.round(amount * 100)) ? Math.round(amount * 100) : 0;
    if (amountCents <= 0) { setMessage('请输入有效的退款金额。'); return; }
    if (!window.confirm(`确认登记订单售后 ${item.id} 的人工退款 ¥${(amountCents / 100).toFixed(2)}？`)) return;
    setBusy(true); setMessage('');
    try {
      const response = await fetch(`/api/admin/after-sales/${item.id}/refunds`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ amountCents, refundedAt: new Date().toISOString(), reference: references[item.id]?.trim() || 'manual-wechat', idempotencyKey: crypto.randomUUID(), version: item.version }) });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) { setMessage(json.error?.message ?? '退款登记失败，请刷新后重试。'); return; }
      setMessage('退款已登记。'); router.refresh();
    } catch { setMessage('网络异常，退款未登记。'); } finally { setBusy(false); }
  }

  return <section className="admin-after-sales"><h2>售后与退款</h2>{cases.length === 0 ? <p className="empty-card">暂无售后申请。</p> : cases.map((item) => <article className="order-card" key={item.id}><strong>{item.type} · {item.status}</strong><small>{new Date(item.createdAt).toLocaleString('zh-CN')} · 已退款 {money(item.refundCents)}</small><p>{item.description}</p><p className="field-help">当前参考退款上限：{money(item.suggestionCents)}</p>{item.status !== 'closed' && item.suggestionCents > 0 && <div className="admin-action-row"><label>登记退款（元）<input inputMode="decimal" value={amounts[item.id] ?? ''} onChange={(event) => setAmounts((current) => ({ ...current, [item.id]: event.target.value }))} /></label><label>退款参考号<input value={references[item.id] ?? ''} onChange={(event) => setReferences((current) => ({ ...current, [item.id]: event.target.value }))} placeholder="manual-wechat" /></label><button className="button button-secondary" type="button" disabled={busy} onClick={() => void refund(item)}>登记退款</button></div>}</article>)}{message && <p className="form-message" role="status">{message}</p>}</section>;
}
