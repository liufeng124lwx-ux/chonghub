import type { NotificationSender } from './contracts';
import { createHmac } from 'node:crypto';

export const feishuSender: NotificationSender = {
  async send(type, payload) {
    const configured = process.env.FEISHU_WEBHOOK_URL;
    if (!configured) return;
    const url = new URL(configured);
    if (url.protocol !== 'https:' || !/(?:^|\.)((feishu|larksuite)\.cn)$/.test(url.hostname)) throw new Error('Feishu webhook host is not allowed');
    const timestamp = String(Math.floor(Date.now() / 1000));
    const body: Record<string, unknown> = { msg_type: 'text', content: { text: `[${type}] ChongHub 订单 ${String(payload.orderNumber ?? '')}` } };
    const secret = process.env.FEISHU_WEBHOOK_SECRET;
    if (secret) {
      body.timestamp = timestamp;
      body.sign = createHmac('sha256', `${timestamp}\n${secret}`).digest('base64');
    }
    const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), redirect: 'error' });
    if (!response.ok) throw new Error(`Feishu webhook HTTP ${response.status}`);
    const result = await response.json().catch(() => null) as { code?: number; StatusCode?: number } | null;
    if (result && result.code !== undefined && result.code !== 0) throw new Error(`Feishu webhook rejected event (${result.code})`);
  },
};
