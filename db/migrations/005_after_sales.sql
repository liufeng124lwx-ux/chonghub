CREATE TABLE IF NOT EXISTS after_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('subscription_lost', 'delivery_issue', 'other')),
  description text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'resolved', 'closed')),
  version integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS after_sales_one_open_idx ON after_sales(order_id) WHERE status IN ('open', 'reviewing');

CREATE TABLE IF NOT EXISTS attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  after_sale_id uuid NOT NULL REFERENCES after_sales(id) ON DELETE CASCADE,
  storage_key text NOT NULL UNIQUE,
  mime text NOT NULL,
  bytes integer NOT NULL,
  uploaded_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  after_sale_id uuid NOT NULL REFERENCES after_sales(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  refunded_at timestamptz NOT NULL,
  reference text NOT NULL,
  verified_loss_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS compensations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  after_sale_id uuid NOT NULL REFERENCES after_sales(id) ON DELETE CASCADE,
  amount_cents integer NOT NULL CHECK (amount_cents >= 0),
  compensated_at timestamptz NOT NULL,
  reference text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
