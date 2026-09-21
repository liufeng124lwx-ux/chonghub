import Image from 'next/image';
import Link from 'next/link';
import { getPublicSettings } from '@chonghub/core/modules/settings/service';

export const metadata = { title: '购买说明' };
export const dynamic = 'force-dynamic';

export default async function GuidePage() {
  const { policy, customerService } = await getPublicSettings();
  return (
    <main className="content-page">
      <section className="container narrow-page">
        <span className="eyebrow">购买说明</span>
        <h1>先检测，再直接购买</h1>
        <p className="page-lede">ChongHub 当前采用浏览器检测、微信人工确认、人工收款与人工交付。网站负责展示商品、记录订单和同步进度。</p>
        <div className="guide-steps">
          <div><span>01</span><h2>进入商品页检测账号</h2><p>登录 ChatGPT 后打开会话信息页面，把 JSON 粘贴到商品页检测框。检测只在浏览器内进行，原文不会上传或保存。</p><p className="guide-links"><a href="https://chatgpt.com/" target="_blank" rel="noreferrer">打开 ChatGPT ↗</a><a href="https://chatgpt.com/api/auth/session" target="_blank" rel="noreferrer">获取会话信息 ↗</a></p></div>
          <div><span>02</span><h2>检测通过后立即购买</h2><p>选择套餐、填写联系邮箱并生成订单。游客无需注册或设置查询密码，后续查单使用订单号和邮箱验证码。</p></div>
          <div><span>03</span><h2>订单页添加微信</h2><p>订单生成后会自动提示客服微信。添加客服确认账号条件、最终报价、收款方式和交付时间。</p></div>
          <div><span>04</span><h2>人工交付与售后</h2><p>确认收款且资料齐全后，营业时间内 {policy.deliveryMinutes / 60} 个小时内完成。订单详情页会记录处理进度，售后也可以从订单内发起。</p></div>
        </div>
        <section className="guide-callout" id="contact"><div><span className="eyebrow">客服微信</span><h2>扫码添加「{customerService.nickname}」</h2><p>服务时间：北京时间 {policy.opensAt}–{policy.closesAt}<br />请在微信中发送商品名称和需求单号。</p><p className="wechat-id">微信标识：<code>{customerService.wechatId}</code></p></div><Image src={customerService.qrPath} alt={`客服${customerService.nickname}的微信二维码`} width={220} height={275} /></section>
        <section className="rules-block" id="after-sales"><span className="eyebrow">服务与售后</span><h2>你需要知道的规则</h2><div className="rule-list"><p><strong>受理范围</strong>当前仅支持无有效订阅的 ChatGPT 账号，订阅中的账号请等待订阅结束后重新校验。</p><p><strong>交付时效</strong>确认收款且资料齐全后，营业时间内累计 {policy.deliveryMinutes / 60} 个营业小时完成；非营业时间暂停计时、次日顺延。</p><p><strong>订阅保障</strong>充值成功后起算 {policy.warrantyDays} 个自然日。期间掉订阅，经核实后按用户实付金额与剩余保障时长计算退款，账号封禁不在保障范围内。</p><p><strong>支付方式</strong>当前不接入网站在线支付，具体付款方式由客服在微信中确认。</p></div></section>
        <p className="page-footer-link"><Link href="/terms">查看服务条款草案 →</Link></p>
      </section>
    </main>
  );
}
