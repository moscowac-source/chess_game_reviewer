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

// Count games
const games = await supabase.from('games').select('id', { count: 'exact', head: true }).eq('user_id', USER)
// card_state is per-user, so count via user_id directly
const csTotal = await supabase.from('card_state').select('card_id', { count: 'exact', head: true }).eq('user_id', USER)

// Cards: join via card_state to avoid 800-element IN()
const userCardIds = await supabase.from('card_state').select('card_id').eq('user_id', USER).limit(50000)
const cardIds = (userCardIds.data ?? []).map(r => r.card_id)

let cardsTotal = 0, withBest = 0
const byClass = {}
// Page through in chunks of 200
for (let i = 0; i < cardIds.length; i += 200) {
  const chunk = cardIds.slice(i, i + 200)
  const c = await supabase.from('cards').select('id, classification, correct_move, best_move').in('id', chunk)
  for (const r of c.data ?? []) {
    cardsTotal++
    if (r.best_move != null) withBest++
    const k = r.classification ?? 'null'
    byClass[k] = byClass[k] ?? { total: 0, withBest: 0 }
    byClass[k].total++
    if (r.best_move != null) byClass[k].withBest++
  }
}

console.log(`games=${games.count}, cards=${cardsTotal}, with_best_move=${withBest}, card_state=${csTotal.count}`)
console.log('By classification:')
for (const [k, v] of Object.entries(byClass)) console.log(`  ${k}: total=${v.total}, with_best_move=${v.withBest}`)

// Most recent sync_log
const sl = await supabase.from('sync_log').select('id, stage, started_at, completed_at, games_processed, games_total, cards_created, error').eq('user_id', USER).order('started_at', { ascending: false }).limit(3)
console.log('\nRecent sync_log:')
for (const s of sl.data ?? []) console.log(' ', JSON.stringify(s))

// Most recent 5 cards (any classification)
const recent = await supabase
  .from('cards')
  .select('id, classification, correct_move, best_move, created_at')
  .order('created_at', { ascending: false })
  .limit(5)
console.log('\n5 most-recent cards:')
for (const r of recent.data ?? []) console.log(' ', JSON.stringify(r))
