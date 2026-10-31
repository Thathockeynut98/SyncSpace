CREATE SCHEMA IF NOT EXISTS app;
CREATE TABLE IF NOT EXISTS app.accounts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS app.sessions (
  token_hash text PRIMARY KEY,
  account_id bigint NOT NULL REFERENCES app.accounts(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_account_id_idx ON app.sessions(account_id);
