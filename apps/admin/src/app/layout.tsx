import type { Metadata } from 'next';
import './globals.css';
import { SiteHeader } from '@/components/site-header';

export const metadata: Metadata = {
  title: { default: 'ChongHub · 专业会员充值服务', template: '%s · ChongHub' },
  description: '为已有 ChatGPT 账号提供人工会员充值服务。',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <SiteHeader />
        {children}
        <footer className="site-footer">
          <div className="container footer-inner">
            <div><strong>ChongHub</strong><p>专注数字服务的人工履约体验</p></div>
            <div className="footer-links"><a href="/guide">购买说明</a><a href="/privacy">隐私说明</a><a href="/terms">服务条款</a></div>
            <small>© {new Date().getFullYear()} ChongHub. 服务条款处于草案阶段。</small>
          </div>
        </footer>
      </body>
    </html>
  );
}
