import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf-8').split('\n').filter(l => l && !l.startsWith('#')).map(l => {
    const i = l.indexOf('=')
    return [l.slice(0, i), l.slice(i + 1)]
  })
)
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const users = await supabase.from('users').select('id, chess_com_username, email, created_at').order('created_at', { ascending: false })
console.log('Users:', users.error ? `ERROR: ${JSON.stringify(users.error)}` : '')
for (const u of users.data ?? []) console.log(' ', JSON.stringify(u))

console.log('\n--- per-user totals ---')
for (const u of users.data ?? []) {
  const gameRows = await supabase.from('games').select('id, played_at').eq('user_id', u.id)
  const gameIds = (gameRows.data ?? []).map(g => g.id)
  let cards = 0, withBest = 0
  if (gameIds.length) {
    const c = await supabase.from('cards').select('id, best_move').in('game_id', gameIds)
    cards = c.data?.length ?? 0
    withBest = (c.data ?? []).filter(r => r.best_move != null).length
  }
  const cs = await supabase.from('card_state').select('card_id', { count: 'exact', head: true }).eq('user_id', u.id)
  const arch = await supabase.from('chess_com_archives').select('archive_month', { count: 'exact', head: true }).eq('user_id', u.id)
  console.log(`  ${u.chess_com_username ?? u.email} (${u.id.slice(0, 8)}): games=${gameIds.length}, cards=${cards}, with_best_move=${withBest}, card_state=${cs.count}, archives=${arch.count}`)
}

console.log('\n--- recent sync_log (last 5 across all users) ---')
const sl = await supabase.from('sync_log').select('id, user_id, status, started_at, completed_at, games_synced, cards_generated').order('started_at', { ascending: false }).limit(5)
if (sl.error) console.log('ERROR:', sl.error)
for (const s of sl.data ?? []) console.log(' ', JSON.stringify(s))
