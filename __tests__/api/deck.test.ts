/**
 * @jest-environment node
 */

import { GET } from '@/app/api/deck/route'
import { makeMockDb } from '@/__tests__/helpers/mock-db'

const USER = '00000000-0000-0000-0000-000000000001'

function makeGetRequest(query = '') {
  return new Request(`http://localhost/api/deck${query}`, { method: 'GET' })
}

interface CardRow {
  id: string
  fen: string
  classification: string
  theme: string | null
  correct_move?: string
  created_at: string
}

interface StateRow {
  id?: string
  user_id: string
  card_id: string
  due_date: string
  review_count: number
  stability: number
}

function seedWith(cards: CardRow[], states: StateRow[]) {
  return { cards, card_state: states } as unknown as Record<string, Record<string, unknown>[]>
}

describe('GET /api/deck', () => {
  it('returns 401 when no authenticated user', async () => {
    const { db } = makeMockDb({})
    const response = await GET(makeGetRequest(), { db, authFn: async () => null })
    expect(response.status).toBe(401)
  })

  it('returns empty list and total 0 when the user has no card_state rows', async () => {
    const { db } = makeMockDb({ card_state: [] })
    const response = await GET(makeGetRequest(), { db, authFn: async () => ({ id: USER }) })
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body).toEqual({ items: [], total: 0 })
  })

  it('joins card_state with cards and returns merged rows with total', async () => {
    const cards: CardRow[] = [
      { id: 'c1', fen: 'FEN1', classification: 'blunder', theme: 'tactics', created_at: '2026-01-10T00:00:00Z' },
      { id: 'c2', fen: 'FEN2', classification: 'mistake', theme: 'opening', created_at: '2026-01-20T00:00:00Z' },
    ]
    const states: StateRow[] = [
      { user_id: USER, card_id: 'c1', due_date: '2026-04-25T00:00:00Z', review_count: 3, stability: 4.5 },
      { user_id: USER, card_id: 'c2', due_date: '2026-04-22T00:00:00Z', review_count: 1, stability: 1.2 },
    ]
    const { db } = makeMockDb(seedWith(cards, states))

    const response = await GET(makeGetRequest(), { db, authFn: async () => ({ id: USER }) })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.total).toBe(2)
    // default sort = due (ascending)
    expect(body.items.map((i: { id: string }) => i.id)).toEqual(['c2', 'c1'])
    expect(body.items[0]).toMatchObject({
      id: 'c2',
      fen: 'FEN2',
      classification: 'mistake',
      theme: 'opening',
      due_date: '2026-04-22T00:00:00Z',
      review_count: 1,
      stability: 1.2,
    })
  })

  it('filters by classification', async () => {
    const cards: CardRow[] = [
      { id: 'c1', fen: 'F1', classification: 'blunder', theme: 'tactics', created_at: '2026-01-10T00:00:00Z' },
      { id: 'c2', fen: 'F2', classification: 'great', theme: 'tactics', created_at: '2026-01-20T00:00:00Z' },
    ]
    const states: StateRow[] = [
      { user_id: USER, card_id: 'c1', due_date: '2026-04-22T00:00:00Z', review_count: 0, stability: 1 },
      { user_id: USER, card_id: 'c2', due_date: '2026-04-23T00:00:00Z', review_count: 0, stability: 1 },
    ]
    const { db } = makeMockDb(seedWith(cards, states))

    const response = await GET(makeGetRequest('?classification=blunder'), { db, authFn: async () => ({ id: USER }) })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.total).toBe(1)
    expect(body.items.map((i: { id: string }) => i.id)).toEqual(['c1'])
  })

  it('filters by theme', async () => {
    const cards: CardRow[] = [
      { id: 'c1', fen: 'F1', classification: 'blunder', theme: 'endgame', created_at: '2026-01-10T00:00:00Z' },
      { id: 'c2', fen: 'F2', classification: 'blunder', theme: 'tactics', created_at: '2026-01-20T00:00:00Z' },
    ]
    const states: StateRow[] = [
      { user_id: USER, card_id: 'c1', due_date: '2026-04-22T00:00:00Z', review_count: 0, stability: 1 },
      { user_id: USER, card_id: 'c2', due_date: '2026-04-23T00:00:00Z', review_count: 0, stability: 1 },
    ]
    const { db } = makeMockDb(seedWith(cards, states))

    const response = await GET(makeGetRequest('?theme=endgame'), { db, authFn: async () => ({ id: USER }) })
    const body = await response.json()

    expect(body.items.map((i: { id: string }) => i.id)).toEqual(['c1'])
  })

  it('sorts by reviews (most-reviewed first)', async () => {
    const cards: CardRow[] = [
      { id: 'c1', fen: 'F1', classification: 'blunder', theme: null, created_at: '2026-01-10T00:00:00Z' },
      { id: 'c2', fen: 'F2', classification: 'blunder', theme: null, created_at: '2026-01-20T00:00:00Z' },
      { id: 'c3', fen: 'F3', classification: 'blunder', theme: null, created_at: '2026-01-05T00:00:00Z' },
    ]
    const states: StateRow[] = [
      { user_id: USER, card_id: 'c1', due_date: '2026-04-22T00:00:00Z', review_count: 2, stability: 1 },
      { user_id: USER, card_id: 'c2', due_date: '2026-04-23T00:00:00Z', review_count: 7, stability: 1 },
      { user_id: USER, card_id: 'c3', due_date: '2026-04-24T00:00:00Z', review_count: 4, stability: 1 },
    ]
    const { db } = makeMockDb(seedWith(cards, states))

    const response = await GET(makeGetRequest('?sort=reviews'), { db, authFn: async () => ({ id: USER }) })
    const body = await response.json()

    expect(body.items.map((i: { id: string }) => i.id)).toEqual(['c2', 'c3', 'c1'])
  })

  it('sorts by created (newest first)', async () => {
    const cards: CardRow[] = [
      { id: 'c1', fen: 'F1', classification: 'blunder', theme: null, created_at: '2026-01-10T00:00:00Z' },
      { id: 'c2', fen: 'F2', classification: 'blunder', theme: null, created_at: '2026-03-01T00:00:00Z' },
    ]
    const states: StateRow[] = [
      { user_id: USER, card_id: 'c1', due_date: '2026-04-22T00:00:00Z', review_count: 0, stability: 1 },
      { user_id: USER, card_id: 'c2', due_date: '2026-04-23T00:00:00Z', review_count: 0, stability: 1 },
    ]
    const { db } = makeMockDb(seedWith(cards, states))

    const response = await GET(makeGetRequest('?sort=created'), { db, authFn: async () => ({ id: USER }) })
    const body = await response.json()

    expect(body.items.map((i: { id: string }) => i.id)).toEqual(['c2', 'c1'])
  })

  it('applies limit and offset to paginate', async () => {
    const cards: CardRow[] = [1, 2, 3, 4, 5].map((n) => ({
      id: `c${n}`, fen: `F${n}`, classification: 'blunder', theme: null, created_at: `2026-01-0${n}T00:00:00Z`,
    }))
    const states: StateRow[] = [1, 2, 3, 4, 5].map((n) => ({
      user_id: USER, card_id: `c${n}`, due_date: `2026-04-2${n}T00:00:00Z`, review_count: 0, stability: 1,
    }))
    const { db } = makeMockDb(seedWith(cards, states))

    const response = await GET(makeGetRequest('?limit=2&offset=2'), { db, authFn: async () => ({ id: USER }) })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.total).toBe(5)
    expect(body.items.map((i: { id: string }) => i.id)).toEqual(['c3', 'c4'])
  })

  it.each([
    ['classification', '?classification=bogus'],
    ['theme', '?theme=bogus'],
    ['sort', '?sort=bogus'],
    ['negative limit', '?limit=-1'],
    ['zero limit', '?limit=0'],
    ['over-max limit', '?limit=101'],
    ['non-numeric limit', '?limit=abc'],
    ['non-numeric offset', '?offset=xyz'],
  ])('returns 400 for invalid %s', async (_label, query) => {
    const { db } = makeMockDb({ card_state: [] })
    const response = await GET(makeGetRequest(query), { db, authFn: async () => ({ id: USER }) })
    expect(response.status).toBe(400)
  })

  it('scopes results to the authenticated user only', async () => {
    const OTHER = '00000000-0000-0000-0000-000000000002'
    const cards: CardRow[] = [
      { id: 'c1', fen: 'F1', classification: 'blunder', theme: null, created_at: '2026-01-10T00:00:00Z' },
      { id: 'c2', fen: 'F2', classification: 'blunder', theme: null, created_at: '2026-01-20T00:00:00Z' },
    ]
    const states: StateRow[] = [
      { user_id: USER, card_id: 'c1', due_date: '2026-04-22T00:00:00Z', review_count: 0, stability: 1 },
      { user_id: OTHER, card_id: 'c2', due_date: '2026-04-23T00:00:00Z', review_count: 0, stability: 1 },
    ]
    const { db } = makeMockDb(seedWith(cards, states))

    const response = await GET(makeGetRequest(), { db, authFn: async () => ({ id: USER }) })
    const body = await response.json()

    expect(body.total).toBe(1)
    expect(body.items.map((i: { id: string }) => i.id)).toEqual(['c1'])
  })
})
