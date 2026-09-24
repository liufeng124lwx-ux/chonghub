import type { Metadata } from 'next';
import './globals.css';
import { SiteHeader } from '@/components/site-header';
import { JsonLd, organizationJsonLd } from '@/components/json-ld';
import { googleSiteVerification, siteLogoUrl, siteMetadata, siteName, siteOgImageUrl, siteUrl } from '@/lib/site-config';

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: { default: siteMetadata.title, template: '%s | ChongHub' },
  description: siteMetadata.description,
  keywords: siteMetadata.keywords,
  applicationName: siteName,
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    siteName,
    title: siteMetadata.title,
    description: siteMetadata.description,
    url: siteUrl.toString(),
    images: [{ url: siteOgImageUrl, width: 1200, height: 630, alt: 'ChongHub ChatGPT 会员充值服务' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteMetadata.title,
    description: siteMetadata.description,
    images: [siteOgImageUrl],
  },
  verification: { google: googleSiteVerification },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <SiteHeader />
        <JsonLd data={organizationJsonLd({ name: siteName, url: siteUrl.toString(), logo: siteLogoUrl })} />
        {children}
        <footer className="site-footer">
          <div className="container footer-inner">
            <div><strong>ChongHub</strong><p>专注数字服务的人工履约体验</p></div>
            <div className="footer-links"><a href="/guide">购买说明</a><a href="/privacy">隐私说明</a><a href="/terms">服务条款</a></div>
            <small>© {new Date().getFullYear()} ChongHub. 当前服务规则以购买说明、商品详情与订单确认内容为准。</small>
          </div>
        </footer>
      </body>
    </html>
  );
}
