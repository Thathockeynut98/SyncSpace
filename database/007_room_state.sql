CREATE TABLE IF NOT EXISTS app.room_state (
 space_id text PRIMARY KEY, data jsonb NOT NULL DEFAULT '{}'::jsonb
);
