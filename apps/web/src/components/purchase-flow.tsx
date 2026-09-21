'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ProductView } from '@chonghub/core/modules/catalog/contracts';
import { classifySession } from '@chonghub/core/modules/screening/classify.client';
import type { ScreeningReport } from '@chonghub/core/modules/screening/report-schema';

const sessionHelp = '请换一个账号登录 ChatGPT，重新打开会话信息页面并全选复制新的授权文件后，再回来检测。';

function screeningFeedback(report: ScreeningReport): string {
  if (report.status === 'passed') return '账号检测通过，可以继续购买。';
  if (report.status === 'subscribed') return `账号检测未通过：提供的信息显示当前账号仍在 ChatGPT 订阅中，暂时无法处理。可以等待订阅结束后重新检测，或换一个当前无订阅的账号。${sessionHelp}`;
  if (report.reason === 'format') return `账号检测失败：授权内容不是有效的 JSON 对象、复制不完整，或超出 64 KiB 大小限制。${sessionHelp}`;
  if (report.reason === 'missing_login') return `账号检测失败：没有检测到有效的 ChatGPT 登录信息。请先登录 ChatGPT，再重新获取授权文件。${sessionHelp}`;
  if (report.reason === 'expired') return `账号检测失败：授权文件已过期。${sessionHelp}`;
  if (report.reason === 'missing_fields') return `账号检测失败：授权文件缺少必要字段，可能复制不完整或账号状态无法识别。${sessionHelp}`;
  if (report.reason === 'unknown_plan') return `账号检测失败：暂不支持识别当前账号套餐类型。${sessionHelp}`;
  return `账号检测失败：暂时无法判断账号状态。${sessionHelp}`;
}

export default function PurchaseFlow({ product }: { product: ProductView }) {
  const router = useRouter();
  const [skuId, setSkuId] = useState(product.skus[0]?.id ?? '');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [session, setSession] = useState('');
  const [report, setReport] = useState<ScreeningReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [purchaseAttempted, setPurchaseAttempted] = useState(false);
  const selectedSku = product.skus.find((sku) => sku.id === skuId) ?? product.skus[0];

  function detect() {
    const result = classifySession(session, Date.now());
    setReport(result);
    setMessage(screeningFeedback(result));
    setPurchaseAttempted(false);
    setSession('');
  }

  async function buy() {
    setPurchaseAttempted(true);
    if (!selectedSku?.isPurchasable) { setMessage('该套餐当前已售罄，请选择其他可售套餐。'); return; }
    if (!report) { setMessage('还没有进行账号检测，请先粘贴授权文件并点击“检测账号”。'); return; }
    if (report.status !== 'passed') { setMessage(screeningFeedback(report)); return; }
    if (!email.trim()) { setMessage('请先填写联系邮箱，用于接收订单和查询验证码。'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setMessage('请输入有效的联系邮箱。'); return; }
    setBusy(true); setMessage('正在生成订单…');
    let orderNumber: string;
    try {
      const response = await fetch('/api/orders', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ skuId, contactEmail: email, declaredSubscription: 'free', note, idempotencyKey: crypto.randomUUID() }) });
      const json = await response.json();
      if (!response.ok) { setMessage(json.error?.message ?? '订单生成失败，请稍后重试。'); return; }
      orderNumber = json.data.number;
    } catch {
      setMessage('网络异常，订单未生成，请稍后重试。');
      return;
    }

    try {
      const screeningResponse = await fetch(`/api/orders/${orderNumber}/screening`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ report, idempotencyKey: crypto.randomUUID() }) });
      if (!screeningResponse.ok) {
        // The order is already durable. Keep the requested handoff intact and
        // let the order page offer a retry instead of silently losing the
        // screening result.
        router.push(`/orders/${orderNumber}?wechat=1&detection=pending`);
        return;
      }
      router.push(`/orders/${orderNumber}?wechat=1`);
    } catch {
      // A network failure after order creation must not claim that no order
      // exists. The customer can retry detection from the durable order.
      router.push(`/orders/${orderNumber}?wechat=1&detection=pending`);
    }
    finally { setBusy(false); }
  }

  return <section className="purchase-flow" id="purchase">
    {busy && <div className="wechat-modal-backdrop"><div className="wechat-modal" role="status" aria-live="polite"><span className="order-spinner" aria-hidden="true" /><h2>正在生成订单</h2><p>正在保存套餐和检测结果，请稍候…</p></div></div>}
    <div className="purchase-flow-head"><div><span className="eyebrow">购买前检测</span><h2>先检测账号，再直接购买</h2><p>检测只在你的浏览器内进行，不上传或保存授权内容。检测通过后填写邮箱即可生成订单。</p></div><a className="text-link" href="https://chatgpt.com/api/auth/session" target="_blank" rel="noreferrer">获取授权内容 ↗</a></div>
    <div className="purchase-grid">
      <div className="form-card purchase-check-card">
        <label>粘贴 ChatGPT 授权内容<textarea autoComplete="off" value={session} onChange={(event) => { setSession(event.target.value); setReport(null); setMessage(''); setPurchaseAttempted(false); }} placeholder="先登录 ChatGPT，再打开会话信息页面并全选复制 JSON" /></label>
        <div className="purchase-check-actions"><button className="button button-secondary" type="button" disabled={!session.trim() || busy} onClick={detect}>检测账号</button>{report && <span className={`check-badge check-${report.status}`}>{report.status === 'passed' ? '检测通过' : report.status === 'subscribed' ? '订阅中' : '需重新检查'}</span>}</div>
        {!purchaseAttempted && message && <p className="form-message" role={report?.status === 'passed' ? 'status' : 'alert'}>{message}</p>}
        {report?.status === 'passed' && <small>检测仅依据提供的信息，实际充值条件仍需客服人工确认。</small>}
      </div>
      <div className="form-card purchase-order-card">
        <label>选择套餐<select value={skuId} onChange={(event) => setSkuId(event.target.value)}>{product.skus.map((sku) => <option key={sku.id} value={sku.id} disabled={!sku.isPurchasable}>{sku.name} · ¥{(sku.priceCents / 100).toFixed(0)}{sku.isPurchasable ? '' : ' · 已售罄'}</option>)}</select></label>
        <label>联系邮箱<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="用于订单通知和游客查单" /></label>
        <label>备注（可选）<textarea className="purchase-note" maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)} placeholder="不要填写密码或会话原文" /></label>
        <button className="button button-primary" type="button" disabled={busy || !selectedSku?.isPurchasable} onClick={() => void buy()}>{busy ? '正在生成订单…' : selectedSku?.isPurchasable ? '立即购买并生成订单' : '该套餐已售罄'}</button>
        {purchaseAttempted && message && <div className="form-message" role={busy ? 'status' : 'alert'} aria-atomic="true">
          <p>{message}</p>
          {report?.status !== 'passed' && <div className="purchase-check-actions">
            <a className="text-link" href="https://chatgpt.com/" target="_blank" rel="noreferrer">打开 ChatGPT 登录或切换账号 ↗</a>
            <a className="text-link" href="https://chatgpt.com/api/auth/session" target="_blank" rel="noreferrer">重新获取授权文件 ↗</a>
          </div>}
        </div>}
        <small>当前暂不接入在线支付，订单生成后请添加微信完成付款和人工交付。</small>
      </div>
    </div>
  </section>;
}
