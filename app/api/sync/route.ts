import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { createClient, getSessionUser } from '@/lib/supabase-server'
import { runSync, type SyncOptions, type SyncLogger } from '@/lib/sync-orchestrator'
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
  authFn?: () => Promise<AuthUser | null>
}

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

async function getSessionUserWithUsername(db: SupabaseClient): Promise<AuthUser | null> {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return null

  const { data } = await db
    .from('users')
    .select('chess_com_username')
    .eq('id', sessionUser.id)
    .single()

  return { id: sessionUser.id, chess_com_username: data?.chess_com_username ?? null }
}

export async function POST(req: Request, deps: SyncDeps = {}) {
  const body = await req.json().catch(() => ({}))
  const mode: 'historical' | 'incremental' =
    body.mode === 'historical' ? 'historical' : 'incremental'

  const activeDb = deps.db ?? supabase
  const authFn = deps.authFn ?? (() => getSessionUserWithUsername(activeDb))
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
    db: activeDb,
    gamesFetcher: deps.gamesFetcher,
    engineFactory: deps.engineFactory,
    syncLogger: deps.syncLogger ?? makeSupabaseSyncLogger(activeDb, mode, user.id),
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
    db: serverDb as unknown as SupabaseClient,
    syncLogger: makeSupabaseSyncLogger(serverDb as unknown as SupabaseClient, mode, user.id),
  })

  return NextResponse.json(result)
}
