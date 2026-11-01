-- Matches the uploaded Windows API contract. Never populate or alter restored mappings.
CREATE TABLE IF NOT EXISTS app.shared_spaces (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL,
 invite_code text NOT NULL UNIQUE, created_by bigint NOT NULL REFERENCES app.accounts(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS app.shared_space_members (
 space_id uuid NOT NULL REFERENCES app.shared_spaces(id),
 account_id bigint NOT NULL REFERENCES app.accounts(id), display_name text NOT NULL,
 joined_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(space_id,account_id),
 UNIQUE(account_id)
);
CREATE TABLE IF NOT EXISTS app.legacy_space_mappings (
 legacy_space_id text PRIMARY KEY, local_space_id uuid NOT NULL UNIQUE REFERENCES app.shared_spaces(id)
);
