import Link from 'next/link';
import type { Metadata } from 'next';
import { ProductCard } from '@/components/product-card';
import { listPublishedProducts } from '@chonghub/core/modules/catalog/service';
import { getPublicSettings } from '@chonghub/core/modules/settings/service';
import { JsonLd, breadcrumbJsonLd } from '@/components/json-ld';
import { canonicalUrl, siteName, siteOgImageUrl } from '@/lib/site-config';
import { listPublishedArticles } from '@/lib/articles';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'ChatGPT 会员充值套餐',
  description: '查看 ChatGPT Plus 等会员充值套餐、适用账号、交付方式与人工服务条件。',
  alternates: { canonical: canonicalUrl('/products') },
  openGraph: {
    type: 'website', siteName, title: 'ChatGPT 会员充值套餐',
    description: '查看 ChatGPT Plus 等会员充值套餐、适用账号、交付方式与人工服务条件。',
    url: canonicalUrl('/products'), images: [{ url: siteOgImageUrl, width: 1200, height: 630, alt: 'ChongHub ChatGPT 会员充值套餐' }],
  },
};

export default async function ProductsPage() {
  const [products, settings, articles] = await Promise.all([listPublishedProducts(), getPublicSettings(), listPublishedArticles()]);
  return (
    <main className="content-page">
      <section className="container products-index-page">
        <nav className="breadcrumbs" aria-label="面包屑"><Link href="/">首页</Link><span aria-hidden="true">/</span><span>产品与套餐</span></nav>
        <JsonLd data={breadcrumbJsonLd([{ name: '首页', url: canonicalUrl('/') }, { name: '产品与套餐', url: canonicalUrl('/products') }])} />
        <div className="section-heading"><div><span className="eyebrow">产品与套餐</span><h1>ChatGPT Plus / Pro 会员充值套餐</h1><p className="page-lede">每张卡片都列出适用范围、起价和交付方式。价格以后台实时配置为准，人工确认后再付款。</p></div><p>当前上架服务<br />按实时库存展示</p></div>
        <div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} deliveryMinutes={settings.policy.deliveryMinutes} />)}</div>
        <div className="catalog-guide" aria-label="套餐选择提示"><div><span className="eyebrow">怎么选</span><strong>需要充值现有账号？</strong><p>优先选择标注“账号状态初筛”的会员充值服务。</p></div><div><span className="eyebrow">不确定时</span><strong>先看适用范围</strong><p>仍然不确定，可以先查看购买说明，再提交需求。</p></div><Link className="button button-secondary" href="/guide">查看购买说明 <span aria-hidden="true">→</span></Link></div>
        <div className="catalog-article-links" aria-label="套餐选择指南"><span>还在比较方案？</span>{articles.slice(0, 3).map((article) => <Link className="text-link" key={article.slug} href={`/articles/${article.slug}`}>{article.title} →</Link>)}</div>
        <div className="products-index-footer"><span>还不确定适合哪个套餐？</span><Link className="text-link" href="/guide">先查看购买说明 →</Link></div>
      </section>
    </main>
  );
}
