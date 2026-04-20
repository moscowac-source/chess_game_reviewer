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
