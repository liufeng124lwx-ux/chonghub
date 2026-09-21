-- Keep refund retries idempotent without storing the raw client key.
ALTER TABLE refunds
  ADD COLUMN IF NOT EXISTS idempotency_key_digest text,
  ADD COLUMN IF NOT EXISTS body_digest text;

ALTER TABLE after_sales
  ADD COLUMN IF NOT EXISTS idempotency_key_digest text,
  ADD COLUMN IF NOT EXISTS body_digest text;

CREATE UNIQUE INDEX IF NOT EXISTS after_sales_order_idempotency_idx
  ON after_sales(order_id, idempotency_key_digest)
  WHERE idempotency_key_digest IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS refunds_after_sale_idempotency_idx
  ON refunds(after_sale_id, idempotency_key_digest)
  WHERE idempotency_key_digest IS NOT NULL;

CREATE INDEX IF NOT EXISTS refunds_after_sale_loss_idx
  ON refunds(after_sale_id, verified_loss_at);
