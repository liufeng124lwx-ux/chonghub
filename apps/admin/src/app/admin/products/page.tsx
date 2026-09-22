import { listAdminProducts } from '@chonghub/core/modules/catalog/service';
import { AdminProductCreateForm, AdminProductEditor } from '@/components/admin-product-editor';

export const dynamic = 'force-dynamic';

export default async function AdminProductsPage() {
  const products = await listAdminProducts();
  const published = products.filter((product) => product.status === 'published').length;
  const drafts = products.filter((product) => product.status === 'draft').length;
  const archived = products.filter((product) => product.status === 'unlisted').length;
  return <main className="content-page"><section className="container admin-products-page">
    <header className="admin-products-hero"><div><span className="eyebrow">商品管理</span><h1>商品目录</h1><p className="page-lede">这里管理公开目录里的商品、套餐价格和售卖状态。历史订单使用创建时快照，不会被后续编辑改写。</p></div><div className="admin-products-summary"><div><strong>{published}</strong><span>已上架</span></div><div><strong>{drafts}</strong><span>草稿</span></div><div><strong>{archived}</strong><span>已归档</span></div></div></header>
    <AdminProductCreateForm />
    <div className="admin-catalog-heading"><div><span className="eyebrow">全部商品</span><h2>目录状态</h2></div><p>售罄只影响对应套餐；归档用于替代删除，保证订单记录完整。</p></div>
    <div className="admin-product-list">{products.length === 0 ? <div className="empty-card"><strong>还没有商品</strong><p>用上方表单创建第一个商品。</p></div> : products.map((product) => <AdminProductEditor key={product.id} product={product} />)}</div>
  </section></main>;
}
