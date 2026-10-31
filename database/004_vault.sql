CREATE SCHEMA IF NOT EXISTS app;
CREATE TABLE IF NOT EXISTS app.space_vaults (
  space_id text PRIMARY KEY,
  version integer NOT NULL DEFAULT 1,
  kdf_salt text NOT NULL,
  wrap_iv text NOT NULL,
  wrapped_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS app.vault_items (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  space_id text NOT NULL REFERENCES app.space_vaults(space_id),
  account_id bigint NOT NULL REFERENCES app.accounts(id),
  kind text NOT NULL CHECK (kind IN ('note','memory','file','photo','audio','canvas','other')),
  iv text NOT NULL,
  cipher text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vault_items_space_idx ON app.vault_items(space_id,created_at,id);
