'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { classifySession } from '@chonghub/core/modules/screening/classify.client';

export default function ScreeningPage() {
  const params = useParams<{ number: string }>();
  const [value, setValue] = useState('');
  const [result, setResult] = useState('');
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    const report = classifySession(value, Date.now());
    setValue('');
    setResult(report.status === 'passed' ? '初步校验通过' : report.status === 'subscribed' ? '当前账号正在订阅中，暂时无法处理' : '暂未通过初筛，请检查登录状态或联系客服');
    try {
      const response = await fetch(`/api/orders/${params.number}/screening`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ report, idempotencyKey: crypto.randomUUID() }) });
      if (!response.ok) setResult('初筛结果未能保存，请刷新订单后重试或联系客服');
    } catch {
      setResult('网络异常，初筛结果未能保存，请稍后重试。');
    } finally {
      setBusy(false);
    }
  }
  return <main className="content-page"><section className="container narrow-page"><span className="eyebrow">账号初筛</span><h1>只在你的浏览器内检查</h1><p className="page-lede">请先登录 ChatGPT，再打开会话信息页面，将完整 JSON 粘贴到下面。原文不会上传、保存或写入订单。</p><p className="guide-links"><a href="https://chatgpt.com/" target="_blank" rel="noreferrer">打开 ChatGPT ↗</a><a href="https://chatgpt.com/api/auth/session" target="_blank" rel="noreferrer">获取会话信息 ↗</a></p><div className="form-card"><label>会话信息<textarea aria-label="会话信息" autoComplete="off" value={value} onChange={(event) => setValue(event.target.value)} placeholder="粘贴 JSON，仅用于本次浏览器内检查" /></label><button className="button button-primary" type="button" disabled={busy || !value} onClick={run}>{busy ? '检查中…' : '开始初筛'}</button>{result && <div className="screening-result" role="status"><strong>{result}</strong><p>需求单号：{params.number}</p><a className="button button-secondary" href="/guide#contact">添加微信客服</a></div>}</div></section></main>;
}
