ALTER TABLE screening_reports
  ADD COLUMN IF NOT EXISTS idempotency_key_digest text,
  ADD COLUMN IF NOT EXISTS body_digest text;

ALTER TABLE order_events
  ADD COLUMN IF NOT EXISTS idempotency_key_digest text,
  ADD COLUMN IF NOT EXISTS body_digest text;

CREATE UNIQUE INDEX IF NOT EXISTS screening_reports_order_idempotency_idx
  ON screening_reports(order_id, idempotency_key_digest)
  WHERE idempotency_key_digest IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS order_events_customer_message_idempotency_idx
  ON order_events(order_id, idempotency_key_digest)
  WHERE type = 'customer_message' AND idempotency_key_digest IS NOT NULL;
