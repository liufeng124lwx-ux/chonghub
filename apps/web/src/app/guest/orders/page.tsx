'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function GuestOrdersPage() {
  const router = useRouter();
  const [number, setNumber] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function requestCode(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/guest/reset/request', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ number: number.trim(), email: email.trim() }) });
      const json = await response.json();
      if (!response.ok) { setMessage(json.error?.message ?? '暂时无法发送验证码，请稍后再试。'); return; }
      setSent(true); setMessage('如果单号和联系邮箱匹配，验证码会发送到你的邮箱。请查收后继续。');
    } finally { setBusy(false); }
  }

  async function accessOrder(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/guest/access', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ number: number.trim(), email: email.trim(), code: code.trim() }) });
      const json = await response.json();
      if (!response.ok) { setMessage(json.error?.message ?? '验证码错误或已过期。'); return; }
      router.push(`/orders/${json.data.orderNumber}`);
    } finally { setBusy(false); }
  }

  return <main className="content-page"><section className="container narrow-page"><span className="eyebrow">游客查单</span><h1>用邮箱验证码查看进度</h1><p className="page-lede">游客无需设置或记忆查询密码。输入需求单号和下单时填写的联系邮箱，我们会发送一次性验证码。</p>{!sent ? <form className="form-card" onSubmit={requestCode}><label>需求单号<input required value={number} onChange={(event) => setNumber(event.target.value)} placeholder="例如 CH…" autoComplete="off" /></label><label>联系邮箱<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" /></label>{message && <p className="form-message">{message}</p>}<button className="button button-primary" type="submit" disabled={busy}>{busy ? '发送中…' : '发送邮箱验证码'}</button></form> : <form className="form-card" onSubmit={accessOrder}><label>邮箱验证码<input required inputMode="numeric" pattern="[0-9]{6}" value={code} onChange={(event) => setCode(event.target.value)} placeholder="6 位验证码" autoComplete="one-time-code" /></label>{message && <p className="form-message">{message}</p>}<button className="button button-primary" type="submit" disabled={busy}>{busy ? '验证中…' : '查看订单'}</button><button className="button button-secondary" type="button" onClick={() => { setSent(false); setCode(''); setMessage(''); }}>重新填写单号或邮箱</button></form>}<p className="page-footer-link"><a href="/login">邮箱登录 →</a></p></section></main>;
}
