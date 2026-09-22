CREATE TABLE IF NOT EXISTS catalog_commands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  action text NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  body_digest text NOT NULL,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
