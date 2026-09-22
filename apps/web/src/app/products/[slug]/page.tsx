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
  return <main className="product-detail-page"><section className="container detail-hero"><Link className="back-link" href="/products">← 返回全部套餐</Link><div className="detail-layout"><div><span className="eyebrow">ChatGPT 人工充值</span><h1>{product.name}</h1><p className="detail-lede">{product.description}</p><div className="detail-notice"><span className="notice-icon">i</span><div><strong>当前受理范围</strong><p>{product.eligibilityText}</p></div></div></div><div className="detail-side"><span>套餐起价</span><strong>{money(Math.min(...product.skus.map((sku) => sku.priceCents)))}</strong><small>人民币 / 月卡</small><a className="button button-primary" href="#purchase">检测账号并购买 <span aria-hidden="true">→</span></a></div></div></section><section className="container detail-content"><div className="detail-main"><PurchaseFlow product={product} /><h2>服务说明</h2><div className="detail-points"><div><span>01</span><div><strong>先检测账号状态</strong><p>仅支持当前无有效订阅的账号。检测结果只作为初步受理依据，最终以客服人工复核为准。</p></div></div><div><span>02</span><div><strong>订单生成后微信确认</strong><p>网站暂不提供在线支付。订单生成后会直接进入订单页，并弹出客服微信，确认适用条件、报价和交付安排。</p></div></div><div><span>03</span><div><strong>资料齐全后 2 小时内交付</strong><p>服务时间为北京时间 09:30–23:00，确认收款且资料齐全后，营业时间内累计 2 小时内完成。</p></div></div></div></div><aside className="detail-aside"><div className="aside-card"><span className="eyebrow">售后保障</span><h3>30 天订阅保障</h3><p>充值成功后起算 30 个自然日。期间掉订阅，经核实后按剩余保障时长计算退款；账号封禁不在保障范围内。</p><Link className="text-link" href="/guide#after-sales">查看售后规则 →</Link></div><div className="aside-card muted"><strong>还没决定？</strong><p>可以先查看完整购买说明，了解提交、检测和微信交付流程。</p><Link className="button button-secondary" href="/guide">查看购买说明</Link></div></aside></section><FloatingWechatContact contact={settings.customerService} /></main>;
}
