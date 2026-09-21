import type { ServicePolicy } from '@chonghub/core/modules/orders/contracts';

export interface CustomerServiceSettings {
  nickname: string;
  wechatId: string;
  qrPath: string;
}

export interface PublicSettings {
  policy: ServicePolicy;
  customerService: CustomerServiceSettings;
}
