-- Migration: 006_cards_cpl
-- Stores the centipawn-loss value Stockfish already computes during sync,
-- so the review UI can surface how much material the played move cost.
-- Nullable: existing cards have no stored CPL; no backfill.

ALTER TABLE "cards"
  ADD COLUMN IF NOT EXISTS "cpl" INTEGER;
