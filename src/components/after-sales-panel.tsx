'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

type CaseItem = {
  id: string;
  orderNumber: string;
  type: 'subscription_lost' | 'delivery_issue' | 'other';
  description: string;
  status: string;
  version: number;
  createdAt: string;
  refundCents: number;
  attachments: Array<{ id: string; mime: string; bytes: number; createdAt: string }>;
};

const typeLabels: Record<CaseItem['type'], string> = {
  subscription_lost: '掉订阅',
  delivery_issue: '交付问题',
  other: '其他问题',
};

function money(cents: number) { return `¥${(cents / 100).toFixed(2)}`; }

export function AfterSalesPanel({ orderNumber, initialCases, suggestionCents }: { orderNumber: string; initialCases: CaseItem[]; suggestionCents: number }) {
  const router = useRouter();
  const [type, setType] = useState<CaseItem['type']>('subscription_lost');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setMessage('');
    try {
      const response = await fetch(`/api/orders/${orderNumber}/after-sales`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type, description, idempotencyKey: crypto.randomUUID() }) });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) { setMessage(json.error?.message ?? '提交失败，请稍后重试。'); return; }
      setDescription(''); setMessage('售后申请已提交。'); router.refresh();
    } catch { setMessage('网络异常，售后申请未提交。'); } finally { setBusy(false); }
  }

  async function upload(caseId: string, file: File) {
    setMessage('');
    const form = new FormData(); form.set('file', file);
    try {
      const response = await fetch(`/api/after-sales/${caseId}/attachments`, { method: 'POST', body: form });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) { setMessage(json.error?.message ?? '附件上传失败。'); return; }
      setMessage('附件已上传。'); router.refresh();
    } catch { setMessage('网络异常，附件未上传。'); }
  }

  return <div className="after-sales-panel">
    {suggestionCents > 0 && <div className="detail-notice"><span className="notice-icon">i</span><div><strong>当前退款参考上限 {money(suggestionCents)}</strong><p>这是按已登记收款和保障剩余时长计算的参考值，最终以人工核实结果为准。</p></div></div>}
    {initialCases.map((item) => <article className="order-card" key={item.id}><strong>{typeLabels[item.type]} · {item.status === 'resolved' ? '已处理' : item.status === 'closed' ? '已关闭' : '处理中'}</strong><small>{new Date(item.createdAt).toLocaleString('zh-CN')}</small><p>{item.description}</p>{item.attachments.length > 0 && <div className="attachment-list">{item.attachments.map((attachment) => <a className="text-link" key={attachment.id} href={`/api/attachments/${attachment.id}`} target="_blank" rel="noreferrer">查看附件（{attachment.mime}）</a>)}</div>}{item.status !== 'closed' && item.attachments.length < 3 && <label className="file-picker">补充图片<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(item.id, file); event.currentTarget.value = ''; }} /></label>}</article>)}
    {initialCases.length === 0 && <p className="empty-card">暂时没有售后申请。</p>}
    <form className="form-card" onSubmit={submit}><h2>提交售后申请</h2><label>问题类型<select value={type} onChange={(event) => setType(event.target.value as CaseItem['type'])}><option value="subscription_lost">掉订阅</option><option value="delivery_issue">交付问题</option><option value="other">其他问题</option></select></label><label>问题说明<textarea required minLength={2} maxLength={2000} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="请描述发生时间和现象，不要填写密码或会话令牌。" /></label>{message && <p className="form-message" role="status">{message}</p>}<button className="button button-primary" type="submit" disabled={busy}>{busy ? '提交中…' : '提交售后申请'}</button></form>
  </div>;
}
