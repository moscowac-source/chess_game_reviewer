// Chunk 4 of issue #86: wipe smoke-test user's cards/games/archives so a fresh
// re-sync repopulates cards with best_move set.
//
// cards.game_id is ON DELETE SET NULL (migration 008), so deleting games does
// NOT cascade to cards. We delete cards explicitly first; card_state cascades
// via card_id (migration 001).

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
if (gameRows.error) { console.error('game lookup failed:', gameRows.error); process.exit(1) }
const gameIds = (gameRows.data ?? []).map(g => g.id)
console.log(`Found ${gameIds.length} games`)

if (gameIds.length) {
  const delCards = await supabase.from('cards').delete({ count: 'exact' }).in('game_id', gameIds)
  if (delCards.error) { console.error('card delete failed:', delCards.error); process.exit(1) }
  console.log(`Deleted ${delCards.count} cards (card_state cascades)`)
}

const delGames = await supabase.from('games').delete({ count: 'exact' }).eq('user_id', USER)
if (delGames.error) { console.error('game delete failed:', delGames.error); process.exit(1) }
console.log(`Deleted ${delGames.count} games`)

const delArch = await supabase.from('chess_com_archives').delete({ count: 'exact' }).eq('user_id', USER)
if (delArch.error) { console.error('archive delete failed:', delArch.error); process.exit(1) }
console.log(`Deleted ${delArch.count} chess_com_archives rows`)

// Verify
const post = await supabase.from('games').select('id', { count: 'exact', head: true }).eq('user_id', USER)
const postArch = await supabase.from('chess_com_archives').select('user_id', { count: 'exact', head: true }).eq('user_id', USER)
const cs = await supabase.from('card_state').select('card_id', { count: 'exact', head: true }).eq('user_id', USER)
console.log(`Post-wipe: games=${post.count}, archives=${postArch.count}, card_state=${cs.count}`)
