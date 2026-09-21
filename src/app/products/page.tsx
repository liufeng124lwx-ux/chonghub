import Link from 'next/link';
import { ProductCard } from '@/components/product-card';
import { listPublishedProducts } from '@/modules/catalog/service';

export const dynamic = 'force-dynamic';
export const metadata = { title: '产品与套餐' };

export default async function ProductsPage() {
  const products = await listPublishedProducts();
  return (
    <main className="content-page">
      <section className="container products-index-page">
        <div className="section-heading"><div><span className="eyebrow">产品与套餐</span><h1>选择你的 ChatGPT 月卡</h1></div><p>价格以后台实时配置为准<br />人工确认后再付款</p></div>
        <div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div>
        <div className="products-index-footer"><span>还不确定适合哪个套餐？</span><Link className="text-link" href="/guide">先查看购买说明 →</Link></div>
      </section>
    </main>
  );
}
