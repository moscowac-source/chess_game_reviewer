-- Migration: 005_cards_theme_note
-- Adds theme + note columns to cards so the dashboard and review UI can
-- surface an opening/endgame/tactics tag and a short coaching note.
-- Both nullable: existing rows stay valid; sync-generated cards fill them.

ALTER TABLE "cards"
  ADD COLUMN IF NOT EXISTS "theme" TEXT,
  ADD COLUMN IF NOT EXISTS "note" TEXT;
