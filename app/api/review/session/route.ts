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

  const session = await buildReviewSession(user.id, db, { mode })
  return NextResponse.json(session)
}
