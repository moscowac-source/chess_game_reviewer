/**
 * @jest-environment node
 */

import { GET } from '@/app/api/games/recent/route'

const USER = '00000000-0000-0000-0000-000000000001'

type GameRow = {
  id: string
  user_id: string
  played_at: string
  white: string | null
  black: string | null
  result: string | null
  url: string | null
  eco: string | null
}
type CardStateRow = { card_id: string; user_id: string }
type CardRow = { id: string; game_id: string | null }

function makeMockDb(
  games: GameRow[] = [],
  cardStates: CardStateRow[] = [],
  cards: CardRow[] = [],
  chessComUsername: string | null = 'alice',
) {
  return {
    from: (table: string) => {
      if (table === 'users') {
        return {
          select: (_cols: string) => ({
            eq: (_col: string, _val: string) => ({
              single: () =>
                Promise.resolve({
                  data: { chess_com_username: chessComUsername },
                  error: null,
                }),
            }),
          }),
        }
      }
      if (table === 'games') {
        const filters: Record<string, string> = {}
        let order: { col: string; desc: boolean } | null = null
        let limit: number | null = null
        const chain = {
          select: (_cols: string) => chain,
          eq: (col: string, val: string) => {
            filters[col] = val
            return chain
          },
          order: (col: string, opts: { ascending: boolean }) => {
            order = { col, desc: !opts.ascending }
            return chain
          },
          limit: (n: number) => {
            limit = n
            return chain
          },
          then: (resolve: (v: { data: GameRow[]; error: null }) => void) => {
            let result = games.filter((g) =>
              Object.entries(filters).every(([k, v]) => (g as Record<string, unknown>)[k] === v),
            )
            if (order) {
              const { col, desc } = order
              result = [...result].sort((a, b) => {
                const av = (a as Record<string, unknown>)[col] as string
                const bv = (b as Record<string, unknown>)[col] as string
                return desc ? bv.localeCompare(av) : av.localeCompare(bv)
              })
            }
            if (limit !== null) result = result.slice(0, limit)
            resolve({ data: result, error: null })
          },
        }
        return chain
      }
      if (table === 'card_state') {
        return {
          select: (_cols: string) => ({
            eq: (_col: string, userId: string) =>
              Promise.resolve({
                data: cardStates.filter((s) => s.user_id === userId),
                error: null,
              }),
          }),
        }
      }
      if (table === 'cards') {
        return {
          select: (_cols: string) => ({
            in: (_col: string, ids: string[]) =>
              Promise.resolve({
                data: cards.filter((c) => ids.includes(c.id)),
                error: null,
              }),
          }),
        }
      }
      return {}
    },
  }
}

function makeReq(query = '') {
  return new Request(`http://localhost/api/games/recent${query}`)
}

function makeGame(overrides: Partial<GameRow>): GameRow {
  return {
    id: 'g-default',
    user_id: USER,
    played_at: '2024-01-01T00:00:00.000Z',
    white: 'alice',
    black: 'bob',
    result: '1-0',
    url: 'https://www.chess.com/game/live/default',
    eco: 'C50',
    ...overrides,
  }
}

