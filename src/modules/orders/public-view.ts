import type { OrderSnapshot, PublicOrder } from './contracts';

export interface OrderRow {
  id: string;
  number: string;
  snapshot: OrderSnapshot;
  quoted_price_cents: number | null;
  payment_status: PublicOrder['paymentStatus'];
  delivery_status: PublicOrder['deliveryStatus'];
  screening_status: PublicOrder['screeningStatus'];
  due_at: Date | string | null;
  completed_at: Date | string | null;
  warranty_ends_at: Date | string | null;
  refund_cents: number;
  version: number;
}

export function mapPublicOrder(row: OrderRow, timeline: PublicOrder['timeline'] = []): PublicOrder {
  return {
    number: row.number,
    snapshot: row.snapshot,
    quotedPriceCents: row.quoted_price_cents,
    paymentStatus: row.payment_status,
    deliveryStatus: row.delivery_status,
    screeningStatus: row.screening_status,
    dueAt: row.due_at ? new Date(row.due_at).toISOString() : null,
    completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null,
    warrantyEndsAt: row.warranty_ends_at ? new Date(row.warranty_ends_at).toISOString() : null,
    refundCents: row.refund_cents,
    timeline,
    version: row.version,
  };
}
