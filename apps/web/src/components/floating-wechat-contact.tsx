import Image from 'next/image';
import type { WechatContact } from './wechat-modal';

/** Native disclosure keeps the contact entry usable before JavaScript loads. */
export function FloatingWechatContact({ contact }: { contact: WechatContact }) {
  return (
    <details className="floating-wechat-contact" open>
      <summary className="floating-wechat-contact-toggle">
        <span>微信直接咨询</span>
        <span className="floating-wechat-contact-expand">展开</span>
        <span className="floating-wechat-contact-collapse">收起</span>
      </summary>
      <div className="floating-wechat-contact-panel">
        <Image src={contact.qrPath} alt={`扫码添加客服${contact.nickname}的微信`} width={220} height={275} sizes="200px" className="floating-wechat-contact-qr" />
        <div className="floating-wechat-contact-copy">
          <strong>扫码添加微信</strong>
          <span>客服：{contact.nickname}</span>
          <code>{contact.wechatId}</code>
          <a href="/guide#contact">查看服务时间与说明 →</a>
        </div>
      </div>
    </details>
  );
}
