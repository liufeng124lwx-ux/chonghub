'use client';

import { useState } from 'react';
import { WechatModal, type WechatContact } from './wechat-modal';

export default function OrderWechatActions({ contact, autoOpen = false }: { contact: WechatContact; autoOpen?: boolean }) {
  const [open, setOpen] = useState(autoOpen);
  return <><div className="order-wechat-action"><button className="button button-primary" type="button" onClick={() => setOpen(true)}>查看微信交付说明</button><span>订单已生成，请添加客服完成人工确认</span></div><WechatModal contact={contact} open={open} onClose={() => setOpen(false)} /></>;
}
