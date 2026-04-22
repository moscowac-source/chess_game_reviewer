-- Migration: 013_cards_best_move
-- Adds `best_move` (SAN) to the cards table. The analyzer already knows the
-- engine's top move per position, but card-generator was discarding it and
-- writing only `movePlayed` as `correct_move`. For blunder/mistake cards
-- that means the stored "correct" answer is the user's own bad move (see
-- issue #86). This column lets us persist the engine's recommendation so
-- the review UI can ask the user to find the right move, and later issue
-- #83 can generate a rationale for it.
--
-- Nullable: existing rows get NULL; the review flow falls back to
-- `correct_move` when `best_move` is absent so nothing breaks during rollout.

ALTER TABLE "cards"
  ADD COLUMN IF NOT EXISTS "best_move" TEXT;
