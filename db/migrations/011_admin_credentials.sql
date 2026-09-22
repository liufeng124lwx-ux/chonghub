-- Administrator credentials are separate from the public email/OTP identity.
-- Keep the existing admin_identity row as the authorization source and attach
-- one credential record to that identity. Passwords are stored only as the
-- encoded scrypt digest produced by the application.
CREATE TABLE IF NOT EXISTS admin_credentials (
  user_id uuid PRIMARY KEY REFERENCES admin_identity(user_id) ON DELETE CASCADE,
  username text NOT NULL,
  password_digest text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_credentials_username_format CHECK (username ~ '^[a-z0-9][a-z0-9_.-]{2,63}$'),
  CONSTRAINT admin_credentials_password_digest_not_plaintext CHECK (password_digest LIKE 'scrypt$%')
);

CREATE UNIQUE INDEX IF NOT EXISTS admin_credentials_username_unique_idx
  ON admin_credentials (lower(username));

CREATE INDEX IF NOT EXISTS admin_credentials_updated_idx
  ON admin_credentials (updated_at DESC);
