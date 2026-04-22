// One-shot cleanup for issue #78. Re-evaluates every existing `great` card
// against the tightened thresholds (fullmove >= 12, legalMoveCount >= 8,
// cpl <= 10) and deletes the ones that no longer qualify. Blunder and mistake
// cards are untouched. Run with: `node scripts/cleanup-noisy-great-cards.mjs`
//
// Reads Supabase creds from .env.local. Pass --apply to actually delete;
// default is a dry-run that just prints counts and a sample.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Chess } from 'chess.js'

const GREAT_MIN_FULLMOVE = 12
const GREAT_MIN_LEGAL_MOVES = 8
const GREAT_MAX_CPL = 10

const env = Object.fromEntries(
  readFileSync(join(process.cwd(), '.env.local'), 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => l.split('=').map((s) => s.trim()))
    .map(([k, ...v]) => [k, v.join('=')]),
)
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SRK = env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SRK) throw new Error('Missing Supabase env vars')

const apply = process.argv.includes('--apply')

async function sb(path, init = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers: {
      apikey: SRK,
      Authorization: `Bearer ${SRK}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`)
  if (res.status === 204) return null
  return res.json()
}

function fullmoveFromFen(fen) {
  const n = parseInt(fen.trim().split(/\s+/).pop(), 10)
  return Number.isFinite(n) ? n : 1
}

function legalMoveCount(fen) {
  try { return new Chess(fen).moves().length } catch { return 0 }
}

function qualifiesAsGreat(card) {
  const fm = fullmoveFromFen(card.fen)
  const lm = legalMoveCount(card.fen)
  const cpl = card.cpl ?? 999
  return fm >= GREAT_MIN_FULLMOVE && lm >= GREAT_MIN_LEGAL_MOVES && cpl <= GREAT_MAX_CPL
}

const great = await sb('/rest/v1/cards?select=id,fen,cpl,correct_move,theme&classification=eq.great&limit=1000')
console.log(`Total great cards: ${great.length}`)

const toDelete = great.filter((c) => !qualifiesAsGreat(c))
const toKeep = great.filter(qualifiesAsGreat)
console.log(`Would delete: ${toDelete.length}`)
console.log(`Would keep:   ${toKeep.length}`)

console.log('\nSample to delete (first 5):')
for (const c of toDelete.slice(0, 5)) {
  console.log(`  fm=${fullmoveFromFen(c.fen)} lm=${legalMoveCount(c.fen)} cpl=${c.cpl} move=${c.correct_move} theme=${c.theme}`)
}
console.log('\nSample to keep (first 5):')
for (const c of toKeep.slice(0, 5)) {
  console.log(`  fm=${fullmoveFromFen(c.fen)} lm=${legalMoveCount(c.fen)} cpl=${c.cpl} move=${c.correct_move} theme=${c.theme}`)
}

if (!apply) {
  console.log('\n(dry run — pass --apply to delete)')
  process.exit(0)
}

console.log(`\nDeleting ${toDelete.length} cards...`)
const batchSize = 50
for (let i = 0; i < toDelete.length; i += batchSize) {
  const batch = toDelete.slice(i, i + batchSize)
  const ids = batch.map((c) => `"${c.id}"`).join(',')
  await sb(`/rest/v1/cards?id=in.(${ids})`, { method: 'DELETE' })
  console.log(`  deleted ${Math.min(i + batchSize, toDelete.length)}/${toDelete.length}`)
}
console.log('Done.')