describe('GET /api/games/recent', () => {
  it('returns 401 when unauthenticated', async () => {
    const db = makeMockDb()
    const response = await GET(makeReq(), { db: db as never, authFn: async () => null })
    expect(response.status).toBe(401)
  })

  it('returns an empty array when the user has no games', async () => {
    const db = makeMockDb([], [], [])
    const response = await GET(makeReq(), {
      db: db as never,
      authFn: async () => ({ id: USER }),
    })
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body).toEqual([])
  })

  it('returns games ordered by played_at descending', async () => {
    const games = [
      makeGame({ id: 'g1', played_at: '2024-01-01T00:00:00.000Z' }),
      makeGame({ id: 'g2', played_at: '2024-03-01T00:00:00.000Z' }),
      makeGame({ id: 'g3', played_at: '2024-02-01T00:00:00.000Z' }),
    ]
    const db = makeMockDb(games)
    const response = await GET(makeReq(), {
      db: db as never,
      authFn: async () => ({ id: USER }),
    })
    const body = await response.json()
    expect(body.map((g: { id: string }) => g.id)).toEqual(['g2', 'g3', 'g1'])
  })

  it('defaults to 5 games when no limit query param is supplied', async () => {
    const games = Array.from({ length: 8 }, (_, i) =>
      makeGame({ id: `g${i}`, played_at: `2024-0${i + 1}-01T00:00:00.000Z`.padStart(24, '2') }),
    )
    const db = makeMockDb(games)
    const response = await GET(makeReq(), {
      db: db as never,
      authFn: async () => ({ id: USER }),
    })
    const body = await response.json()
    expect(body).toHaveLength(5)
  })

  it('honors a valid limit in the range 1-10', async () => {
    const games = Array.from({ length: 8 }, (_, i) =>
      makeGame({ id: `g${i}`, played_at: `2024-0${i + 1}-01T00:00:00.000Z`.padStart(24, '2') }),
    )
    const db = makeMockDb(games)
    const response = await GET(makeReq('?limit=3'), {
      db: db as never,
      authFn: async () => ({ id: USER }),
    })
    const body = await response.json()
    expect(body).toHaveLength(3)
  })

  it('returns 400 for a non-integer limit', async () => {
    const db = makeMockDb()
    const response = await GET(makeReq('?limit=banana'), {
      db: db as never,
      authFn: async () => ({ id: USER }),
    })
    expect(response.status).toBe(400)
  })

  it('returns 400 for a limit below 1', async () => {
    const db = makeMockDb()
    const response = await GET(makeReq('?limit=0'), {
      db: db as never,
      authFn: async () => ({ id: USER }),
    })
    expect(response.status).toBe(400)
  })

  it('returns 400 for a limit above 10', async () => {
    const db = makeMockDb()
    const response = await GET(makeReq('?limit=11'), {
      db: db as never,
      authFn: async () => ({ id: USER }),
    })
    expect(response.status).toBe(400)
  })

  it("includes each game's per-user cardCount", async () => {
    const games = [makeGame({ id: 'g1' }), makeGame({ id: 'g2', url: 'https://www.chess.com/game/live/2', played_at: '2023-12-01T00:00:00.000Z' })]
    const cardStates: CardStateRow[] = [
      { card_id: 'c1', user_id: USER },
      { card_id: 'c2', user_id: USER },
      { card_id: 'c3', user_id: USER },
    ]
    const cards: CardRow[] = [
      { id: 'c1', game_id: 'g1' },
      { id: 'c2', game_id: 'g1' },
      { id: 'c3', game_id: 'g2' },
    ]
    const db = makeMockDb(games, cardStates, cards)
    const response = await GET(makeReq(), {
      db: db as never,
      authFn: async () => ({ id: USER }),
    })
    const body = await response.json()
    const byId = Object.fromEntries(body.map((g: { id: string; cardCount: number }) => [g.id, g.cardCount]))
    expect(byId).toEqual({ g1: 2, g2: 1 })
  })

  it('does not count cards owned by another user', async () => {
    const OTHER = '00000000-0000-0000-0000-000000000002'
    const games = [makeGame({ id: 'g1' })]
    const cardStates: CardStateRow[] = [
      { card_id: 'c1', user_id: USER },
      { card_id: 'c2', user_id: OTHER },
    ]
    const cards: CardRow[] = [
      { id: 'c1', game_id: 'g1' },
      { id: 'c2', game_id: 'g1' },
    ]
    const db = makeMockDb(games, cardStates, cards)
    const response = await GET(makeReq(), {
      db: db as never,
      authFn: async () => ({ id: USER }),
    })
    const body = await response.json()
    expect(body[0].cardCount).toBe(1)
  })

  it('returns cardCount 0 for games with no user-owned cards', async () => {
    const games = [makeGame({ id: 'g1' })]
    const db = makeMockDb(games, [], [])
    const response = await GET(makeReq(), {
      db: db as never,
      authFn: async () => ({ id: USER }),
    })
    const body = await response.json()
    expect(body[0].cardCount).toBe(0)
  })

  it('reports opponent and outcome=win when user played white and result is 1-0', async () => {
    const games = [makeGame({ id: 'g1', white: 'alice', black: 'bob', result: '1-0' })]
    const db = makeMockDb(games, [], [], 'alice')
    const response = await GET(makeReq(), {
      db: db as never,
      authFn: async () => ({ id: USER }),
    })
    const body = await response.json()
    expect(body[0]).toMatchObject({ opponent: 'bob', outcome: 'win' })
  })

  it('reports outcome=loss when user played white and result is 0-1', async () => {
    const games = [makeGame({ id: 'g1', white: 'alice', black: 'bob', result: '0-1' })]
    const db = makeMockDb(games, [], [], 'alice')
    const response = await GET(makeReq(), {
      db: db as never,
      authFn: async () => ({ id: USER }),
    })
    const body = await response.json()
    expect(body[0]).toMatchObject({ opponent: 'bob', outcome: 'loss' })
  })

  it('reports outcome=win when user played black and result is 0-1', async () => {
    const games = [makeGame({ id: 'g1', white: 'alice', black: 'bob', result: '0-1' })]
    const db = makeMockDb(games, [], [], 'bob')
    const response = await GET(makeReq(), {
      db: db as never,
      authFn: async () => ({ id: USER }),
    })
    const body = await response.json()
    expect(body[0]).toMatchObject({ opponent: 'alice', outcome: 'win' })
  })

  it('reports outcome=draw for a 1/2-1/2 result', async () => {
    const games = [makeGame({ id: 'g1', white: 'alice', black: 'bob', result: '1/2-1/2' })]
    const db = makeMockDb(games, [], [], 'alice')
    const response = await GET(makeReq(), {
      db: db as never,
      authFn: async () => ({ id: USER }),
    })
    const body = await response.json()
    expect(body[0]).toMatchObject({ outcome: 'draw' })
  })

  it('matches chess_com_username case-insensitively against white/black names', async () => {
    const games = [makeGame({ id: 'g1', white: 'Alice', black: 'bob', result: '1-0' })]
    const db = makeMockDb(games, [], [], 'alice')
    const response = await GET(makeReq(), {
      db: db as never,
      authFn: async () => ({ id: USER }),
    })
    const body = await response.json()
    expect(body[0]).toMatchObject({ opponent: 'bob', outcome: 'win' })
  })

  it('reports outcome=unknown and opponent=null when the user matches neither side', async () => {
    const games = [makeGame({ id: 'g1', white: 'charlie', black: 'dave', result: '1-0' })]
    const db = makeMockDb(games, [], [], 'alice')
    const response = await GET(makeReq(), {
      db: db as never,
      authFn: async () => ({ id: USER }),
    })
    const body = await response.json()
    expect(body[0]).toMatchObject({ opponent: null, outcome: 'unknown' })
  })

  it('only returns games for the authenticated user', async () => {
    const OTHER = '00000000-0000-0000-0000-000000000002'
    const games = [
      makeGame({ id: 'g1', user_id: USER }),
      makeGame({ id: 'g2', user_id: OTHER }),
    ]
    const db = makeMockDb(games)
    const response = await GET(makeReq(), {
      db: db as never,
      authFn: async () => ({ id: USER }),
    })
    const body = await response.json()
    expect(body.map((g: { id: string }) => g.id)).toEqual(['g1'])
  })
})
