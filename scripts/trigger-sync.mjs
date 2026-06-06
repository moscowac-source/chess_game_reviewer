// Triggers a historical sync for the smoke-test user by mirroring what
// /api/sync/start does: insert a sync_log row, fire the `sync/run` Inngest
// event. The Fly worker picks it up.

import { createClient } from '@supabase/supabase-js'
import { Inngest } from 'inngest'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf-8').split('\n').filter(l => l && !l.startsWith('#')).map(l => {
    const i = l.indexOf('=')
    return [l.slice(0, i), l.slice(i + 1)]
  })
)
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const inngest = new Inngest({ id: 'chess-improver', eventKey: env.INNGEST_EVENT_KEY })

const USER_ID = 'b004b496-d42d-489e-ae39-cb754a2ff093'
const USERNAME = 'Catalyst030119'
const MODE = 'historical'

const { data: row, error } = await supabase
  .from('sync_log')
  .insert({
    user_id: USER_ID,
    mode: MODE,
    stage: 'queued',
    started_at: new Date().toISOString(),
    games_processed: 0,
    games_total: 0,
    cards_created: 0,
    error: null,
  })
  .select('id')
  .single()

if (error || !row?.id) { console.error('sync_log insert failed:', error); process.exit(1) }
console.log(`Created sync_log ${row.id}`)

const send = await inngest.send({
  name: 'sync/run',
  data: { syncLogId: row.id, userId: USER_ID, username: USERNAME, mode: MODE },
})
console.log('Inngest event sent:', JSON.stringify(send))
