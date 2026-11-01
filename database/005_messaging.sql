-- Additive only: legacy records and existing message ciphertext stay unchanged.
ALTER TABLE app.messages ADD COLUMN IF NOT EXISTS client_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS messages_client_id_idx
  ON app.messages(account_id, client_id) WHERE client_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS app.message_reactions (
  space_id text NOT NULL,
  message_id text NOT NULL,
  account_id bigint NOT NULL REFERENCES app.accounts(id) ON DELETE CASCADE,
  emoji text NOT NULL CHECK (emoji IN ('❤️','👍','😂','😮','😢','🎉')),
  PRIMARY KEY(space_id, message_id, account_id, emoji)
);
CREATE TABLE IF NOT EXISTS app.message_pins (
  space_id text NOT NULL,
  message_id text NOT NULL,
  account_id bigint NOT NULL REFERENCES app.accounts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(space_id, message_id)
);
