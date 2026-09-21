import Link from 'next/link';

export const metadata = { title: '订单中心' };

export default function OrdersEntryPage() {
  return (
    <main className="content-page">
      <section className="container narrow-page">
        <span className="eyebrow">订单中心</span>
        <h1>提交需求或查询进度</h1>
        <p className="page-lede">订单由网站统一记录，微信只负责人工确认和交付沟通。游客无需登录也可以提交和查单。</p>
        <div className="entry-grid">
          <div className="entry-card">
            <span className="eyebrow">新需求</span>
            <h2>还没有订单？</h2>
            <p>选择套餐并填写联系邮箱，提交后立即进入账号初筛。</p>
            <Link className="button button-primary" href="/requests/new">提交需求</Link>
          </div>
          <div className="entry-card">
            <span className="eyebrow">已有订单</span>
            <h2>查询处理进度</h2>
            <p>登录用户在个人中心查看；游客使用需求单号和邮箱验证码访问订单。</p>
            <div className="entry-actions">
              <Link className="button button-secondary" href="/me">登录查看</Link>
              <Link className="text-link" href="/guest/orders">游客查单 →</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
