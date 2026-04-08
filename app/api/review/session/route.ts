import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { buildReviewSession, type ReviewMode } from '@/lib/review-session-manager'

// Placeholder — replaced when auth lands in Phase 19–20
const DEV_USER_ID = '00000000-0000-0000-0000-000000000001'

const VALID_MODES = new Set<ReviewMode>(['standard', 'recent', 'mistakes', 'brilliancies'])

interface SessionDeps {
  db?: SupabaseClient
}

export async function GET(req: Request, deps: SessionDeps = {}) {
  const db = deps.db ?? supabase
  const { searchParams } = new URL(req.url)
  const modeParam = searchParams.get('mode') ?? 'standard'
  const mode: ReviewMode = VALID_MODES.has(modeParam as ReviewMode)
    ? (modeParam as ReviewMode)
    : 'standard'

  const session = await buildReviewSession(DEV_USER_ID, db, { mode })
  return NextResponse.json(session)
}
