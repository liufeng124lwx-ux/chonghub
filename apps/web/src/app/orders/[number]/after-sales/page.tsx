import Link from 'next/link';
import { headers } from 'next/headers';
import { readActor } from '@chonghub/core/modules/auth/access';
import { getPublicOrder } from '@chonghub/core/modules/orders/query';
import { getRefundSuggestion, listAfterSales } from '@chonghub/core/modules/after-sales/service';
import { AfterSalesPanel } from '@/components/after-sales-panel';

export const dynamic = 'force-dynamic';

export default async function AfterSalesPage({ params }: { params: Promise<{ number: string }> }) {
  const number = (await params).number;
  const requestHeaders = await headers();
  const actor = await readActor(new Request('http://localhost', { headers: requestHeaders }));
  if (!actor) return <main className="state-page"><div className="state-card"><h1>请先验证身份</h1><p>登录或使用游客查询凭据后，才能提交售后申请。</p><Link className="button button-primary" href="/login">邮箱登录</Link></div></main>;
  const order = await getPublicOrder(number, actor);
  const cases = await listAfterSales(number, actor);
  const suggestion = await getRefundSuggestion(number, actor);
  return <main className="content-page"><section className="container narrow-page"><Link className="back-link" href={`/orders/${number}`}>← 返回订单</Link><span className="eyebrow">售后保障</span><h1>订单售后</h1><p className="page-lede">订单 {order.number} · 保障期内如掉订阅，请先提交说明，客服会通过微信核实处理。</p><AfterSalesPanel orderNumber={number} initialCases={cases} suggestionCents={suggestion} /></section></main>;
}
