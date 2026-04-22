-- Migration: 012_chess_com_archives
-- Per-(user, year, month) archive cache so repeat syncs can send
-- `If-None-Match` / `If-Modified-Since` and get a 304 on immutable past
-- months. Dramatically reduces chess.com API pressure for returning users
-- (historical sync with a populated cache: 36 requests → ~2 instead of 36
-- full archive reads).

CREATE TABLE IF NOT EXISTS "chess_com_archives" (
  "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"       UUID NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "year"          INTEGER NOT NULL,
  "month"         INTEGER NOT NULL CHECK ("month" BETWEEN 1 AND 12),
  "etag"          TEXT,
  "last_modified" TEXT,
  "fetched_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("user_id", "year", "month")
);

CREATE INDEX IF NOT EXISTS "chess_com_archives_user_idx"
  ON "chess_com_archives" ("user_id", "year", "month");

-- RLS: a user can only see/write their own archive cache rows.
ALTER TABLE "chess_com_archives" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chess_com_archives_select_own" ON "chess_com_archives"
  FOR SELECT USING (auth.uid() = "user_id");

CREATE POLICY "chess_com_archives_insert_own" ON "chess_com_archives"
  FOR INSERT WITH CHECK (auth.uid() = "user_id");

CREATE POLICY "chess_com_archives_update_own" ON "chess_com_archives"
  FOR UPDATE USING (auth.uid() = "user_id");

CREATE POLICY "chess_com_archives_delete_own" ON "chess_com_archives"
  FOR DELETE USING (auth.uid() = "user_id");
