ALTER TABLE products ADD COLUMN IF NOT EXISTS product_type text NOT NULL DEFAULT 'recharge';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_product_type_check') THEN
    ALTER TABLE products ADD CONSTRAINT products_product_type_check CHECK (product_type IN ('recharge', 'account'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS products_type_status_idx ON products(product_type, status, sort_order, name);
