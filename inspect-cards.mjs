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

const games = await supabase.from('games').select('id').eq('user_id', USER)
const gameIds = (games.data ?? []).map(g => g.id)
const c = await supabase.from('cards').select('id, correct_move, best_move, classification, created_at').in('game_id', gameIds).order('created_at', { ascending: false }).limit(5)
console.log('5 most-recent cards:')
for (const row of c.data ?? []) console.log(' ', JSON.stringify(row))
