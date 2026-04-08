import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { buildReviewSession, type ReviewMode } from '@/lib/review-session-manager'

const MODES: ReviewMode[] = ['standard', 'recent', 'mistakes', 'brilliancies']

interface CountsDeps {
  db?: SupabaseClient
  authFn?: () => Promise<{ id: string } | null>
}

export async function GET(_req: Request, deps: CountsDeps = {}) {
  const db = deps.db ?? supabase
  const authFn = deps.authFn ?? (async () => {
    const { data } = await db.from('users').select('id').limit(1).single()
    return data ?? null
  })

  const user = await authFn()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results = await Promise.all(
    MODES.map(async (mode) => {
      const session = await buildReviewSession(user.id, db, { mode })
      return [mode, session.cards.length] as const
    }),
  )

  const counts = Object.fromEntries(results)
  return NextResponse.json(counts)
}
