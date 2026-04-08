import type { SupabaseClient } from '@supabase/supabase-js'
import type { CardClassification } from '@/types/database'

export interface SessionCard {
  cardId: string
  fen: string
  correctMove: string
  classification: CardClassification
  isNew: boolean
}

export interface ReviewSession {
  cards: SessionCard[]
  totalDue: number
  newCardsToday: number
}

export interface SessionOptions {
  dailyNewLimit?: number
  now?: Date
}

type RawCardState = {
  card_id: string
  state: string
  due_date: string
  review_count: number
}

type RawReviewLog = {
  card_id: string
  reviewed_at: string
}

type RawCard = {
  id: string
  fen: string
  correct_move: string
  classification: CardClassification
}

export async function buildReviewSession(
  userId: string,
  db: SupabaseClient,
  options: SessionOptions = {},
): Promise<ReviewSession> {
  const now = options.now ?? new Date()
  const dailyNewLimit = options.dailyNewLimit ?? 20

  // Fetch all card states for this user
  const { data: allStates } = await db
    .from('card_state')
    .select('*')
    .eq('user_id', userId)

  // Fetch all review logs for this user (to determine what was reviewed today)
  const { data: allLogs } = await db
    .from('review_log')
    .select('card_id, reviewed_at')
    .eq('user_id', userId)

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const todayReviewedIds = new Set(
    ((allLogs ?? []) as RawReviewLog[])
      .filter((log) => new Date(log.reviewed_at) >= startOfToday)
      .map((log) => log.card_id),
  )

  const states = (allStates ?? []) as RawCardState[]

  // Due cards: seen before, due now, not already reviewed today
  const dueStates = states.filter(
    (s) =>
      s.state !== 'new' &&
      new Date(s.due_date) <= now &&
      !todayReviewedIds.has(s.card_id),
  )

  // "New cards reviewed today" = cards reviewed today that have review_count=1
  // (their first and only review happened today, so they were 'new' when reviewed)
  const newReviewedToday = states.filter(
    (s) => todayReviewedIds.has(s.card_id) && s.review_count === 1,
  ).length

  const remainingNew = Math.max(0, dailyNewLimit - newReviewedToday)

  // New cards: never reviewed, not reviewed today, capped at remaining slots
  const newStates = states
    .filter((s) => s.state === 'new' && !todayReviewedIds.has(s.card_id))
    .slice(0, remainingNew)

  const allCardIds = [
    ...dueStates.map((s) => s.card_id),
    ...newStates.map((s) => s.card_id),
  ]

  if (allCardIds.length === 0) {
    return { cards: [], totalDue: dueStates.length, newCardsToday: newReviewedToday }
  }

  const { data: cardData } = await db
    .from('cards')
    .select('*')
    .in('id', allCardIds)

  const dueIds = new Set(dueStates.map((s) => s.card_id))

  const cards: SessionCard[] = ((cardData ?? []) as RawCard[]).map((c) => ({
    cardId: c.id,
    fen: c.fen,
    correctMove: c.correct_move,
    classification: c.classification,
    isNew: !dueIds.has(c.id),
  }))

  return { cards, totalDue: dueStates.length, newCardsToday: newReviewedToday }
}
