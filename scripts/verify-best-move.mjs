// Verify chunk 4 of #86: every newly-generated card should have `best_move`
// set, and for blunder/mistake cards, best_move must differ from the user's
// played move (which is stored as `correct_move` for legacy reasons).

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf-8').split('\n').filter(l => l && !l.startsWith('#')).map(l => {
    const i = l.indexOf('=')
    return [l.slice(0, i), l.slice(i + 1)]
  })
)
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const USER = 'b004b496-d42d-489e-ae39-cb754a2ff093'

const gameRows = await supabase.from('games').select('id').eq('user_id', USER)
const gameIds = (gameRows.data ?? []).map(g => g.id)
console.log(`Games so far: ${gameIds.length}`)

if (!gameIds.length) { console.log('No games yet — sync may not have started.'); process.exit(0) }

const cards = await supabase
  .from('cards')
  .select('id, classification, correct_move, best_move')
  .in('game_id', gameIds)

const all = cards.data ?? []
console.log(`Cards total: ${all.length}`)

const byClass = {}
for (const c of all) {
  const k = c.classification ?? 'null'
  byClass[k] = byClass[k] ?? { total: 0, withBest: 0, mismatch: 0 }
  byClass[k].total++
  if (c.best_move != null) byClass[k].withBest++
  // For blunder/mistake: best_move should NOT equal correct_move (the bug we're fixing)
  if ((k === 'blunder' || k === 'mistake') && c.best_move != null && c.best_move === c.correct_move) {
    byClass[k].mismatch++
  }
}

console.log('\nBy classification:')
for (const [k, v] of Object.entries(byClass)) {
  console.log(`  ${k}: total=${v.total}, with_best_move=${v.withBest}, suspicious_match=${v.mismatch}`)
}

const missing = all.filter(c => c.best_move == null)
console.log(`\nCards missing best_move: ${missing.length}`)

// Show 5 sample blunder/mistake cards so we can eyeball them
const samples = all.filter(c => c.classification === 'blunder' || c.classification === 'mistake').slice(0, 5)
console.log('\nSample blunder/mistake cards:')
for (const s of samples) {
  console.log(`  ${s.classification}: played(correct_move)="${s.correct_move}" engine(best_move)="${s.best_move}"`)
}
