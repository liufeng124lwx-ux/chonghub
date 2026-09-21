import type { PoolClient } from 'pg';

export const notificationTypes = [
  'otp', 'request_created', 'screening_passed', 'customer_message',
  'delivery_completed', 'after_sale_opened', 'after_sale_resolved',
] as const;
export type NotificationType = typeof notificationTypes[number];
export type NotificationChannel = 'email' | 'feishu';

export interface EnqueueEventInput {
  dedupeKey: string;
  channel: NotificationChannel;
  type: NotificationType;
  payload: Record<string, unknown>;
}

export interface NotificationSender {
  send(type: NotificationType, payload: Record<string, unknown>, channel: NotificationChannel): Promise<void>;
}

export type OutboxClient = Pick<PoolClient, 'query'>;
