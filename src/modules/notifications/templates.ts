import type { NotificationType } from './contracts';

export function renderEmail(type: NotificationType, payload: Record<string, unknown>): { subject: string; text: string } {
  const number = typeof payload.orderNumber === 'string' ? payload.orderNumber : '';
  switch (type) {
    case 'otp': return { subject: 'ChongHub 登录验证码', text: `你的验证码是 ${String(payload.code ?? '')}，10分钟内有效。` };
    case 'request_created': return { subject: `需求单 ${number} 已提交`, text: `需求单 ${number} 已提交，请按页面提示完成账号状态初筛并添加微信客服。` };
    case 'screening_passed': return { subject: `需求单 ${number} 初筛通过`, text: `需求单 ${number} 初筛通过，请添加微信客服确认最终报价和交付。` };
    case 'customer_message': return { subject: `需求单 ${number} 有新补充`, text: `需求单 ${number} 有新的客户补充，请登录网站查看。` };
    case 'delivery_completed': return { subject: `需求单 ${number} 已完成`, text: `需求单 ${number} 已完成，请登录网站查看交付和售后说明。` };
    case 'after_sale_opened': return { subject: `需求单 ${number} 售后已提交`, text: `需求单 ${number} 的售后申请已提交，我们会尽快处理。` };
    case 'after_sale_resolved': return { subject: `需求单 ${number} 售后有更新`, text: `需求单 ${number} 的售后状态有更新，请登录网站查看。` };
  }
}
