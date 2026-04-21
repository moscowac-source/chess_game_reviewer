-- Migration: 010_sync_log_progress
-- Add live progress columns to sync_log so a background worker can update
-- an in-flight sync run and the UI can poll for progress.
--
-- `stage` — which phase the run is in (`queued`, `fetching`, `analyzing`, `complete`, `error`).
--   Nullable so legacy rows created before this migration remain valid.
-- `games_total` — total number of PGNs the run will process, populated after
--   the fetch stage. Defaults to 0.

ALTER TABLE "sync_log"
  ADD COLUMN IF NOT EXISTS "stage"       TEXT,
  ADD COLUMN IF NOT EXISTS "games_total" INTEGER NOT NULL DEFAULT 0;
