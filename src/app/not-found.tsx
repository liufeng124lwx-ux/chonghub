import Link from 'next/link';

export default function NotFound() {
  return <main className="state-page"><div className="state-card"><span className="eyebrow">404</span><h1>页面不存在</h1><p>这项服务可能已下架，或者链接已经失效。</p><Link className="button button-primary" href="/">返回首页</Link></div></main>;
}
