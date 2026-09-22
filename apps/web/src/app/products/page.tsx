import Link from 'next/link';
import { ProductCard } from '@/components/product-card';
import { listPublishedProducts } from '@chonghub/core/modules/catalog/service';
import { getPublicSettings } from '@chonghub/core/modules/settings/service';

export const dynamic = 'force-dynamic';
export const metadata = { title: '产品与套餐' };

export default async function ProductsPage() {
  const [products, settings] = await Promise.all([listPublishedProducts(), getPublicSettings()]);
  return (
    <main className="content-page">
      <section className="container products-index-page">
        <div className="section-heading"><div><span className="eyebrow">产品与套餐</span><h1>先选服务，再确认条件</h1><p className="page-lede">每张卡片都列出适用范围、起价和交付方式。价格以后台实时配置为准，人工确认后再付款。</p></div><p>当前上架服务<br />按实时库存展示</p></div>
        <div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} deliveryMinutes={settings.policy.deliveryMinutes} />)}</div>
        <div className="catalog-guide" aria-label="套餐选择提示"><div><span className="eyebrow">怎么选</span><strong>需要充值现有账号？</strong><p>优先选择标注“账号状态初筛”的会员充值服务。</p></div><div><span className="eyebrow">不确定时</span><strong>先看适用范围</strong><p>仍然不确定，可以先查看购买说明，再提交需求。</p></div><Link className="button button-secondary" href="/guide">查看购买说明 <span aria-hidden="true">→</span></Link></div>
        <div className="products-index-footer"><span>还不确定适合哪个套餐？</span><Link className="text-link" href="/guide">先查看购买说明 →</Link></div>
      </section>
    </main>
  );
}
