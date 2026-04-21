import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { getSessionUserWithUsername } from '@/lib/supabase-server'
import { inngest as defaultInngest } from '@/lib/inngest/client'
import { apiError } from '@/lib/api-response'

interface AuthUser {
  id: string
  chess_com_username?: string | null
}

interface StartDeps {
  db?: SupabaseClient
  authFn?: () => Promise<AuthUser | null>
  inngest?: { send: (event: { name: string; data: Record<string, unknown> }) => Promise<unknown> }
}

type NextRouteContext = { params: Promise<Record<string, string | string[] | undefined>> }

export async function POST(req: Request, deps: StartDeps): Promise<Response>
export async function POST(req: Request, ctx: NextRouteContext): Promise<Response>
export async function POST(req: Request, deps: StartDeps | NextRouteContext): Promise<Response> {
  const actualDeps: StartDeps = (deps ?? {}) as StartDeps
  const body = await req.json().catch(() => ({}))
  const mode: 'historical' | 'incremental' =
    body.mode === 'historical' ? 'historical' : 'incremental'

  const db = actualDeps.db ?? supabase
  const authFn = actualDeps.authFn ?? (() => getSessionUserWithUsername(db))
  const user = await authFn()
  if (!user) return apiError(401, 'Unauthorized')
  if (!user.chess_com_username) {
    return apiError(422, 'Chess.com username not set. Please update your profile.')
  }

  const { data: inserted, error } = await db
    .from('sync_log')
    .insert({
      user_id: user.id,
      mode,
      stage: 'queued',
      started_at: new Date().toISOString(),
      games_processed: 0,
      games_total: 0,
      cards_created: 0,
      error: null,
    })
    .select('id')
    .single()

  if (error || !inserted?.id) return apiError(500, error?.message ?? 'Failed to create sync_log row')

  const inngestClient = actualDeps.inngest ?? defaultInngest
  await inngestClient.send({
    name: 'sync/run',
    data: {
      syncLogId: inserted.id,
      userId: user.id,
      username: user.chess_com_username,
      mode,
    },
  })

  return NextResponse.json({ sync_id: inserted.id })
}
