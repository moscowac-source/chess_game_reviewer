/**
 * @jest-environment node
 */
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const MIGRATION_PATH = join(process.cwd(), 'supabase/migrations/001_initial_schema.sql')

function getMigrationSQL(): string {
  return readFileSync(MIGRATION_PATH, 'utf8')
}

test('migration file exists', () => {
  expect(existsSync(MIGRATION_PATH)).toBe(true)
})

test('migration contains all required tables', () => {
  const sql = getMigrationSQL()
  const requiredTables = ['users', 'games', 'cards', 'card_state', 'review_log', 'sync_log']
  for (const table of requiredTables) {
    expect(sql).toContain(`"${table}"`)
  }
})

test('migration uses CREATE TABLE IF NOT EXISTS for re-runnability', () => {
  const sql = getMigrationSQL()
  const count = (sql.match(/CREATE TABLE IF NOT EXISTS/gi) || []).length
  expect(count).toBe(6)
})

test('migration contains required foreign key constraints', () => {
  const sql = getMigrationSQL()
  // card_state.card_id → cards.id
  expect(sql).toMatch(/REFERENCES\s+"cards"\s*\(\s*"id"\s*\)/)
  // card_state.user_id → users.id
  expect(sql).toMatch(/REFERENCES\s+"users"\s*\(\s*"id"\s*\)/)
  // games.user_id → users.id
  expect(sql).toMatch(/REFERENCES\s+"users"\s*\(\s*"id"\s*\)/)
})

test('cards table has all required columns', () => {
  const sql = getMigrationSQL()
  // Extract the cards table block
  const match = sql.match(/CREATE TABLE IF NOT EXISTS "cards"[\s\S]*?\);/)
  expect(match).not.toBeNull()
  const block = match![0]
  expect(block).toContain('"id"')
  expect(block).toContain('"fen"')
  expect(block).toContain('"correct_move"')
  expect(block).toContain('"classification"')
  expect(block).toContain('"created_at"')
})

test('card_state table has all required FSRS columns', () => {
  const sql = getMigrationSQL()
  const match = sql.match(/CREATE TABLE IF NOT EXISTS "card_state"[\s\S]*?\);/)
  expect(match).not.toBeNull()
  const block = match![0]
  expect(block).toContain('"id"')
  expect(block).toContain('"user_id"')
  expect(block).toContain('"card_id"')
  expect(block).toContain('"stability"')
  expect(block).toContain('"difficulty"')
  expect(block).toContain('"due_date"')
  expect(block).toContain('"review_count"')
  expect(block).toContain('"state"')
})

test('games table has all required columns', () => {
  const sql = getMigrationSQL()
  const match = sql.match(/CREATE TABLE IF NOT EXISTS "games"[\s\S]*?\);/)
  expect(match).not.toBeNull()
  const block = match![0]
  expect(block).toContain('"id"')
  expect(block).toContain('"user_id"')
  expect(block).toContain('"pgn"')
  expect(block).toContain('"source"')
  expect(block).toContain('"played_at"')
  expect(block).toContain('"processed_at"')
})

test('sync_log table has all required columns', () => {
  const sql = getMigrationSQL()
  const match = sql.match(/CREATE TABLE IF NOT EXISTS "sync_log"[\s\S]*?\);/)
  expect(match).not.toBeNull()
  const block = match![0]
  expect(block).toContain('"id"')
  expect(block).toContain('"user_id"')
  expect(block).toContain('"mode"')
  expect(block).toContain('"started_at"')
  expect(block).toContain('"completed_at"')
  expect(block).toContain('"games_processed"')
  expect(block).toContain('"cards_created"')
  expect(block).toContain('"error"')
})

// ---------------------------------------------------------------------------
// Phase 20: RLS migration
// ---------------------------------------------------------------------------

const RLS_MIGRATION_PATH = join(process.cwd(), 'supabase/migrations/003_rls_policies.sql')

function getRlsSQL(): string {
  return readFileSync(RLS_MIGRATION_PATH, 'utf8')
}

test('RLS migration file exists', () => {
  expect(existsSync(RLS_MIGRATION_PATH)).toBe(true)
})

