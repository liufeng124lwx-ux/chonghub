import type { Metadata } from 'next';
import Link from 'next/link';
import { JsonLd, breadcrumbJsonLd } from '@/components/json-ld';
import { listPublishedArticles } from '@/lib/articles';
import { canonicalUrl, siteName, siteOgImageUrl } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'ChatGPT 充值与账号使用指南',
  description: '整理 ChatGPT 会员充值、账号状态、付款方式和资料安全问题，帮助你在提交需求前了解服务边界。',
  alternates: { canonical: canonicalUrl('/articles') },
  openGraph: {
    type: 'website', siteName, title: 'ChatGPT 充值与账号使用指南',
    description: '整理 ChatGPT 会员充值、账号状态、付款方式和资料安全问题，帮助你在提交需求前了解服务边界。',
    url: canonicalUrl('/articles'), images: [{ url: siteOgImageUrl, width: 1200, height: 630, alt: 'ChongHub 使用指南' }],
  },
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(value));
}

export default async function ArticlesPage() {
  const articles = await listPublishedArticles();
  return (
    <main className="content-page">
      <section className="container page-section article-index-page">
        <nav className="breadcrumbs" aria-label="面包屑"><Link href="/">首页</Link><span aria-hidden="true">/</span><span>使用指南</span></nav>
        <JsonLd data={breadcrumbJsonLd([{ name: '首页', url: canonicalUrl('/') }, { name: '使用指南', url: canonicalUrl('/articles') }])} />
        <span className="eyebrow">使用指南</span>
        <h1>ChatGPT 充值与账号问题使用指南</h1>
        <p className="page-lede">从账号条件、充值风险到资料边界，先了解可验证的流程，再决定是否提交需求。</p>
        <div className="article-index-grid">
          {articles.map((article) => (
            <article className="article-index-card" key={article.slug}>
              <span className="article-intent">{article.primaryIntent}</span>
              <h2><Link href={`/articles/${article.slug}`}>{article.title}</Link></h2>
              <p>{article.description}</p>
              <div className="article-index-meta"><span>更新于 {formatDate(article.updatedAt)}</span><Link className="text-link" href={`/articles/${article.slug}`}>阅读全文 →</Link></div>
            </article>
          ))}
        </div>
        <div className="article-index-cta"><span>已经确定要查看套餐？</span><Link className="text-link" href="/products">查看当前 ChatGPT 会员充值套餐 →</Link></div>
      </section>
    </main>
  );
}
