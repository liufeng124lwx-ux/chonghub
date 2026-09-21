'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter(); const [email,setEmail]=useState(''); const [code,setCode]=useState(''); const [sent,setSent]=useState(false); const [message,setMessage]=useState(''); const [busy,setBusy]=useState(false);
  async function send() { setBusy(true); setMessage(''); const response=await fetch('/api/admin/auth/otp',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email})}); const json=await response.json(); setBusy(false); if(!response.ok){setMessage(json.error?.message??'发送失败');return;} setSent(true); setMessage('验证码已发送，请查收邮箱。'); }
  async function submit(event:FormEvent) { event.preventDefault(); setBusy(true); const response=await fetch('/api/admin/auth/verify',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,code})}); const json=await response.json(); setBusy(false); if(!response.ok){setMessage(json.error?.message??'验证失败');return;} router.push('/admin'); }
  return <main className="content-page"><section className="container narrow-page"><span className="eyebrow">邮箱登录</span><h1>登录 ChongHub</h1><p className="page-lede">登录后可以在个人中心查看订单和售后进度。首次验证邮箱会自动注册。</p><form className="form-card" onSubmit={submit}><label>邮箱<input type="email" required autoComplete="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@example.com" /></label><div className="form-row"><label>验证码<input inputMode="numeric" pattern="[0-9]{6}" required={sent} value={code} onChange={(e)=>setCode(e.target.value)} placeholder="6 位验证码" /></label><button className="button button-secondary" type="button" onClick={send} disabled={busy || !email}>{sent?'重新发送':'获取验证码'}</button></div>{message&&<p className="form-message">{message}</p>}<button className="button button-primary" type="submit" disabled={busy || !sent}>登录 / 注册</button></form><p className="page-footer-link"><a href="/guest/orders">游客查询订单 →</a></p></section></main>;
}
