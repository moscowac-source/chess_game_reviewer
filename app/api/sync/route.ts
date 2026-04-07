import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { runSync, type SyncOptions, type SyncLogger } from '@/lib/sync-orchestrator'
import type { UciEngine } from '@/lib/stockfish-analyzer'

// Hardcoded dev values used in early phases before auth is wired up
const DEV_USERNAME = 'Catalyst030119'
// Placeholder UUID — replaced when auth + user scoping land in Phase 19–20
const DEV_USER_ID = '00000000-0000-0000-0000-000000000001'

interface SyncDeps {
  gamesFetcher?: SyncOptions['gamesFetcher']
  db?: SupabaseClient
  engineFactory?: () => UciEngine
  syncLogger?: SyncLogger
}

function makeSupabaseSyncLogger(db: SupabaseClient, mode: 'historical' | 'incremental'): SyncLogger {
  return {
    async logStart() {
      const { data } = await db.from('sync_log').insert({
        user_id: DEV_USER_ID,
        mode,
        started_at: new Date().toISOString(),
        games_processed: 0,
        cards_created: 0,
        error: null,
      }).select('id').single()
      return data?.id ?? ''
    },
    async logComplete(id, result) {
      await db.from('sync_log').update({
        completed_at: new Date().toISOString(),
        games_processed: result.gamesProcessed,
        cards_created: result.cardsCreated,
        error: result.errors.length > 0 ? result.errors.join('; ') : null,
      }).eq('id', id)
    },
  }
}

export async function POST(req: Request, deps: SyncDeps = {}) {
  const body = await req.json().catch(() => ({}))
  const mode: 'historical' | 'incremental' =
    body.mode === 'historical' ? 'historical' : 'incremental'

  const activeDb = deps.db ?? supabase
  const result = await runSync(mode, {
    username: DEV_USERNAME,
    db: activeDb,
    gamesFetcher: deps.gamesFetcher,
    engineFactory: deps.engineFactory,
    syncLogger: deps.syncLogger ?? makeSupabaseSyncLogger(activeDb, mode),
  })

  return NextResponse.json(result)
}

// GET handler for Vercel Cron — reads mode from query params (defaults to incremental)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const mode: 'historical' | 'incremental' =
    searchParams.get('mode') === 'historical' ? 'historical' : 'incremental'

  const result = await runSync(mode, {
    username: DEV_USERNAME,
    db: supabase,
    syncLogger: makeSupabaseSyncLogger(supabase, mode),
  })

  return NextResponse.json(result)
}
