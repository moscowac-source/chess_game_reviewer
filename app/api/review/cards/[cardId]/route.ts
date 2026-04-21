import { NextResponse } from 'next/server'
import { withAuthedRoute, type AuthedRouteDeps } from '@/lib/with-authed-route'
import { apiError } from '@/lib/api-response'
import { mapOutcomeToRating, recordReview, type ReviewOutcome } from '@/lib/fsrs-engine'

const VALID_OUTCOMES = new Set<ReviewOutcome>([
  'firstTry',
  'afterHint',
  'afterAttempts',
  'failed',
])

interface PatchDeps extends AuthedRouteDeps {
  params: Promise<{ cardId: string }>
  recordReviewFn?: typeof recordReview
}

export const PATCH = withAuthedRoute<PatchDeps>(async ({ req, db, user, deps }) => {
  const { cardId } = await deps.params
  const recordReviewFn = deps.recordReviewFn ?? recordReview

  const body = await req.json()
  const { outcome } = body

  if (!VALID_OUTCOMES.has(outcome)) {
    return apiError(400, 'Invalid outcome')
  }

  const rating = mapOutcomeToRating(outcome as ReviewOutcome)
  await recordReviewFn(cardId, user.id, rating, db)

  return NextResponse.json({ success: true })
})
