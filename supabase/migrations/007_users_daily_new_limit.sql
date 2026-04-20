-- Migration: 007_users_daily_new_limit
-- Persists each user's onboarding choice for how many new cards to introduce per day.
-- NOT NULL with default 10 so every existing user keeps working without a backfill.

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "daily_new_limit" INTEGER NOT NULL DEFAULT 10;
