import Link from 'next/link';
import type { Metadata } from 'next';
import { JsonLd, breadcrumbJsonLd } from '@/components/json-ld';
import { canonicalUrl, siteName, siteOgImageUrl } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'ChatGPT 账号状态检测',
  description: '在浏览器内初步检查 ChatGPT 账号订阅状态，原始会话内容不会上传或保存。',
  alternates: { canonical: canonicalUrl('/screening') },
  openGraph: {
    type: 'website', siteName, title: 'ChatGPT 账号状态检测',
    description: '在浏览器内初步检查 ChatGPT 账号订阅状态，原始会话内容不会上传或保存。',
    url: canonicalUrl('/screening'), images: [{ url: siteOgImageUrl, width: 1200, height: 630, alt: 'ChatGPT 账号状态检测' }],
  },
};

export default function ScreeningEntryPage() {
  return (
    <main className="content-page">
      <section className="container narrow-page">
        <nav className="breadcrumbs" aria-label="面包屑"><Link href="/">首页</Link><span aria-hidden="true">/</span><span>账号检测</span></nav>
        <JsonLd data={breadcrumbJsonLd([{ name: '首页', url: canonicalUrl('/') }, { name: '账号检测', url: canonicalUrl('/screening') }])} />
        <span className="eyebrow">账号检测</span>
        <h1>在浏览器内检查 ChatGPT 账号状态</h1>
        <p className="page-lede">我们不接收、不保存 ChatGPT 会话原文。打开 ChatGPT 会话接口，把 JSON 粘贴到商品页检测框，由你的浏览器本地判断是否处于订阅中。</p>
        <div className="entry-card screening-intro-card">
          <h2>先检测，再购买</h2>
          <p>检测通过后再选择套餐、填写邮箱并生成订单。检测结果只是初步受理依据，不代表付款或交付承诺。</p>
          <div className="entry-actions">
            <Link className="button button-primary" href="/products/chatgpt-plus#purchase">检测 ChatGPT Plus</Link>
            <Link className="button button-secondary" href="/guide#screening">查看操作说明</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
