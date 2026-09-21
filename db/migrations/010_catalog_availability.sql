ALTER TABLE skus ADD COLUMN IF NOT EXISTS availability text NOT NULL DEFAULT 'available';
ALTER TABLE skus ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'skus_availability_check') THEN
    ALTER TABLE skus ADD CONSTRAINT skus_availability_check CHECK (availability IN ('available', 'sold_out'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS skus_published_available_idx
  ON skus(product_id, status, availability, sort_order, price_cents);

CREATE TABLE IF NOT EXISTS catalog_availability_commands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_id uuid NOT NULL REFERENCES skus(id) ON DELETE CASCADE,
  idempotency_key text NOT NULL,
  availability text NOT NULL CHECK (availability IN ('available', 'sold_out')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sku_id, idempotency_key)
);
