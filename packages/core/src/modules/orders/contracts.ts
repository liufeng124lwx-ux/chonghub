/**
 * Shared domain contracts used by the request, screening and fulfillment
 * modules. Monetary values are always integer CNY cents.
 */

export type Money = number;

export type Actor =
  | { kind: 'user'; userId: string }
  | { kind: 'guest'; orderId: string; grantVersion: number }
  | { kind: 'admin'; userId: string };

export type PaymentStatus = 'unpaid' | 'paid' | 'partial_refund' | 'refunded';

export type DeliveryStatus =
  | 'pending_confirmation'
  | 'pending'
  | 'needs_info'
  | 'processing'
  | 'completed'
  | 'cancelled';

export type ScreeningStatus =
  | 'unchecked'
  | 'passed'
  | 'subscribed'
  | 'invalid'
  | 'unknown';

export interface ServicePolicy {
  version: number;
  zone: 'Asia/Shanghai';
  opensAt: string;
  closesAt: string;
  deliveryMinutes: number;
  warrantyDays: number;
  termsVersion: string;
}

export interface CreateRequestInput {
  skuId: string;
  contactEmail: string;
  declaredSubscription: 'free' | 'subscribed' | 'unknown';
  note: string;
}

export interface OrderSnapshot {
  productType: 'recharge' | 'account';
  platform: { slug: string; name: string };
  productName: string;
  skuName: string;
  displayPriceCents: Money;
  eligibilityText: string;
  warrantyText: string;
  screening: 'gpt_session' | 'none';
  policy: ServicePolicy;
}

export interface PublicOrder {
  number: string;
  snapshot: OrderSnapshot;
  quotedPriceCents: Money | null;
  paymentStatus: PaymentStatus;
  deliveryStatus: DeliveryStatus;
  screeningStatus: ScreeningStatus;
  dueAt: string | null;
  completedAt: string | null;
  warrantyEndsAt: string | null;
  refundCents: Money;
  timeline: Array<{ at: string; message: string }>;
  version: number;
}
