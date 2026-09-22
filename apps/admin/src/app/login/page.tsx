'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter(); const [username,setUsername]=useState(''); const [password,setPassword]=useState(''); const [message,setMessage]=useState(''); const [busy,setBusy]=useState(false);
  async function submit(event:FormEvent) { event.preventDefault(); setBusy(true); setMessage(''); const response=await fetch('/api/admin/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username,password})}); const json=await response.json(); setBusy(false); if(!response.ok){setMessage(json.error?.message??'用户名或密码错误。');return;} router.push('/admin'); }
  return <main className="admin-login-page"><section className="admin-login-panel"><div className="admin-login-brand"><span className="admin-login-mark">C</span><span>ChongHub Operations</span></div><span className="admin-eyebrow">运营后台 · 管理员入口</span><h1>欢迎回到运营工作台</h1><p className="admin-login-lede">在这里处理订单履约、更新商品状态，并跟进客户售后请求。</p><form className="admin-login-form" onSubmit={submit}><label>管理员用户名<input required autoComplete="username" value={username} onChange={(e)=>setUsername(e.target.value)} placeholder="输入管理员用户名" /></label><label>管理员密码<input type="password" required autoComplete="current-password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="输入管理员密码" /></label>{message&&<p className="admin-login-message" role="alert">{message}</p>}<button className="admin-login-submit" type="submit" disabled={busy || !username || !password}>{busy?'登录中…':'进入管理后台'}</button></form><p className="admin-login-note">仅限授权运营人员使用 · 操作将记录在审计日志中</p></section><aside className="admin-login-aside"><span className="admin-aside-kicker">TODAY&apos;S OPERATIONS</span><strong>让每一笔订单<br />都有明确进展</strong><div className="admin-aside-items"><span>订单处理</span><span>商品状态</span><span>售后跟进</span></div></aside></main>;
}