test('RLS migration enables row level security on all user-scoped tables', () => {
  const sql = getRlsSQL()
  const tables = ['users', 'games', 'card_state', 'review_log', 'sync_log']
  for (const table of tables) {
    expect(sql).toContain(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`)
  }
})

test('RLS migration creates SELECT policies scoped to auth.uid() for user-scoped tables', () => {
  const sql = getRlsSQL()
  const tables = ['users', 'games', 'card_state', 'review_log', 'sync_log']
  for (const table of tables) {
    expect(sql).toContain(`"${table}"`)
  }
  expect(sql).toContain('auth.uid()')
})

test('RLS migration enables row level security on cards table', () => {
  const sql = getRlsSQL()
  expect(sql).toContain('ALTER TABLE "cards" ENABLE ROW LEVEL SECURITY')
})

// ---------------------------------------------------------------------------
// Issue #28: theme + note on cards
// ---------------------------------------------------------------------------

const THEME_NOTE_MIGRATION_PATH = join(
  process.cwd(),
  'supabase/migrations/005_cards_theme_note.sql',
)

test('theme+note migration file exists', () => {
  expect(existsSync(THEME_NOTE_MIGRATION_PATH)).toBe(true)
})

test('theme+note migration adds nullable theme and note columns to cards', () => {
  const sql = readFileSync(THEME_NOTE_MIGRATION_PATH, 'utf8')
  expect(sql).toMatch(/ALTER TABLE\s+"cards"/i)
  expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS\s+"theme"\s+TEXT/i)
  expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS\s+"note"\s+TEXT/i)
  // Nullable — no NOT NULL on either new column
  expect(sql).not.toMatch(/"theme"\s+TEXT\s+NOT NULL/i)
  expect(sql).not.toMatch(/"note"\s+TEXT\s+NOT NULL/i)
})

// ---------------------------------------------------------------------------
// Issue #29: cpl on cards
// ---------------------------------------------------------------------------

const CPL_MIGRATION_PATH = join(process.cwd(), 'supabase/migrations/006_cards_cpl.sql')

test('cpl migration file exists', () => {
  expect(existsSync(CPL_MIGRATION_PATH)).toBe(true)
})

test('cpl migration adds nullable cpl integer column to cards', () => {
  const sql = readFileSync(CPL_MIGRATION_PATH, 'utf8')
  expect(sql).toMatch(/ALTER TABLE\s+"cards"/i)
  expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS\s+"cpl"\s+INTEGER/i)
  expect(sql).not.toMatch(/"cpl"\s+INTEGER\s+NOT NULL/i)
})

// ---------------------------------------------------------------------------
// Issue #35: daily_new_limit on users
// ---------------------------------------------------------------------------

const DAILY_LIMIT_MIGRATION_PATH = join(
  process.cwd(),
  'supabase/migrations/007_users_daily_new_limit.sql',
)

test('daily_new_limit migration file exists', () => {
  expect(existsSync(DAILY_LIMIT_MIGRATION_PATH)).toBe(true)
})

test('daily_new_limit migration adds NOT NULL integer with default 10 to users', () => {
  const sql = readFileSync(DAILY_LIMIT_MIGRATION_PATH, 'utf8')
  expect(sql).toMatch(/ALTER TABLE\s+"users"/i)
  expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS\s+"daily_new_limit"\s+INTEGER/i)
  expect(sql).toMatch(/NOT NULL/i)
  expect(sql).toMatch(/DEFAULT\s+10/i)
})

// ---------------------------------------------------------------------------
// Issue #34: games metadata + cards.game_id link
// ---------------------------------------------------------------------------

const GAMES_LINK_MIGRATION_PATH = join(
  process.cwd(),
  'supabase/migrations/008_games_and_cards_link.sql',
)

test('games+cards-link migration file exists', () => {
  expect(existsSync(GAMES_LINK_MIGRATION_PATH)).toBe(true)
})

test('games+cards-link migration adds nullable metadata columns to games', () => {
  const sql = readFileSync(GAMES_LINK_MIGRATION_PATH, 'utf8')
  expect(sql).toMatch(/ALTER TABLE\s+"games"/i)
  for (const col of ['white', 'black', 'result', 'url', 'eco']) {
    expect(sql).toMatch(new RegExp(`ADD COLUMN IF NOT EXISTS\\s+"${col}"\\s+TEXT`, 'i'))
    expect(sql).not.toMatch(new RegExp(`"${col}"\\s+TEXT\\s+NOT NULL`, 'i'))
  }
})

test('games+cards-link migration creates a unique index on (user_id, url)', () => {
  const sql = readFileSync(GAMES_LINK_MIGRATION_PATH, 'utf8')
  expect(sql).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS[\s\S]*"games"[\s\S]*"user_id"[\s\S]*"url"/i)
  expect(sql).toMatch(/WHERE\s+"url"\s+IS NOT NULL/i)
})

test('games+cards-link migration adds nullable game_id FK on cards with ON DELETE SET NULL', () => {
  const sql = readFileSync(GAMES_LINK_MIGRATION_PATH, 'utf8')
  expect(sql).toMatch(/ALTER TABLE\s+"cards"/i)
  expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS\s+"game_id"\s+UUID/i)
  expect(sql).toMatch(/REFERENCES\s+"games"\s*\(\s*"id"\s*\)/i)
  expect(sql).toMatch(/ON DELETE SET NULL/i)
  expect(sql).not.toMatch(/"game_id"\s+UUID\s+NOT NULL/i)
})

// ---------------------------------------------------------------------------
// Issue #36: sync_log progress columns
// ---------------------------------------------------------------------------

const SYNC_PROGRESS_MIGRATION_PATH = join(
  process.cwd(),
  'supabase/migrations/010_sync_log_progress.sql',
)

test('sync_log progress migration file exists', () => {
  expect(existsSync(SYNC_PROGRESS_MIGRATION_PATH)).toBe(true)
})

test('sync_log progress migration adds nullable stage TEXT column', () => {
  const sql = readFileSync(SYNC_PROGRESS_MIGRATION_PATH, 'utf8')
  expect(sql).toMatch(/ALTER TABLE\s+"sync_log"/i)
  expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS\s+"stage"\s+TEXT/i)
  expect(sql).not.toMatch(/"stage"\s+TEXT\s+NOT NULL/i)
})

test('sync_log progress migration adds games_total INTEGER NOT NULL DEFAULT 0', () => {
  const sql = readFileSync(SYNC_PROGRESS_MIGRATION_PATH, 'utf8')
  expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS\s+"games_total"\s+INTEGER[\s\S]*NOT NULL[\s\S]*DEFAULT\s+0/i)
})

// ---------------------------------------------------------------------------
// sync_step_log — per-step audit table
// ---------------------------------------------------------------------------

const SYNC_STEP_LOG_MIGRATION_PATH = join(
  process.cwd(),
  'supabase/migrations/011_sync_step_log.sql',
)

test('sync_step_log migration file exists', () => {
  expect(existsSync(SYNC_STEP_LOG_MIGRATION_PATH)).toBe(true)
})

test('sync_step_log migration creates the audit table with required columns', () => {
  const sql = readFileSync(SYNC_STEP_LOG_MIGRATION_PATH, 'utf8')
  const match = sql.match(/CREATE TABLE IF NOT EXISTS "sync_step_log"[\s\S]*?\);/)
  expect(match).not.toBeNull()
  const block = match![0]
  for (const col of ['id', 'sync_log_id', 'game_url', 'game_index', 'step', 'status', 'duration_ms', 'error', 'error_code', 'details', 'created_at']) {
    expect(block).toContain(`"${col}"`)
  }
  // status CHECK constraint
  expect(block).toMatch(/"status"[\s\S]*CHECK[\s\S]*'ok'[\s\S]*'error'[\s\S]*'skipped'/)
  // FK to sync_log with cascade
  expect(block).toMatch(/REFERENCES\s+"sync_log"\s*\(\s*"id"\s*\)[\s\S]*ON DELETE CASCADE/i)
  // details is JSONB
  expect(block).toMatch(/"details"\s+JSONB/i)
})

test('sync_step_log migration enables RLS and scopes select+insert via sync_log.user_id', () => {
  const sql = readFileSync(SYNC_STEP_LOG_MIGRATION_PATH, 'utf8')
  expect(sql).toContain('ALTER TABLE "sync_step_log" ENABLE ROW LEVEL SECURITY')
  expect(sql).toMatch(/POLICY\s+"sync_step_log_select_own"[\s\S]*sync_log[\s\S]*auth\.uid\(\)/i)
  expect(sql).toMatch(/POLICY\s+"sync_step_log_insert_own"[\s\S]*sync_log[\s\S]*auth\.uid\(\)/i)
})
