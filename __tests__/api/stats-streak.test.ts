/**
 * @jest-environment node
 */

import { GET } from '@/app/api/stats/streak/route'

type Row = Record<string, unknown>

const USER = '00000000-0000-0000-0000-000000000001'

function makeMockDb(reviewLogs: Row[] = []) {
  return {
    from: (table: string) => {
      if (table === 'review_log') {
        return {
          select: (_cols: string) => ({
            eq: (_col: string, _val: unknown) =>
              Promise.resolve({ data: reviewLogs, error: null }),
          }),
        }
      }
      return {}
    },
  }
}

describe('GET /api/stats/streak', () => {
  it('returns 401 when unauthenticated', async () => {
    const db = makeMockDb()
    const req = new Request('http://localhost/api/stats/streak')
    const response = await GET(req, { db: db as never, authFn: async () => null })
    expect(response.status).toBe(401)
  })

  it('returns 0 when the user has no reviews', async () => {
    const db = makeMockDb([])
    const req = new Request('http://localhost/api/stats/streak')
    const response = await GET(req, {
      db: db as never,
      authFn: async () => ({ id: USER }),
      now: () => new Date('2026-04-20T12:00:00Z'),
    })
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body).toEqual({ streak: 0 })
  })

  it('returns the correct streak from review_log rows', async () => {
    const reviewLogs: Row[] = [
      { reviewed_at: '2026-04-20T09:00:00Z' },
      { reviewed_at: '2026-04-20T20:00:00Z' },
      { reviewed_at: '2026-04-19T11:00:00Z' },
      { reviewed_at: '2026-04-18T08:00:00Z' },
      // gap at 2026-04-17
      { reviewed_at: '2026-04-16T08:00:00Z' },
    ]
    const db = makeMockDb(reviewLogs)
    const req = new Request('http://localhost/api/stats/streak')
    const response = await GET(req, {
      db: db as never,
      authFn: async () => ({ id: USER }),
      now: () => new Date('2026-04-20T12:00:00Z'),
    })
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body).toEqual({ streak: 3 })
  })
})
