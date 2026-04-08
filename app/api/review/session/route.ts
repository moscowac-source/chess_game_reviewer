import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { buildReviewSession } from '@/lib/review-session-manager'

// Placeholder — replaced when auth lands in Phase 19–20
const DEV_USER_ID = '00000000-0000-0000-0000-000000000001'

interface SessionDeps {
  db?: SupabaseClient
}

export async function GET(_req: Request, deps: SessionDeps = {}) {
  const db = deps.db ?? supabase

  const session = await buildReviewSession(DEV_USER_ID, db)
  return NextResponse.json(session)
}
