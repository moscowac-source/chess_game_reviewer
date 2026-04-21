import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { createClient, getSessionUserWithUsername } from '@/lib/supabase-server'
import { runSync, type SyncOptions, type SyncLogger, type StepLogger } from '@/lib/sync-orchestrator'
import { makeSupabaseStepLogger } from '@/lib/sync-step-logger'
import type { UciEngine } from '@/lib/stockfish-analyzer'

interface AuthUser {
  id: string
  chess_com_username?: string | null
}

interface SyncDeps {
  gamesFetcher?: SyncOptions['gamesFetcher']
  db?: SupabaseClient
  engineFactory?: () => UciEngine
  syncLogger?: SyncLogger
  stepLogger?: StepLogger
  authFn?: () => Promise<AuthUser | null>
}

type NextRouteContext = { params: Promise<Record<string, string | string[] | undefined>> }

function makeSupabaseSyncLogger(db: SupabaseClient, mode: 'historical' | 'incremental', userId: string): SyncLogger {
  return {
    async logStart() {
      const { data } = await db.from('sync_log').insert({
        user_id: userId,
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

export async function POST(req: Request, deps: SyncDeps): Promise<NextResponse>
export async function POST(req: Request, ctx: NextRouteContext): Promise<NextResponse>
export async function POST(req: Request, deps: SyncDeps | NextRouteContext): Promise<NextResponse> {
  const actualDeps: SyncDeps = (deps ?? {}) as SyncDeps
  const body = await req.json().catch(() => ({}))
  const mode: 'historical' | 'incremental' =
    body.mode === 'historical' ? 'historical' : 'incremental'

  const activeDb = actualDeps.db ?? supabase
  const authFn = actualDeps.authFn ?? (() => getSessionUserWithUsername(activeDb))
  const user = await authFn()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!user.chess_com_username) {
    return NextResponse.json(
      { error: 'Chess.com username not set. Please update your profile.' },
      { status: 422 }
    )
  }

  const result = await runSync(mode, {
    username: user.chess_com_username,
    userId: user.id,
    db: activeDb,
    gamesFetcher: actualDeps.gamesFetcher,
    engineFactory: actualDeps.engineFactory,
    syncLogger: actualDeps.syncLogger ?? makeSupabaseSyncLogger(activeDb, mode, user.id),
  })

  return NextResponse.json(result)
}

// GET handler for Vercel Cron — reads mode from query params (defaults to incremental)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const mode: 'historical' | 'incremental' =
    searchParams.get('mode') === 'historical' ? 'historical' : 'incremental'

  const serverDb = await createClient()
  const user = await getSessionUserWithUsername(serverDb as unknown as SupabaseClient)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await runSync(mode, {
    username: user.chess_com_username ?? '',
    userId: user.id,
    db: serverDb as unknown as SupabaseClient,
    syncLogger: makeSupabaseSyncLogger(serverDb as unknown as SupabaseClient, mode, user.id),
  })

  return NextResponse.json(result)
}
