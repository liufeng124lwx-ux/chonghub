import Link from 'next/link';
import { headers } from 'next/headers';
import { readActor } from '@/modules/auth/access';
import { getPublicOrder } from '@/modules/orders/query';
import { AdminOrderActions } from '@/components/admin-order-actions';
import { getRefundSuggestion, listAfterSales } from '@/modules/after-sales/service';
import { AdminAfterSales } from '@/components/admin-after-sales';

export const dynamic = 'force-dynamic';
export default async function AdminOrderDetail({ params }: { params: Promise<{ number: string }> }) { const number = (await params).number; const h = await headers(); const actor = await readActor(new Request('http://localhost', { headers: h })); if (!actor || actor.kind !== 'admin') return <main className="state-page"><div className="state-card"><h1>需要管理员登录</h1><Link className="button button-primary" href="/login">邮箱登录</Link></div></main>; const order = await getPublicOrder(number, actor); const cases = await listAfterSales(number, actor); const withSuggestions = await Promise.all(cases.map(async (item) => ({ ...item, suggestionCents: await getRefundSuggestion(number, actor, item.id) }))); return <main className="content-page"><section className="container narrow-page"><Link className="back-link" href="/admin/orders">← 返回订单列表</Link><span className="eyebrow">订单 {order.number}</span><h1>{order.snapshot.productName}</h1><p className="page-lede">{order.snapshot.skuName} · 当前版本 {order.version} · {order.deliveryStatus}</p><AdminOrderActions order={order} /><AdminAfterSales cases={withSuggestions} /><div className="order-card"><strong>客户可见时间线</strong><div className="timeline">{order.timeline.map((item) => <div key={`${item.at}-${item.message}`}><span>{new Date(item.at).toLocaleString('zh-CN')}</span><p>{item.message}</p></div>)}</div></div></section></main>; }
