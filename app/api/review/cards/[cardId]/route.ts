import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { mapOutcomeToRating, recordReview, type ReviewOutcome } from '@/lib/fsrs-engine'

const DEV_USER_ID = '00000000-0000-0000-0000-000000000001'

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
}

export async function PATCH(req: Request, deps: PatchDeps) {
  const { cardId } = deps.params
  const db = deps.db ?? supabase
  const recordReviewFn = deps.recordReviewFn ?? recordReview

  const body = await req.json()
  const { outcome } = body

  if (!VALID_OUTCOMES.has(outcome)) {
    return NextResponse.json({ error: 'Invalid outcome' }, { status: 400 })
  }

  const rating = mapOutcomeToRating(outcome as ReviewOutcome)
  await recordReviewFn(cardId, DEV_USER_ID, rating, db)

  return NextResponse.json({ success: true })
}
