import { NextResponse } from 'next/server'
import { withAuthedRoute } from '@/lib/with-authed-route'
import { apiError } from '@/lib/api-response'

const DEFAULT_LIMIT = 24
const MAX_LIMIT = 100

const CLASSIFICATIONS = ['blunder', 'mistake', 'great', 'brilliant'] as const
const THEMES = ['opening', 'endgame', 'tactics'] as const
const SORTS = ['due', 'reviews', 'created'] as const

type Classification = typeof CLASSIFICATIONS[number]
type Theme = typeof THEMES[number]
type Sort = typeof SORTS[number]

interface CardStateRow {
  card_id: string
  due_date: string
  review_count: number
  stability: number
}

interface CardRow {
  id: string
  fen: string
  classification: string
  theme: string | null
  created_at: string
}

function parsePositiveInt(raw: string | null, fallback: number, max: number): number | 'invalid' {
  if (raw === null) return fallback
  if (!/^\d+$/.test(raw)) return 'invalid'
  const n = parseInt(raw, 10)
  if (n < 0 || n > max) return 'invalid'
  return n
}

export const GET = withAuthedRoute(async ({ req, db, user }) => {
  const { searchParams } = new URL(req.url)

  const classification = searchParams.get('classification')
  if (classification !== null && !CLASSIFICATIONS.includes(classification as Classification)) {
    return apiError(400, 'Invalid classification')
  }

  const theme = searchParams.get('theme')
  if (theme !== null && !THEMES.includes(theme as Theme)) {
    return apiError(400, 'Invalid theme')
  }

  const rawSort = searchParams.get('sort') ?? 'due'
  if (!SORTS.includes(rawSort as Sort)) return apiError(400, 'Invalid sort')
  const sort = rawSort as Sort

  const limitRaw = searchParams.get('limit')
  const limit = parsePositiveInt(limitRaw, DEFAULT_LIMIT, MAX_LIMIT)
  if (limit === 'invalid' || limit < 1) return apiError(400, 'Invalid limit')

  const offsetRaw = searchParams.get('offset')
  const offset = parsePositiveInt(offsetRaw, 0, Number.MAX_SAFE_INTEGER)
  if (offset === 'invalid') return apiError(400, 'Invalid offset')

  const { data: stateRows, error: stateError } = (await db
    .from('card_state')
    .select('card_id, due_date, review_count, stability')
    .eq('user_id', user.id)) as { data: CardStateRow[] | null; error: { message: string } | null }

  if (stateError) return apiError(500, stateError.message)

  const states = stateRows ?? []
  if (states.length === 0) return NextResponse.json({ items: [], total: 0 })

  const cardIds = states.map((s) => s.card_id)

  let cardsQuery = db
    .from('cards')
    .select('id, fen, classification, theme, created_at')
    .in('id', cardIds)
  if (classification !== null) cardsQuery = cardsQuery.eq('classification', classification)
  if (theme !== null) cardsQuery = cardsQuery.eq('theme', theme)

  const { data: cardRows, error: cardsError } = (await cardsQuery) as {
    data: CardRow[] | null
    error: { message: string } | null
  }
  if (cardsError) return apiError(500, cardsError.message)

  const cardsById = new Map<string, CardRow>()
  for (const c of cardRows ?? []) cardsById.set(c.id, c)

  const merged = states
    .filter((s) => cardsById.has(s.card_id))
    .map((s) => {
      const c = cardsById.get(s.card_id)!
      return {
        id: c.id,
        fen: c.fen,
        classification: c.classification,
        theme: c.theme,
        created_at: c.created_at,
        due_date: s.due_date,
        review_count: s.review_count,
        stability: s.stability,
      }
    })

  merged.sort((a, b) => {
    if (sort === 'due') return a.due_date < b.due_date ? -1 : a.due_date > b.due_date ? 1 : 0
    if (sort === 'reviews') return b.review_count - a.review_count
    return a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0
  })

  const total = merged.length
  const items = merged.slice(offset, offset + limit)

  return NextResponse.json({ items, total })
})
