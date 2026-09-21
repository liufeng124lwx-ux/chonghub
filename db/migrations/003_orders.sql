CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text NOT NULL UNIQUE,
  sku_id uuid NOT NULL REFERENCES skus(id),
  owner_user_id uuid REFERENCES users(id),
  contact_email text NOT NULL,
  guest_password_digest text,
  snapshot jsonb NOT NULL,
  quoted_price_cents integer CHECK (quoted_price_cents IS NULL OR quoted_price_cents >= 0),
  payment_status text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'partial_refund', 'refunded')),
  delivery_status text NOT NULL DEFAULT 'pending_confirmation' CHECK (delivery_status IN ('pending_confirmation', 'pending', 'needs_info', 'processing', 'completed', 'cancelled')),
  screening_status text NOT NULL DEFAULT 'unchecked' CHECK (screening_status IN ('unchecked', 'passed', 'subscribed', 'invalid', 'unknown')),
  due_at timestamptz,
  ready_at timestamptz,
  completed_at timestamptz,
  warranty_ends_at timestamptz,
  refund_cents integer NOT NULL DEFAULT 0 CHECK (refund_cents >= 0),
  version integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS create_keys (
  actor_scope text NOT NULL,
  key text NOT NULL,
  body_digest text NOT NULL,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (actor_scope, key)
);

CREATE TABLE IF NOT EXISTS order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  type text NOT NULL,
  message text NOT NULL,
  visibility text NOT NULL DEFAULT 'customer' CHECK (visibility IN ('customer', 'internal')),
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS screening_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('passed', 'subscribed', 'invalid', 'unknown')),
  plan_type text NOT NULL CHECK (plan_type IN ('free', 'prolite', 'unknown')),
  reason text NOT NULL,
  rule_version integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE guest_grants ADD CONSTRAINT guest_grants_order_fk FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS orders_owner_idx ON orders(owner_user_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS orders_email_idx ON orders(contact_email, created_at DESC);
