import 'server-only';
import { query } from '@/server/db';
import { withTransaction } from '@/server/db';
import type { PublicSettings } from './contracts';
import { assertValidServicePolicy } from '@/modules/fulfillment/guards';
import { AppError } from '@/server/errors';

const fallback: PublicSettings = {
  policy: { version: 1, zone: 'Asia/Shanghai', opensAt: '09:30', closesAt: '23:00', deliveryMinutes: 120, warrantyDays: 30, termsVersion: 'draft-v1' },
  customerService: { nickname: '流风', wechatId: 'wxid_7ccixhrr9gtk22', qrPath: '/images/customer-service-wechat.jpg' },
};

export async function getPublicSettings(): Promise<PublicSettings> {
  const result = await query<{ key: string; value: unknown }>(`SELECT key, value FROM site_settings WHERE key IN ('service_policy', 'customer_service')`);
  const values = new Map(result.rows.map((row) => [row.key, row.value]));
  const policy = values.get('service_policy');
  const customerService = values.get('customer_service');
  if (policy && typeof policy === 'object') assertValidServicePolicy(policy as PublicSettings['policy']);
  return {
    policy: (policy as PublicSettings['policy']) ?? fallback.policy,
    customerService: isCustomerService(customerService) ? customerService : fallback.customerService,
  };
}

export async function updatePublicSettings(input: Partial<PublicSettings['policy']> & { nickname?: string; wechatId?: string; qrPath?: string }): Promise<void> {
  const current = await getPublicSettings();
  const policyFields = Object.fromEntries(Object.entries(input).filter(([key, value]) => (
    value !== undefined && ['zone', 'opensAt', 'closesAt', 'deliveryMinutes', 'warrantyDays', 'termsVersion'].includes(key)
  )));
  const policy = { ...current.policy, ...policyFields, version: Object.keys(policyFields).length > 0 ? current.policy.version + 1 : current.policy.version } as PublicSettings['policy'];
  try {
    assertValidServicePolicy(policy);
  } catch {
    throw new AppError('INVALID_REQUEST', '营业时间、交付时效、保障天数或条款版本无效。');
  }
  const customerService = {
    ...current.customerService,
    ...Object.fromEntries(Object.entries(input).filter(([key, value]) => (
      value !== undefined && ['nickname', 'wechatId', 'qrPath'].includes(key)
    ))),
  };
  assertCustomerService(customerService);
  await withTransaction(async (client) => {
    await client.query(`INSERT INTO site_settings (key,value) VALUES ('service_policy',$1::jsonb) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value,revision=site_settings.revision+1,updated_at=now()`, [JSON.stringify(policy)]);
    await client.query(`INSERT INTO site_settings (key,value) VALUES ('customer_service',$1::jsonb) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value,revision=site_settings.revision+1,updated_at=now()`, [JSON.stringify(customerService)]);
  });
}

function assertCustomerService(value: PublicSettings['customerService']): void {
  if (value.nickname.trim().length === 0 || value.nickname.length > 40) throw new AppError('INVALID_REQUEST', '客服昵称长度无效。');
  if (value.wechatId.trim().length === 0 || value.wechatId.length > 100) throw new AppError('INVALID_REQUEST', '微信号长度无效。');
  if (value.qrPath.length === 0 || value.qrPath.length > 500 || !value.qrPath.startsWith('/') || /[\r\n]/.test(value.qrPath)) throw new AppError('INVALID_REQUEST', '二维码路径无效。');
}

function isCustomerService(value: unknown): value is PublicSettings['customerService'] {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return typeof item.nickname === 'string' && typeof item.wechatId === 'string' && typeof item.qrPath === 'string';
}
