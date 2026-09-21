import { listPublishedProducts } from '@/modules/catalog/service';
import { AdminProductEditor } from '@/components/admin-product-editor';
export const dynamic='force-dynamic';
export default async function AdminProductsPage(){const products=await listPublishedProducts();return <main className="content-page"><section className="container narrow-page"><span className="eyebrow">商品管理</span><h1>已上架套餐</h1><p className="page-lede">价格可由管理员编辑，历史订单保留创建时快照。</p><div className="order-list">{products.map((product)=><AdminProductEditor key={product.id} product={product} />)}</div></section></main>}
