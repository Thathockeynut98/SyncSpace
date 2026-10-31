CREATE SCHEMA IF NOT EXISTS app;
CREATE TABLE IF NOT EXISTS app.messages (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  space_id text NOT NULL,
  account_id bigint NOT NULL REFERENCES app.accounts(id),
  cipher text NOT NULL,
  iv text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS app_messages_space_created_idx ON app.messages(space_id, created_at, id);
