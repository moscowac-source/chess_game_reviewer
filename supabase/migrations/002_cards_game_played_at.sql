-- Migration: 002_cards_game_played_at
-- Adds game_played_at to cards so recent-mode filtering doesn't require a join.
-- Nullable: existing cards and cards from historical syncs may not have this value.

ALTER TABLE "cards"
  ADD COLUMN IF NOT EXISTS "game_played_at" TIMESTAMPTZ;
