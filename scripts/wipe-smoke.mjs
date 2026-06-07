// Chunk 4 of issue #86: wipe smoke-test user's cards/games/archives so a fresh
// re-sync repopulates cards with best_move set.
//
// cards.game_id is ON DELETE SET NULL (migration 008), so deleting games does
// NOT cascade to cards. We delete cards explicitly first; card_state cascades
// via card_id (migration 001).
//
// Cards are deleted in chunks because Supabase REST IN() lists have a URL
// length cap and silently fail with "Bad Request" past ~400 ids.

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
const CHUNK = 200

const gameRows = await supabase.from('games').select('id').eq('user_id', USER)
if (gameRows.error) { console.error('game lookup failed:', gameRows.error); process.exit(1) }
const gameIds = (gameRows.data ?? []).map(g => g.id)
console.log(`Found ${gameIds.length} games`)

let cardsDeleted = 0
for (let i = 0; i < gameIds.length; i += CHUNK) {
  const chunk = gameIds.slice(i, i + CHUNK)
  const r = await supabase.from('cards').delete({ count: 'exact' }).in('game_id', chunk)
  if (r.error) { console.error(`card delete (chunk ${i}) failed:`, r.error); process.exit(1) }
  cardsDeleted += r.count ?? 0
}
console.log(`Deleted ${cardsDeleted} cards (card_state cascades)`)

// Some cards may exist with game_id=NULL if a prior delete-games path orphaned
// them (SET NULL). Sweep any orphaned card_state for this user, then their cards.
const orphanCS = await supabase.from('card_state').select('card_id').eq('user_id', USER).limit(50000)
const orphanCardIds = (orphanCS.data ?? []).map(r => r.card_id)
if (orphanCardIds.length) {
  console.log(`Sweeping ${orphanCardIds.length} orphaned card_state rows`)
  let swept = 0
  for (let i = 0; i < orphanCardIds.length; i += CHUNK) {
    const chunk = orphanCardIds.slice(i, i + CHUNK)
    const r = await supabase.from('cards').delete({ count: 'exact' }).in('id', chunk)
    if (r.error) { console.error(`orphan card delete failed:`, r.error); process.exit(1) }
    swept += r.count ?? 0
  }
  console.log(`Swept ${swept} orphan cards`)
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
