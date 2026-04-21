-- Migration: 009_users_name_fields
-- Adds optional first_name and last_name to users so the nav avatar + display name
-- can show a real name when provided. Both nullable — existing users stay valid.

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "first_name" TEXT,
  ADD COLUMN IF NOT EXISTS "last_name" TEXT;
