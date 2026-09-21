'use client';

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="state-page"><div className="state-card"><span className="eyebrow">暂时无法访问</span><h1>服务正在准备中</h1><p>商品数据暂时不可用，请稍后重试。</p><button className="button button-primary" onClick={() => reset()}>重新加载</button></div></main>;
}
