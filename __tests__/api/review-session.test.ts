/**
 * @jest-environment node
 */

import { GET } from '@/app/api/review/session/route'

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

type Row = Record<string, unknown>

const PAST = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
const TODAY = new Date().toISOString()
const USER = '00000000-0000-0000-0000-000000000001'

function makeMockDb(cardStates: Row[] = [], cards: Row[] = [], reviewLogs: Row[] = []) {
  return {
    from: (table: string) => {
      if (table === 'card_state') {
        return {
          select: (_cols: string) => ({
            eq: (_col: string, _val: unknown) => ({
              data: cardStates,
              error: null,
              then: (resolve: (v: { data: Row[]; error: null }) => unknown) =>
                Promise.resolve({ data: cardStates, error: null }).then(resolve),
            }),
          }),
        }
      }
      if (table === 'review_log') {
        return {
          select: (_cols: string) => ({
            eq: (_col: string, _val: unknown) =>
              Promise.resolve({ data: reviewLogs, error: null }),
          }),
          insert: () => Promise.resolve({ error: null }),
        }
      }
      if (table === 'cards') {
        return {
          select: (_cols: string) => ({
            in: (_col: string, vals: unknown[]) =>
              Promise.resolve({
                data: cards.filter((c) => vals.includes(c['id'])),
                error: null,
              }),
          }),
        }
      }
      return {}
    },
  }
}

function makeRequest(mode?: string) {
  const url = mode
    ? `http://localhost/api/review/session?mode=${mode}`
    : 'http://localhost/api/review/session'
  return new Request(url, { method: 'GET' })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/review/session', () => {
  it('returns a session with the correct shape', async () => {
    const cardStates: Row[] = [
      { card_id: 'card-1', user_id: USER, state: 'review', due_date: PAST, stability: 5, difficulty: 3, review_count: 2 },
      { card_id: 'card-2', user_id: USER, state: 'new', due_date: TODAY, stability: 0, difficulty: 0, review_count: 0 },
    ]
    const cards: Row[] = [
      { id: 'card-1', fen: 'fen1', correct_move: 'e4', classification: 'blunder' },
      { id: 'card-2', fen: 'fen2', correct_move: 'Nf3', classification: 'mistake' },
    ]
    const db = makeMockDb(cardStates, cards)

    const response = await GET(makeRequest(), { db: db as never })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toHaveProperty('cards')
    expect(body).toHaveProperty('totalDue')
    expect(body).toHaveProperty('newCardsToday')
    expect(Array.isArray(body.cards)).toBe(true)
    expect(body.cards).toHaveLength(2)
    expect(body.totalDue).toBe(1)
  })

  it('returns an empty session when no cards exist', async () => {
    const db = makeMockDb([], [])

    const response = await GET(makeRequest(), { db: db as never })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.cards).toHaveLength(0)
    expect(body.totalDue).toBe(0)
  })

  it('mode=mistakes filters to only blunder/mistake cards via query param', async () => {
    const cardStates: Row[] = [
      { card_id: 'card-blunder', user_id: USER, state: 'review', due_date: PAST, stability: 5, difficulty: 3, review_count: 2 },
      { card_id: 'card-great',   user_id: USER, state: 'review', due_date: PAST, stability: 5, difficulty: 3, review_count: 2 },
    ]
    const cards: Row[] = [
      { id: 'card-blunder', fen: 'fen1', correct_move: 'e4',  classification: 'blunder' },
      { id: 'card-great',   fen: 'fen2', correct_move: 'Nf3', classification: 'great' },
    ]
    const db = makeMockDb(cardStates, cards)

    const response = await GET(makeRequest('mistakes'), { db: db as never })
    const body = await response.json()

    expect(response.status).toBe(200)
    const ids = body.cards.map((c: { cardId: string }) => c.cardId)
    expect(ids).toContain('card-blunder')
    expect(ids).not.toContain('card-great')
  })
})
