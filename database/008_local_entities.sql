CREATE TABLE IF NOT EXISTS app.local_entities (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), space_id text NOT NULL,
 entity_type text NOT NULL, account_id bigint NOT NULL REFERENCES app.accounts(id),
 data jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS local_entities_space_type ON app.local_entities(space_id,entity_type);
