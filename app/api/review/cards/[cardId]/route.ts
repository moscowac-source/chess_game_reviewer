import { NextResponse } from 'next/server'
import { withAuthedRoute, type AuthedRouteDeps } from '@/lib/with-authed-route'
import { apiError } from '@/lib/api-response'
import { mapOutcomeToRating, recordReview, type ReviewOutcome } from '@/lib/fsrs-engine'
import type { CardClassification } from '@/types/database'

const VALID_OUTCOMES = new Set<ReviewOutcome>([
  'firstTry',
  'afterHint',
  'afterAttempts',
  'failed',
])

interface CardRouteDeps extends AuthedRouteDeps {
  params: Promise<{ cardId: string }>
}

interface PatchDeps extends CardRouteDeps {
  recordReviewFn?: typeof recordReview
}

interface CardRow {
  id: string
  fen: string
  correct_move: string
  classification: CardClassification
  theme: string | null
  note: string | null
  cpl: number | null
}

export const GET = withAuthedRoute<CardRouteDeps>(async ({ db, user, deps }) => {
  const { cardId } = await deps.params

  const { data: state, error: stateError } = (await db
    .from('card_state')
    .select('card_id')
    .eq('user_id', user.id)
    .eq('card_id', cardId)
    .maybeSingle()) as { data: { card_id: string } | null; error: { message: string } | null }

  if (stateError) return apiError(500, stateError.message)
  if (!state) return apiError(404, 'Card not found')

  const { data: card, error: cardError } = (await db
    .from('cards')
    .select('id, fen, correct_move, classification, theme, note, cpl')
    .eq('id', cardId)
    .maybeSingle()) as { data: CardRow | null; error: { message: string } | null }

  if (cardError) return apiError(500, cardError.message)
  if (!card) return apiError(404, 'Card not found')

  return NextResponse.json({
    cardId: card.id,
    fen: card.fen,
    correctMove: card.correct_move,
    classification: card.classification,
    isNew: false,
    theme: card.theme ?? null,
    note: card.note ?? null,
    cpl: card.cpl ?? null,
  })
})

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
