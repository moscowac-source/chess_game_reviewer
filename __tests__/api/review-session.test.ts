/**
 * @jest-environment node
 */

import { GET } from '@/app/api/review/session/route'
import { makeMockDb } from '@/__tests__/helpers/mock-db'

const PAST = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
const TODAY = new Date().toISOString()
const USER = '00000000-0000-0000-0000-000000000001'

function makeRequest(mode?: string) {
  const url = mode
    ? `http://localhost/api/review/session?mode=${mode}`
    : 'http://localhost/api/review/session'
  return new Request(url, { method: 'GET' })
}

describe('GET /api/review/session', () => {
  it('returns a session with the correct shape', async () => {
    const { db } = makeMockDb({
      card_state: [
        { card_id: 'card-1', user_id: USER, state: 'review', due_date: PAST, stability: 5, difficulty: 3, review_count: 2 },
        { card_id: 'card-2', user_id: USER, state: 'new', due_date: TODAY, stability: 0, difficulty: 0, review_count: 0 },
      ],
      cards: [
        { id: 'card-1', fen: 'fen1', correct_move: 'e4', classification: 'blunder' },
        { id: 'card-2', fen: 'fen2', correct_move: 'Nf3', classification: 'mistake' },
      ],
    })

    const response = await GET(makeRequest(), { db, authFn: async () => ({ id: USER }) })
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
    const { db } = makeMockDb()

    const response = await GET(makeRequest(), { db, authFn: async () => ({ id: USER }) })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.cards).toHaveLength(0)
    expect(body.totalDue).toBe(0)
  })

  it('mode=mistakes filters to only blunder/mistake cards via query param', async () => {
    const { db } = makeMockDb({
      card_state: [
        { card_id: 'card-blunder', user_id: USER, state: 'review', due_date: PAST, stability: 5, difficulty: 3, review_count: 2 },
        { card_id: 'card-great', user_id: USER, state: 'review', due_date: PAST, stability: 5, difficulty: 3, review_count: 2 },
      ],
      cards: [
        { id: 'card-blunder', fen: 'fen1', correct_move: 'e4', classification: 'blunder' },
        { id: 'card-great', fen: 'fen2', correct_move: 'Nf3', classification: 'great' },
      ],
    })

    const response = await GET(makeRequest('mistakes'), { db, authFn: async () => ({ id: USER }) })
    const body = await response.json()

    expect(response.status).toBe(200)
    const ids = body.cards.map((c: { cardId: string }) => c.cardId)
    expect(ids).toContain('card-blunder')
    expect(ids).not.toContain('card-great')
  })

  // Issue #35: session enforces the user's stored daily_new_limit, not a hardcoded cap
  it("caps new cards at the user's daily_new_limit from the users table", async () => {
    const { db } = makeMockDb({
      users: [{ id: USER, daily_new_limit: 7 }],
      card_state: Array.from({ length: 10 }, (_, i) => ({
        card_id: `new-card-${i}`,
        user_id: USER,
        state: 'new',
        due_date: TODAY,
        stability: 0,
        difficulty: 0,
        review_count: 0,
      })),
      cards: Array.from({ length: 10 }, (_, i) => ({
        id: `new-card-${i}`,
        fen: `fen-${i}`,
        correct_move: 'e4',
        classification: 'blunder',
      })),
    })

    const response = await GET(makeRequest(), {
      db,
      authFn: async () => ({ id: USER }),
    })
    const body = await response.json()

    expect(body.cards).toHaveLength(7)
  })
})
