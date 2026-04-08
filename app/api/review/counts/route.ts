import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { buildReviewSession, type ReviewMode } from '@/lib/review-session-manager'

// Placeholder — replaced when auth lands in Phase 19–20
const DEV_USER_ID = '00000000-0000-0000-0000-000000000001'

const MODES: ReviewMode[] = ['standard', 'recent', 'mistakes', 'brilliancies']

interface CountsDeps {
  db?: SupabaseClient
}

export async function GET(_req: Request, deps: CountsDeps = {}) {
  const db = deps.db ?? supabase

  const results = await Promise.all(
    MODES.map(async (mode) => {
      const session = await buildReviewSession(DEV_USER_ID, db, { mode })
      return [mode, session.cards.length] as const
    }),
  )

  const counts = Object.fromEntries(results)
  return NextResponse.json(counts)
}
