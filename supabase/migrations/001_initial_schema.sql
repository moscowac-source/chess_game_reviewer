-- Migration: 001_initial_schema
-- Re-runnable: all tables use IF NOT EXISTS

-- users: stores app users (linked to Supabase Auth via id)
CREATE TABLE IF NOT EXISTS "users" (
  "id"                  UUID PRIMARY KEY,
  "email"               TEXT NOT NULL UNIQUE,
  "chess_com_username"  TEXT,
  "created_at"          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- games: raw PGN data fetched from Chess.com
CREATE TABLE IF NOT EXISTS "games" (
  "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"      UUID NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "pgn"          TEXT NOT NULL,
  "source"       TEXT NOT NULL DEFAULT 'chess.com',
  "played_at"    TIMESTAMPTZ NOT NULL,
  "processed_at" TIMESTAMPTZ
);

-- cards: one card per unique FEN position
CREATE TABLE IF NOT EXISTS "cards" (
  "id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "fen"            TEXT NOT NULL UNIQUE,
  "correct_move"   TEXT NOT NULL,
  "classification" TEXT NOT NULL CHECK ("classification" IN ('blunder', 'mistake', 'great', 'brilliant')),
  "created_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- card_state: per-user FSRS scheduling state for each card
CREATE TABLE IF NOT EXISTS "card_state" (
  "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"      UUID NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "card_id"      UUID NOT NULL REFERENCES "cards" ("id") ON DELETE CASCADE,
  "stability"    DOUBLE PRECISION NOT NULL DEFAULT 0,
  "difficulty"   DOUBLE PRECISION NOT NULL DEFAULT 0,
  "due_date"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "review_count" INTEGER NOT NULL DEFAULT 0,
  "state"        TEXT NOT NULL DEFAULT 'new' CHECK ("state" IN ('new', 'learning', 'review', 'relearning')),
  UNIQUE ("user_id", "card_id")
);

-- review_log: immutable record of every review attempt
CREATE TABLE IF NOT EXISTS "review_log" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"     UUID NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "card_id"     UUID NOT NULL REFERENCES "cards" ("id") ON DELETE CASCADE,
  "rating"      TEXT NOT NULL CHECK ("rating" IN ('easy', 'good', 'hard', 'again')),
  "reviewed_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- sync_log: record of every sync run (historical or incremental)
CREATE TABLE IF NOT EXISTS "sync_log" (
  "id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"          UUID NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "mode"             TEXT NOT NULL CHECK ("mode" IN ('historical', 'incremental')),
  "started_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "completed_at"     TIMESTAMPTZ,
  "games_processed"  INTEGER NOT NULL DEFAULT 0,
  "cards_created"    INTEGER NOT NULL DEFAULT 0,
  "error"            TEXT
);
