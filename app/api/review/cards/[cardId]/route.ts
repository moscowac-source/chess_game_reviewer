import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { mapOutcomeToRating, recordReview, type ReviewOutcome } from '@/lib/fsrs-engine'

const VALID_OUTCOMES = new Set<ReviewOutcome>([
  'firstTry',
  'afterHint',
  'afterAttempts',
  'failed',
])

interface PatchDeps {
  params: { cardId: string }
  recordReviewFn?: typeof recordReview
  db?: SupabaseClient
  authFn?: () => Promise<{ id: string } | null>
}

export async function PATCH(req: Request, deps: PatchDeps) {
  const { cardId } = deps.params
  const db = deps.db ?? supabase
  const recordReviewFn = deps.recordReviewFn ?? recordReview
  const authFn = deps.authFn ?? (async () => {
    const { data } = await db.from('users').select('id').limit(1).single()
    return data ?? null
  })

  const user = await authFn()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { outcome } = body

  if (!VALID_OUTCOMES.has(outcome)) {
    return NextResponse.json({ error: 'Invalid outcome' }, { status: 400 })
  }

  const rating = mapOutcomeToRating(outcome as ReviewOutcome)
  await recordReviewFn(cardId, user.id, rating, db)

  return NextResponse.json({ success: true })
}
