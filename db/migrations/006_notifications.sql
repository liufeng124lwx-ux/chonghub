CREATE INDEX IF NOT EXISTS outbox_retry_idx ON outbox(state, available_at, leased_until, attempts);
CREATE INDEX IF NOT EXISTS order_events_customer_idx ON order_events(order_id, visibility, created_at);
CREATE INDEX IF NOT EXISTS after_sales_order_idx ON after_sales(order_id, created_at DESC);
