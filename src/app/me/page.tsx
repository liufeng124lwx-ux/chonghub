import Link from 'next/link';
import { headers } from 'next/headers';
import { readActor } from '@/modules/auth/access';
import { listMyOrders } from '@/modules/orders/query';

export const dynamic='force-dynamic';
export default async function MePage(){const h=await headers();const actor=await readActor(new Request('http://localhost',{headers:h}));if(!actor||actor.kind==='guest')return <main className="state-page"><div className="state-card"><span className="eyebrow">个人中心</span><h1>请先登录</h1><p>邮箱验证后即可查看归属于你的订单。</p><Link className="button button-primary" href="/login">邮箱登录</Link></div></main>;const orders=await listMyOrders(actor);return <main className="content-page"><section className="container narrow-page"><span className="eyebrow">个人中心</span><h1>你的订单</h1>{orders.items.length===0?<div className="empty-card"><p>还没有订单，先从套餐开始了解吧。</p><Link className="button button-primary" href="/#products">查看套餐</Link></div>:<div className="order-list">{orders.items.map((order)=><Link className="order-card" href={`/orders/${order.number}`} key={order.number}><strong>{order.snapshot.productName}</strong><span>{order.number} · {order.deliveryStatus}</span><small>{new Date(order.timeline[0]?.at??Date.now()).toLocaleString('zh-CN')}</small></Link>)}</div>}</section></main>}
