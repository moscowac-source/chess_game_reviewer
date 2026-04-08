-- Migration: 003_rls_policies
-- Enables Row Level Security on all tables so users can only access their own data.
-- The `cards` table is shared (no user_id) but access is still restricted to
-- authenticated users; card_state is the per-user ownership boundary.

-- ---------------------------------------------------------------------------
-- Enable RLS
-- ---------------------------------------------------------------------------

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "games" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cards" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "card_state" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "review_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sync_log" ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- users: each user can only see and update their own row
-- ---------------------------------------------------------------------------

CREATE POLICY "users_select_own" ON "users"
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "users_insert_own" ON "users"
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "users_update_own" ON "users"
  FOR UPDATE USING (id = auth.uid());

-- ---------------------------------------------------------------------------
-- games: scoped to user_id
-- ---------------------------------------------------------------------------

CREATE POLICY "games_select_own" ON "games"
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "games_insert_own" ON "games"
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- cards: shared positions — any authenticated user may read or insert
-- (deduplication by FEN means two users analysing the same position share one card)
-- ---------------------------------------------------------------------------

CREATE POLICY "cards_select_authenticated" ON "cards"
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "cards_insert_authenticated" ON "cards"
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ---------------------------------------------------------------------------
-- card_state: scoped to user_id
-- ---------------------------------------------------------------------------

CREATE POLICY "card_state_select_own" ON "card_state"
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "card_state_insert_own" ON "card_state"
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "card_state_update_own" ON "card_state"
  FOR UPDATE USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- review_log: scoped to user_id (append-only from app layer)
-- ---------------------------------------------------------------------------

CREATE POLICY "review_log_select_own" ON "review_log"
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "review_log_insert_own" ON "review_log"
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- sync_log: scoped to user_id
-- ---------------------------------------------------------------------------

CREATE POLICY "sync_log_select_own" ON "sync_log"
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "sync_log_insert_own" ON "sync_log"
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "sync_log_update_own" ON "sync_log"
  FOR UPDATE USING (user_id = auth.uid());
