-- SyncSpace migration staging schema (non-destructive)
-- Stores complete original Base44 rows without altering encrypted fields.
CREATE SCHEMA IF NOT EXISTS migration;
CREATE TABLE IF NOT EXISTS migration.imported_records (
  entity_type text NOT NULL,
  source_id text NOT NULL,
  original_row jsonb NOT NULL,
  imported_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (entity_type, source_id)
);
CREATE TABLE IF NOT EXISTS migration.import_batches (
  batch_id bigserial PRIMARY KEY,
  entity_type text NOT NULL,
  source_filename text NOT NULL,
  imported_count integer NOT NULL,
  imported_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_imported_records_space
  ON migration.imported_records ((original_row->>'space_id'));
-- User CSV has no source id; importer derives stable ID from email.
-- This is a staging layer only, not the final normalized application schema.
