import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { getSessionUser } from '@/lib/supabase-server'
import { buildReviewSession, type ReviewMode } from '@/lib/review-session-manager'

const VALID_MODES = new Set<ReviewMode>(['standard', 'recent', 'mistakes', 'brilliancies'])

interface SessionDeps {
  db?: SupabaseClient
  authFn?: () => Promise<{ id: string } | null>
}

export async function GET(req: Request, deps: SessionDeps = {}) {
  const db = deps.db ?? supabase
  const authFn = deps.authFn ?? getSessionUser
  const user = await authFn()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const modeParam = searchParams.get('mode') ?? 'standard'
  const mode: ReviewMode = VALID_MODES.has(modeParam as ReviewMode)
    ? (modeParam as ReviewMode)
    : 'standard'

  const { data: userRow } = await db
    .from('users')
    .select('daily_new_limit')
    .eq('id', user.id)
    .single()

  const dailyNewLimit =
    typeof (userRow as { daily_new_limit?: number } | null)?.daily_new_limit === 'number'
      ? (userRow as { daily_new_limit: number }).daily_new_limit
      : 10

  const session = await buildReviewSession(user.id, db, { mode, dailyNewLimit })
  return NextResponse.json(session)
}
