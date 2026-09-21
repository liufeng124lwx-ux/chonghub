'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

type AdminOrder = {
  number: string;
  email: string;
  deliveryStatus: string;
  paymentStatus: string;
  screeningStatus: string;
  quotedPriceCents: number | null;
  dueAt: string | null;
  createdAt: string;
};

type NotificationItem = {
  eventId: string;
  channel: string;
  type: string;
  state: string;
  attempts: number;
  lastError: string | null;
  createdAt: string;
};

const deliveryLabels: Record<string, string> = {
  pending_confirmation: '待确认', pending: '待处理', needs_info: '待补充资料',
  processing: '处理中', completed: '已完成', cancelled: '已取消',
};
const paymentLabels: Record<string, string> = { unpaid: '未收款', paid: '已收款', partial_refund: '部分退款', refunded: '已退款' };
const screeningLabels: Record<string, string> = { unchecked: '未初筛', passed: '初筛通过', subscribed: '订阅中', invalid: '资料无效', unknown: '无法判断' };

function label(map: Record<string, string>, value: string) { return map[value] ?? value; }

export default function AdminOrdersPage() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [afterSalesPending, setAfterSalesPending] = useState(0);
  const [overdueOrders, setOverdueOrders] = useState(0);
  const [queryText, setQueryText] = useState('');
  const [status, setStatus] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage('');
    const params = new URLSearchParams();
    if (queryText.trim()) params.set('q', queryText.trim());
    if (status) params.set('status', status);
    try {
      const [dashboard, orderResponse] = await Promise.all([
        fetch('/api/admin/dashboard', { cache: 'no-store' }),
        fetch(`/api/admin/orders${params.size ? `?${params.toString()}` : ''}`, { cache: 'no-store' }),
      ]);
      const dashboardJson = await dashboard.json().catch(() => ({}));
      const orderJson = await orderResponse.json().catch(() => ({}));
      if (!dashboard.ok || !orderResponse.ok) {
        setMessage(dashboardJson.error?.message ?? orderJson.error?.message ?? '无法加载运营数据。');
        return;
      }
      setCounts(dashboardJson.data?.counts ?? {});
      setAfterSalesPending(dashboardJson.data?.afterSalesPending ?? 0);
      setOverdueOrders(dashboardJson.data?.overdueOrders ?? 0);
      setNotifications((dashboardJson.data?.notifications?.items ?? []).filter((item: NotificationItem) => item.state === 'failed'));
      setOrders(orderJson.data ?? []);
    } catch {
      setMessage('网络异常，无法加载运营数据。');
    } finally {
      setLoading(false);
    }
  }, [queryText, status]);

  useEffect(() => { void load(); }, [load]);

  async function retry(eventId: string) {
    const response = await fetch(`/api/admin/notifications/${eventId}/retry`, { method: 'POST' });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) { setMessage(json.error?.message ?? '通知重试失败。'); return; }
    setMessage(json.data?.retried ? '通知已重新排队。' : '通知当前不在失败状态，列表已刷新。');
    await load();
  }

  return <main className="content-page"><section className="container narrow-page admin-orders-page">
    <span className="eyebrow">订单工作台</span><h1>今天要处理什么</h1>
    <p className="page-lede">按优先级处理待确认、待补充和超时订单；通知失败不会影响订单保存，可在这里重新排队。</p>
    {message && <p className="form-message" role="alert">{message}</p>}
    <div className="dashboard-grid">
      {Object.entries(counts).map(([key, value]) => <div className="metric-card" key={key}><span>{label(deliveryLabels, key)}</span><strong>{value}</strong></div>)}
      <div className="metric-card"><span>售后待处理</span><strong>{afterSalesPending}</strong></div>
      <div className="metric-card metric-card-warning"><span>超过预计时间</span><strong>{overdueOrders}</strong></div>
      <div className="metric-card"><span>通知失败</span><strong>{notifications.length}</strong></div>
    </div>
    {notifications.length > 0 && <section className="admin-alert-panel"><div><strong>通知需要重试</strong><p>仅展示通知元数据，不展示邮件正文或验证码内容。</p></div><div className="notification-list">{notifications.map((item) => <div className="notification-row" key={item.eventId}><span>{item.channel} · {item.type} · 第 {item.attempts} 次</span><small>{item.lastError ?? '投递失败'} · {new Date(item.createdAt).toLocaleString('zh-CN')}</small><button className="button button-secondary" type="button" onClick={() => void retry(item.eventId)}>重新排队</button></div>)}</div></section>}
    <form className="admin-order-filters" onSubmit={(event) => { event.preventDefault(); void load(); }}><label>搜索单号或联系邮箱<input value={queryText} onChange={(event) => setQueryText(event.target.value)} placeholder="CH- 或邮箱" /></label><label>交付状态<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">全部</option>{Object.entries(deliveryLabels).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label><button className="button button-secondary" type="submit">筛选</button></form>
    {loading ? <p className="empty-card">加载中…</p> : orders.length === 0 ? <div className="empty-card"><strong>没有匹配的订单</strong><p>可以清空筛选条件，或等待用户提交新的需求单。</p></div> : <div className="order-list">{orders.map((order) => <Link className="order-card" href={`/admin/orders/${order.number}`} key={order.number}><strong>{order.number}</strong><span>{order.email} · {label(deliveryLabels, order.deliveryStatus)} · {label(paymentLabels, order.paymentStatus)}</span><small>初筛：{label(screeningLabels, order.screeningStatus)} · {order.quotedPriceCents !== null ? `报价 ¥${(order.quotedPriceCents / 100).toFixed(2)}` : '待报价'}{order.dueAt ? ` · 最迟 ${new Date(order.dueAt).toLocaleString('zh-CN')}` : ''} · {new Date(order.createdAt).toLocaleString('zh-CN')}</small></Link>)}</div>}
  </section></main>;
}
