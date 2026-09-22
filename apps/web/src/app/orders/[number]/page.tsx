import Link from 'next/link';
import { headers } from 'next/headers';
import { getPublicOrder } from '@chonghub/core/modules/orders/query';
import { readActor } from '@chonghub/core/modules/auth/access';
import { getPublicSettings } from '@chonghub/core/modules/settings/service';
import OrderWechatActions from '@/components/order-wechat-actions';

export const dynamic = 'force-dynamic';
export default async function OrderPage({ params, searchParams }: { params: Promise<{ number: string }>; searchParams?: Promise<{ wechat?: string; detection?: string }> }) {
  const number = (await params).number;
  const requestHeaders = await headers();
  const actor = await readActor(new Request('http://localhost', { headers: requestHeaders }));
  const [order, settings, query] = await Promise.all([getPublicOrder(number, actor), getPublicSettings(), searchParams ?? Promise.resolve<{ wechat?: string; detection?: string }>({})]);
  const isAccount = order.snapshot.productType === 'account';
  const status = order.deliveryStatus === 'pending_confirmation' ? '等待微信确认' : order.deliveryStatus === 'processing' ? '处理中' : order.deliveryStatus === 'completed' ? '已完成' : order.deliveryStatus === 'needs_info' ? '待补充资料' : order.deliveryStatus === 'cancelled' ? '已取消' : '已提交';
  return <main className="content-page"><section className="container narrow-page"><span className="eyebrow">{order.snapshot.platform?.name ?? '商品'} · {isAccount ? '账号商品' : '会员充值'} · 订单 {order.number}</span><h1>{order.snapshot.productName}</h1><p className="page-lede">订单已生成 · 当前状态：{status}</p>{query.detection === 'pending' && !isAccount && <div className="detail-notice" role="status"><span className="notice-icon">!</span><div><strong>订单已生成，但检测结果暂未保存</strong><p>请点击“重新检测账号”完成检测；不要重复创建订单。</p></div></div>}<div className="order-card"><div className="order-summary"><strong>{order.snapshot.skuName}</strong><span>展示价格 ¥{(order.snapshot.displayPriceCents / 100).toFixed(0)} · 当前报价 {order.quotedPriceCents ? `¥${(order.quotedPriceCents / 100).toFixed(2)}` : '待人工确认'}</span></div><div className="timeline">{order.timeline.map((item) => <div key={`${item.at}-${item.message}`}><span>{new Date(item.at).toLocaleString('zh-CN')}</span><p>{item.message}</p></div>)}</div></div><OrderWechatActions contact={settings.customerService} autoOpen={query.wechat === '1'} /><div className="order-actions">{!isAccount && <Link className="button button-secondary" href={`/requests/${number}/screening`}>重新检测账号</Link>}<Link className="text-link" href={`/orders/${number}/after-sales`}>申请售后 →</Link></div></section></main>;
}
