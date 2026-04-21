-- Migration: 011_sync_step_log
-- Adds a per-step audit table so we can see WHICH game failed at WHICH step of
-- the sync pipeline. Rows are written by the orchestrator for every
-- (game, step) pair it attempts, plus a handful of high-level run events.
--
-- Intentionally append-only — no updates. A failed step emits one row with
-- status='error' and whatever structured details we could capture.

CREATE TABLE IF NOT EXISTS "sync_step_log" (
  "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "sync_log_id"  UUID NOT NULL REFERENCES "sync_log" ("id") ON DELETE CASCADE,
  "game_url"     TEXT,
  "game_index"   INTEGER,
  "step"         TEXT NOT NULL,
  "status"       TEXT NOT NULL CHECK ("status" IN ('ok', 'error', 'skipped')),
  "duration_ms"  INTEGER,
  "error"        TEXT,
  "error_code"   TEXT,
  "details"      JSONB,
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "sync_step_log_sync_log_id_idx"
  ON "sync_step_log" ("sync_log_id", "created_at");

-- RLS: a user may read/insert a sync_step_log row iff the parent sync_log row
-- belongs to them. We express that via an EXISTS subquery on sync_log.
ALTER TABLE "sync_step_log" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sync_step_log_select_own" ON "sync_step_log"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "sync_log" sl
      WHERE sl.id = "sync_step_log".sync_log_id
        AND sl.user_id = auth.uid()
    )
  );

CREATE POLICY "sync_step_log_insert_own" ON "sync_step_log"
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM "sync_log" sl
      WHERE sl.id = "sync_step_log".sync_log_id
        AND sl.user_id = auth.uid()
    )
  );
