'use client';

import { useState } from 'react';
import type { PublicOrder } from '@chonghub/core/modules/orders/contracts';

export function AdminOrderActions({ order }: { order: PublicOrder }) {
  const [current, setCurrent] = useState(order);
  const [price, setPrice] = useState(current.quotedPriceCents === null ? '' : (current.quotedPriceCents / 100).toFixed(2));
  const [receiptReference, setReceiptReference] = useState('manual-wechat');
  const [result, setResult] = useState('人工交付已完成');
  const [needsInfo, setNeedsInfo] = useState('');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function command(commandBody: Record<string, unknown>) {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch(`/api/admin/orders/${current.number}/commands`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ command: commandBody, expectedVersion: current.version, idempotencyKey: crypto.randomUUID() }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) { setMessage(json.error?.message ?? '操作失败，请刷新后重试。'); return; }
      if (json.data) {
        setCurrent(json.data as PublicOrder);
        if (json.data.quotedPriceCents !== null) setPrice((json.data.quotedPriceCents / 100).toFixed(2));
      }
      setMessage('操作已保存。');
    } catch {
      setMessage('网络异常，操作未保存。');
    } finally {
      setBusy(false);
    }
  }

  function priceCents() {
    const value = Number(price);
    return Number.isFinite(value) && value > 0 ? Math.round(value * 100) : 0;
  }

  return <div className="form-card admin-actions">
    <p className="admin-current-state">当前：{current.deliveryStatus} · 收款 {current.paymentStatus} · 初筛 {current.screeningStatus} · 版本 {current.version}</p>
    <label>确认报价（元）<input inputMode="decimal" value={price} onChange={(event) => setPrice(event.target.value)} /></label>
    <div className="admin-action-row"><button className="button button-primary" type="button" disabled={busy} onClick={() => { const amount = priceCents(); if (amount > 0 && window.confirm(`确认将订单 ${current.number} 的成交报价记录为 ¥${(amount / 100).toFixed(2)}？`)) void command({ type: 'confirm_quote', priceCents: amount, customerConfirmedAt: new Date().toISOString() }); }}>确认报价</button><button className="button button-secondary" type="button" disabled={busy} onClick={() => { const amount = priceCents(); if (amount > 0 && window.confirm(`确认已收到订单 ${current.number} 的 ¥${(amount / 100).toFixed(2)}？`)) void command({ type: 'confirm_receipt', amountCents: amount, receivedAt: new Date().toISOString(), reference: receiptReference.trim() || 'manual-wechat' }); }}>登记收款</button></div>
    <label>收款参考号<input value={receiptReference} onChange={(event) => setReceiptReference(event.target.value)} /></label>
    <div className="admin-action-row"><button className="button button-secondary" type="button" disabled={busy} onClick={() => void command({ type: 'confirm_materials' })}>资料齐全</button><button className="button button-secondary" type="button" disabled={busy} onClick={() => void command({ type: 'start_processing' })}>开始处理</button></div>
    <label>待补充信息<textarea value={needsInfo} onChange={(event) => setNeedsInfo(event.target.value)} placeholder="例如：请通过微信补充可受理的账号资料" /></label><button className="button button-secondary" type="button" disabled={busy || !needsInfo.trim()} onClick={() => void command({ type: 'needs_info', message: needsInfo.trim() })}>标记待补充</button>
    <label>完成结果<textarea value={result} onChange={(event) => setResult(event.target.value)} /></label><button className="button button-primary" type="button" disabled={busy || !result.trim()} onClick={() => { const text = result.trim(); if (text && window.confirm(`确认将订单 ${current.number} 标记为已完成？结果：${text}`)) void command({ type: 'complete', successAt: new Date().toISOString(), result: text }); }}>标记完成</button>
    <label>内部备注<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="只供后台查看，不发送给客户" /></label><button className="button button-secondary" type="button" disabled={busy || !note.trim()} onClick={() => void command({ type: 'add_note', text: note.trim(), visibility: 'internal' })}>保存内部备注</button>
    <label>取消原因<textarea id="admin-cancel-reason" placeholder="仅在确认取消时填写" /></label><button className="button button-danger" type="button" disabled={busy} onClick={() => { const reason = (document.getElementById('admin-cancel-reason') as HTMLTextAreaElement)?.value.trim(); if (reason && window.confirm(`确认取消订单 ${current.number}？${current.paymentStatus === 'paid' ? '该订单已收款，取消后仍需人工处理退款。' : ''}`)) void command({ type: 'cancel', reason }); else if (!reason) setMessage('请填写取消原因。'); }}>取消订单</button>
    {message && <p className="form-message" role="status">{message}</p>}
  </div>;
}
