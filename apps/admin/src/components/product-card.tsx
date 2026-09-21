import Link from 'next/link';
import type { ProductView } from '@chonghub/core/modules/catalog/contracts';

function money(cents: number) {
  return `¥${(cents / 100).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function ProductCard({ product }: { product: ProductView }) {
  const lowest = Math.min(...product.skus.map((sku) => sku.priceCents));
  const featured = product.slug.includes('pro-5x');
  return (
    <article className={`product-card${featured ? ' product-card-featured' : ''}`}>
      {featured ? <span className="product-ribbon">高频使用推荐</span> : null}
      <div className="product-card-top">
        <span className="eyebrow">{featured ? '热门套餐' : '人工充值'}</span>
        <span className="product-dot" aria-hidden="true" />
      </div>
      <h3>{product.name}</h3>
      <p>{product.description}</p>
      <ul className="product-features" aria-label="服务包含内容">
        <li>浏览器内完成账号状态初筛</li>
        <li>客服人工确认条件与最终报价</li>
        <li>确认收款后，营业时间内 2 小时内交付</li>
      </ul>
      <div className="product-price"><span>起</span>{money(lowest)}<small> / 月卡</small></div>
      <div className="product-meta"><span>免费状态账号初筛</span><span>人工确认交付</span></div>
      <Link className="button button-secondary" href={`/products/${product.slug}`}>查看套餐详情 <span aria-hidden="true">→</span></Link>
    </article>
  );
}
