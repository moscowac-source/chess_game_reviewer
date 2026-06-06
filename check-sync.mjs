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

const sync = await supabase
  .from('sync_log')
  .select('*')
  .eq('user_id', USER)
  .order('started_at', { ascending: false })
  .limit(3)
console.log('Recent sync_log:')
for (const s of sync.data ?? []) console.log(' ', JSON.stringify(s))

const games = await supabase.from('games').select('id', { count: 'exact', head: true }).eq('user_id', USER)
const gameRows = await supabase.from('games').select('id').eq('user_id', USER)
const gameIds = (gameRows.data ?? []).map(g => g.id)

let cards = 0, withBest = 0
if (gameIds.length > 0) {
  const c = await supabase.from('cards').select('id, best_move, correct_move').in('game_id', gameIds)
  cards = c.data?.length ?? 0
  withBest = (c.data ?? []).filter(r => r.best_move != null).length
}
const cs = await supabase.from('card_state').select('card_id', { count: 'exact', head: true }).eq('user_id', USER)

console.log({
  games: games.count,
  cards,
  cards_with_best_move: withBest,
  card_state: cs.count,
})
