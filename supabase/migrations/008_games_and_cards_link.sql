-- Migration: 008_games_and_cards_link
-- Adds Chess.com game metadata to the `games` table and a game_id FK on `cards`.
-- All new columns are nullable so existing rows (and historical cards) stay valid.

ALTER TABLE "games"
  ADD COLUMN IF NOT EXISTS "white"  TEXT,
  ADD COLUMN IF NOT EXISTS "black"  TEXT,
  ADD COLUMN IF NOT EXISTS "result" TEXT,
  ADD COLUMN IF NOT EXISTS "url"    TEXT,
  ADD COLUMN IF NOT EXISTS "eco"    TEXT;

-- Dedupe: one (user_id, url) row per game. Partial index so rows without a
-- url (edge case — PGN missing [Link ...]) don't collide.
CREATE UNIQUE INDEX IF NOT EXISTS "games_user_url_unique"
  ON "games" ("user_id", "url")
  WHERE "url" IS NOT NULL;

ALTER TABLE "cards"
  ADD COLUMN IF NOT EXISTS "game_id" UUID
    REFERENCES "games" ("id") ON DELETE SET NULL;
