import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { runSync, type SyncOptions } from '@/lib/sync-orchestrator'
import type { UciEngine } from '@/lib/stockfish-analyzer'

// The hardcoded dev username used in early phases before auth is wired up
const DEV_USERNAME = 'Catalyst030119'

interface SyncDeps {
  gamesFetcher?: SyncOptions['gamesFetcher']
  db?: SupabaseClient
  engineFactory?: () => UciEngine
}

export async function POST(req: Request, deps: SyncDeps = {}) {
  const body = await req.json().catch(() => ({}))
  const mode: 'historical' | 'incremental' =
    body.mode === 'historical' ? 'historical' : 'incremental'

  const result = await runSync(mode, {
    username: DEV_USERNAME,
    db: deps.db ?? supabase,
    gamesFetcher: deps.gamesFetcher,
    engineFactory: deps.engineFactory,
  })

  return NextResponse.json(result)
}
