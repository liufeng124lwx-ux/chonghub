import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArticleMarkdown, ArticleMeta, ArticleRelatedLinks } from '@/components/article-layout';
import { JsonLd, articleJsonLd, breadcrumbJsonLd } from '@/components/json-ld';
import { getPublishedArticle, listPublishedArticles } from '@/lib/articles';
import { canonicalUrl, siteLogoUrl, siteName, siteOgImageUrl, siteUrl } from '@/lib/site-config';

export const dynamicParams = false;

export async function generateStaticParams() {
  const articles = await listPublishedArticles();
  return articles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = await getPublishedArticle(slug);
  if (!article) return { title: '文章不存在', robots: { index: false, follow: false } };
  const url = canonicalUrl(`/articles/${article.slug}`);
  return {
    title: article.title,
    description: article.description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article', siteName, title: article.title, description: article.description, url,
      publishedTime: article.publishedAt, modifiedTime: article.updatedAt,
      authors: [article.author], images: [{ url: siteOgImageUrl, width: 1200, height: 630, alt: `${article.title} · ${siteName}` }],
    },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getPublishedArticle(slug);
  if (!article) notFound();
  const articleUrl = canonicalUrl(`/articles/${article.slug}`);
  return (
    <main className="content-page">
      <article className="container article-detail-page">
        <nav className="breadcrumbs" aria-label="面包屑"><Link href="/">首页</Link><span aria-hidden="true">/</span><Link href="/articles">使用指南</Link><span aria-hidden="true">/</span><span>{article.title}</span></nav>
        <JsonLd data={breadcrumbJsonLd([{ name: '首页', url: canonicalUrl('/') }, { name: '使用指南', url: canonicalUrl('/articles') }, { name: article.title, url: articleUrl }])} />
        <JsonLd data={articleJsonLd({ headline: article.title, description: article.description, url: articleUrl, image: siteOgImageUrl, publishedAt: article.publishedAt, updatedAt: article.updatedAt, author: article.author, publisher: { name: siteName, url: siteUrl.toString(), logo: siteLogoUrl } })} />
        <header className="article-detail-header">
          <span className="eyebrow">{article.primaryIntent}</span>
          <h1>{article.title}</h1>
          <p className="page-lede">{article.description}</p>
          <ArticleMeta article={article} />
        </header>
        <ArticleMarkdown body={article.body} />
        <ArticleRelatedLinks article={article} />
        <p className="article-back-link"><Link className="text-link" href="/articles">← 返回使用指南</Link></p>
      </article>
    </main>
  );
}
