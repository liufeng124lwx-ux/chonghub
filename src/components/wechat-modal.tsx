'use client';

import Image from 'next/image';
import { useEffect } from 'react';

export interface WechatContact {
  nickname: string;
  wechatId: string;
  qrPath: string;
}

export function WechatModal({ contact, open, onClose }: { contact: WechatContact; open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;
  return <div className="wechat-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="wechat-modal" role="dialog" aria-modal="true" aria-labelledby="wechat-modal-title">
      <button className="wechat-modal-close" type="button" aria-label="关闭微信提示" onClick={onClose}>×</button>
      <span className="eyebrow">人工交付</span>
      <h2 id="wechat-modal-title">加微信完成交付</h2>
      <p>订单已经生成，请把订单号发给客服确认报价和后续交付。你可以关闭此窗口，稍后在订单页再次打开。</p>
      <Image src={contact.qrPath} alt={`客服${contact.nickname}的微信二维码`} width={220} height={275} className="wechat-modal-qr" />
      <p className="wechat-modal-id">微信号：<code>{contact.wechatId}</code></p>
      <button className="button button-primary" type="button" onClick={onClose}>稍后再加</button>
    </section>
  </div>;
}
