import { createEmptyCard, fsrs, Rating, State, type Grade } from 'ts-fsrs'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Card, ReviewRating } from '@/types/database'

export type ReviewOutcome = 'firstTry' | 'afterHint' | 'afterAttempts' | 'failed'

const f = fsrs()

function toFsrsRating(rating: ReviewRating): Rating {
  switch (rating) {
    case 'easy': return Rating.Easy
    case 'good': return Rating.Good
    case 'hard': return Rating.Hard
    case 'again': return Rating.Again
  }
}

function toDbState(state: State): string {
  switch (state) {
    case State.New: return 'new'
    case State.Learning: return 'learning'
    case State.Review: return 'review'
    case State.Relearning: return 'relearning'
  }
}

export function mapOutcomeToRating(outcome: ReviewOutcome): ReviewRating {
  switch (outcome) {
    case 'firstTry': return 'easy'
    case 'afterHint': return 'good'
    case 'afterAttempts': return 'hard'
    case 'failed': return 'again'
  }
}

export function defaultCardStateRow(cardId: string, userId: string) {
  const empty = createEmptyCard()
  return {
    card_id: cardId,
    user_id: userId,
    stability: empty.stability,
    difficulty: empty.difficulty,
    due_date: empty.due.toISOString(),
    review_count: empty.reps,
    state: toDbState(empty.state),
  }
}

export async function initializeCardState(
  cardId: string,
  userId: string,
  db: SupabaseClient,
): Promise<void> {
  await db.from('card_state').insert(defaultCardStateRow(cardId, userId))
}

export async function recordReview(
  cardId: string,
  userId: string,
  rating: ReviewRating,
  db: SupabaseClient,
): Promise<void> {
  const { data: row, error } = await db
    .from('card_state')
    .select('*')
    .eq('card_id', cardId)
    .eq('user_id', userId)
    .single()

  if (error || !row) throw new Error(`card_state not found for card ${cardId}`)

  const card = {
    due: new Date(row.due_date as string),
    stability: row.stability as number,
    difficulty: row.difficulty as number,
    elapsed_days: 0,
    scheduled_days: 0,
    reps: row.review_count as number,
    lapses: 0,
    state: (row.state === 'new' ? State.New
      : row.state === 'learning' ? State.Learning
      : row.state === 'review' ? State.Review
      : State.Relearning),
    last_review: undefined as Date | undefined,
  }

  const now = new Date()
  const result = f.next(card, now, toFsrsRating(rating) as Grade)
  const updated = result.card

  await db
    .from('card_state')
    .update({
      stability: updated.stability,
      difficulty: updated.difficulty,
      due_date: updated.due.toISOString(),
      review_count: updated.reps,
      state: toDbState(updated.state),
    })
    .eq('card_id', cardId)
    .eq('user_id', userId)

  await db.from('review_log').insert({
    card_id: cardId,
    user_id: userId,
    rating,
    reviewed_at: now.toISOString(),
  })
}

export async function getNextCard(
  userId: string,
  db: SupabaseClient,
): Promise<Card | null> {
  const { data: states } = await db
    .from('card_state')
    .select('card_id, due_date')
    .eq('user_id', userId)
    .order('due_date', { ascending: true })
    .limit(1)

  if (!states || states.length === 0) return null

  const { data: card } = await db
    .from('cards')
    .select('*')
    .eq('id', states[0].card_id)
    .single()

  return card ?? null
}
