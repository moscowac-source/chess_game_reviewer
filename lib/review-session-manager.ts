import type { SupabaseClient } from '@supabase/supabase-js'
import type { CardClassification } from '@/types/database'

export interface SessionCard {
  cardId: string
  fen: string
  correctMove: string
  classification: CardClassification
  isNew: boolean
  theme: string | null
  note: string | null
  cpl: number | null
}

export interface ReviewSession {
  cards: SessionCard[]
  totalDue: number
  newCardsToday: number
}

export type ReviewMode = 'standard' | 'recent' | 'mistakes' | 'brilliancies'

export interface SessionOptions {
  dailyNewLimit?: number
  now?: Date
  mode?: ReviewMode
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
  best_move?: string | null
  classification: CardClassification
  game_played_at?: string | null
  theme?: string | null
  note?: string | null
  cpl?: number | null
}

const MISTAKE_CLASSIFICATIONS: CardClassification[] = ['blunder', 'mistake']
const BRILLIANCY_CLASSIFICATIONS: CardClassification[] = ['great', 'brilliant']

function applyModeFilter(cards: RawCard[], mode: ReviewMode, now: Date): RawCard[] {
  if (mode === 'standard') return cards
  if (mode === 'mistakes') return cards.filter((c) => MISTAKE_CLASSIFICATIONS.includes(c.classification))
  if (mode === 'brilliancies') return cards.filter((c) => BRILLIANCY_CLASSIFICATIONS.includes(c.classification))
  if (mode === 'recent') {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    return cards.filter(
      (c) => c.game_played_at != null && new Date(c.game_played_at) >= sevenDaysAgo,
    )
  }
  return cards
}

export async function buildReviewSession(
  userId: string,
  db: SupabaseClient,
  options: SessionOptions = {},
): Promise<ReviewSession> {
  const now = options.now ?? new Date()
  const dailyNewLimit = options.dailyNewLimit ?? 20
  const mode: ReviewMode = options.mode ?? 'standard'

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

  const filteredCardData = applyModeFilter((cardData ?? []) as RawCard[], mode, now)

  const cards: SessionCard[] = filteredCardData.map((c) => ({
    cardId: c.id,
    fen: c.fen,
    correctMove: c.best_move ?? c.correct_move,
    classification: c.classification,
    isNew: !dueIds.has(c.id),
    theme: c.theme ?? null,
    note: c.note ?? null,
    cpl: c.cpl ?? null,
  }))

  return { cards, totalDue: dueStates.length, newCardsToday: newReviewedToday }
}
