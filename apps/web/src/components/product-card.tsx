import Link from 'next/link';
import type { ProductView } from '@chonghub/core/modules/catalog/contracts';

function money(cents: number) {
  return `¥${(cents / 100).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function ProductCard({ product }: { product: ProductView }) {
  const lowest = Math.min(...product.skus.map((sku) => sku.priceCents));
  const soldOut = product.skus.every((sku) => !sku.isPurchasable);
  const featured = product.slug.includes('pro-5x');
  return (
    <article className={`product-card${featured ? ' product-card-featured' : ''}`}>
      {featured ? <span className="product-ribbon">高频使用推荐</span> : null}
      <div className="product-card-top">
        <span className="product-type-badge">{product.platform.name} · {product.productType === 'account' ? '账号商品' : '会员充值'}</span>
        <span className="eyebrow">{product.productType === 'account' ? '人工账号商品' : (featured ? '热门套餐' : '人工充值')}</span>
        <span className="product-dot" aria-hidden="true" />
      </div>
      <h3>{product.name}</h3>
      <p>{product.description}</p>
      <ul className="product-features" aria-label="服务包含内容">
        <li>{product.screening === 'gpt_session' ? '浏览器内完成账号状态初筛' : '客服人工确认商品规格'}</li>
        <li>客服人工确认条件与最终报价</li>
        <li>确认收款后，营业时间内 2 小时内交付</li>
      </ul>
      <div className="product-price"><span>起</span>{money(lowest)}<small> / {product.productType === 'account' ? '件' : '月卡'}</small></div>
      <div className="product-meta"><span>{product.screening === 'gpt_session' ? '账号状态初筛' : '人工确认规格'}</span><span>人工确认交付</span>{soldOut && <span>暂时售罄</span>}</div>
      <Link className="button button-secondary" href={`/products/${product.slug}`}>查看套餐详情 <span aria-hidden="true">→</span></Link>
    </article>
  );
}
