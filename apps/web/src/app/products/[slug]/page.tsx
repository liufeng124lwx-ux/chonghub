import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublishedProduct } from '@chonghub/core/modules/catalog/service';
import { getPublicSettings } from '@chonghub/core/modules/settings/service';
import PurchaseFlow from '@/components/purchase-flow';
import { FloatingWechatContact } from '@/components/floating-wechat-contact';

export const dynamic = 'force-dynamic';
function money(cents: number) { return `¥${(cents / 100).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`; }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> { const product = await getPublishedProduct((await params).slug); return { title: product?.name ?? '商品详情' }; }

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const [product, settings] = await Promise.all([
    getPublishedProduct((await params).slug),
    getPublicSettings(),
  ]);
  if (!product) notFound();
  const isAccount = product.productType === 'account';
  return <main className="product-detail-page"><section className="container detail-hero"><Link className="back-link" href="/products">← 返回全部商品</Link><div className="detail-layout"><div><span className="eyebrow">{product.platform.name} · {isAccount ? '账号商品' : '会员充值'}</span><h1>{product.name}</h1><p className="detail-lede">{product.description}</p><div className="detail-notice"><span className="notice-icon">i</span><div><strong>当前受理范围</strong><p>{product.eligibilityText}</p></div></div><div className="detail-proof"><span>人工确认</span><span>{isAccount ? '规格与交付方式' : '账号状态初筛'}</span><span>营业时间内交付</span></div></div><div className="detail-side"><span>套餐起价</span><strong>{money(Math.min(...product.skus.map((sku) => sku.priceCents)))}</strong><small>人民币 · {isAccount ? '人工交付' : '服务套餐'}</small><a className="button button-primary" href="#purchase">{isAccount ? '提交需求并联系人工' : '检测账号并购买'} <span aria-hidden="true">→</span></a></div></div></section><section className="container detail-content"><div className="detail-main"><PurchaseFlow product={product} /><h2>服务说明</h2><div className="detail-points">{isAccount ? <><div><span>01</span><div><strong>人工确认规格</strong><p>下单后由客服确认地区、规格和可交付状态。</p></div></div><div><span>02</span><div><strong>人工收款与交付</strong><p>当前暂不接入在线支付，确认后通过微信完成收款和人工交付。</p></div></div></> : <><div><span>01</span><div><strong>先检测账号状态</strong><p>仅支持当前无有效订阅的账号，最终以客服人工复核为准。</p></div></div><div><span>02</span><div><strong>订单生成后微信确认</strong><p>网站暂不提供在线支付，订单生成后由客服确认条件、报价和交付安排。</p></div></div></>}</div></div><aside className="detail-aside"><div className="aside-card"><span className="eyebrow">售后说明</span><h3>{isAccount ? '人工售后' : '30 天订阅保障'}</h3><p>{product.skus[0]?.warrantyText ?? '具体售后规则以客服确认内容为准。'}</p><Link className="text-link" href="/guide#after-sales">查看售后规则 →</Link></div><div className="aside-card muted"><strong>还没决定？</strong><p>可以先查看完整购买说明，了解提交、检测和微信交付流程。</p><Link className="button button-secondary" href="/guide">查看购买说明</Link></div></aside></section><FloatingWechatContact contact={settings.customerService} /></main>;
}
