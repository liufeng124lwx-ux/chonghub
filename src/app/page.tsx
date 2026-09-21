import Link from 'next/link';
import { ProductCard } from '@/components/product-card';
import { listPublishedProducts } from '@/modules/catalog/service';
import { getPublicSettings } from '@/modules/settings/service';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const products = await listPublishedProducts();
  const settings = await getPublicSettings();
  const { policy } = settings;
  return (
    <main>
      <section className="hero container">
        <div className="hero-copy">
          <div className="status-pill"><span className="status-live" />当前提供人工充值服务</div>
          <h1>把会员充值这件事，<em>交给专业的人</em></h1>
          <p className="hero-lede">面向已有 ChatGPT 账号的人工会员充值服务。先做账号状态初筛，再由客服确认条件、报价与交付。</p>
          <div className="hero-actions"><Link className="button button-primary" href="/products">查看套餐 <span aria-hidden="true">→</span></Link><Link className="text-link" href="/guest/orders">查询订单 <span aria-hidden="true">→</span></Link></div>
          <div className="hero-trust"><span>✓ 当前仅支持无有效订阅账号</span><span>✓ 营业时间 {policy.opensAt}–{policy.closesAt}</span></div>
        </div>
        <div className="hero-art" aria-hidden="true"><div className="art-glow" /><div className="art-card art-card-main"><span className="art-label">人工履约进度</span><strong>每一步，都有记录</strong><div className="progress-line"><span /></div><small>资料确认　→　客服沟通　→　完成交付</small></div><div className="art-card art-card-float"><span>交付时效</span><strong>{Math.round(policy.deliveryMinutes / 60)}<span>小时内</span></strong><small>资料齐全并确认收款后</small></div></div>
      </section>
      <section className="section container" id="products"><div className="section-heading"><div><span className="eyebrow">精选服务</span><h2>选择适合你的套餐</h2></div><p>当前上架三个 ChatGPT 月卡套餐<br />价格以后台实时配置为准</p></div><div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div></section>
      <section className="process-section"><div className="container"><div className="section-heading light"><div><span className="eyebrow">服务流程</span><h2>清晰、可追踪的人工服务</h2></div><p>网站记录需求和进度<br />客服在微信完成确认与交付</p></div><div className="process-grid"><div><span>01</span><h3>提交需求</h3><p>选择套餐并填写联系邮箱，游客也可以直接提交。</p></div><div><span>02</span><h3>账号初筛</h3><p>在浏览器内检查账号状态，原始内容不会上传或保存。</p></div><div><span>03</span><h3>微信确认</h3><p>添加客服确认适用条件、最终报价和交付时间。</p></div><div><span>04</span><h3>人工交付</h3><p>确认收款且资料齐全后，营业时间内 {policy.deliveryMinutes / 60} 个小时内完成。</p></div></div></div></section>
      <section className="faq-section container"><div className="section-heading"><div><span className="eyebrow">常见问题</span><h2>下单前，先了解这些</h2></div><Link className="text-link" href="/guide">查看完整说明 →</Link></div><div className="faq-grid"><details open><summary>已有订阅的账号可以充值吗？</summary><p>目前只受理当前无有效订阅的账号。订阅中的账号请等待订阅结束后重新校验。</p></details><details><summary>提交后多久可以完成？</summary><p>确认收款且所需资料齐全后，营业时间内 2 小时内完成，非营业时间顺延。</p></details><details><summary>网站现在支持在线支付吗？</summary><p>当前暂不提供在线支付。通过初筛后，请添加微信客服确认并完成人工交付。</p></details></div></section>
    </main>
  );
}
