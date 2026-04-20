/**
 * @jest-environment node
 */

import { GET } from '@/app/api/stats/accuracy/route'

type Row = Record<string, unknown>

const USER = '00000000-0000-0000-0000-000000000001'

function makeMockDb(reviewLogs: Row[] = []) {
  let capturedCutoff: string | null = null
  const db = {
    from: (table: string) => {
      if (table === 'review_log') {
        return {
          select: (_cols: string) => ({
            eq: (_col: string, _val: unknown) => ({
              gte: (_col2: string, cutoff: string) => {
                capturedCutoff = cutoff
                const filtered = reviewLogs.filter(
                  (r) => new Date(r.reviewed_at as string) >= new Date(cutoff),
                )
                return Promise.resolve({ data: filtered, error: null })
              },
            }),
          }),
        }
      }
      return {}
    },
    getCapturedCutoff: () => capturedCutoff,
  }
  return db
}

describe('GET /api/stats/accuracy', () => {
  it('returns 401 when unauthenticated', async () => {
    const db = makeMockDb()
    const req = new Request('http://localhost/api/stats/accuracy?days=7')
    const response = await GET(req, { db: db as never, authFn: async () => null })
    expect(response.status).toBe(401)
  })

  it('returns null accuracy when the user has no reviews in the window', async () => {
    const db = makeMockDb([])
    const req = new Request('http://localhost/api/stats/accuracy?days=7')
    const response = await GET(req, {
      db: db as never,
      authFn: async () => ({ id: USER }),
      now: () => new Date('2026-04-20T12:00:00Z'),
    })
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body).toEqual({ accuracy: null, totalReviews: 0 })
  })

  it('computes accuracy from review_log ratings', async () => {
    const reviewLogs: Row[] = [
      { rating: 'easy', reviewed_at: '2026-04-20T09:00:00Z' },
      { rating: 'good', reviewed_at: '2026-04-19T11:00:00Z' },
      { rating: 'good', reviewed_at: '2026-04-18T08:00:00Z' },
      { rating: 'hard', reviewed_at: '2026-04-17T08:00:00Z' },
      { rating: 'again', reviewed_at: '2026-04-16T08:00:00Z' },
    ]
    const db = makeMockDb(reviewLogs)
    const req = new Request('http://localhost/api/stats/accuracy?days=7')
    const response = await GET(req, {
      db: db as never,
      authFn: async () => ({ id: USER }),
      now: () => new Date('2026-04-20T12:00:00Z'),
    })
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body).toEqual({ accuracy: 60, totalReviews: 5 })
  })

  it('excludes reviews older than the window', async () => {
    const reviewLogs: Row[] = [
      { rating: 'easy', reviewed_at: '2026-04-20T09:00:00Z' },
      { rating: 'again', reviewed_at: '2026-04-10T09:00:00Z' },
    ]
    const db = makeMockDb(reviewLogs)
    const req = new Request('http://localhost/api/stats/accuracy?days=7')
    const response = await GET(req, {
      db: db as never,
      authFn: async () => ({ id: USER }),
      now: () => new Date('2026-04-20T12:00:00Z'),
    })
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body).toEqual({ accuracy: 100, totalReviews: 1 })
  })

  it('returns 100 when all reviews are good or easy', async () => {
    const reviewLogs: Row[] = [
      { rating: 'good', reviewed_at: '2026-04-20T09:00:00Z' },
      { rating: 'easy', reviewed_at: '2026-04-19T09:00:00Z' },
    ]
    const db = makeMockDb(reviewLogs)
    const req = new Request('http://localhost/api/stats/accuracy?days=7')
    const response = await GET(req, {
      db: db as never,
      authFn: async () => ({ id: USER }),
      now: () => new Date('2026-04-20T12:00:00Z'),
    })
    const body = await response.json()
    expect(body).toEqual({ accuracy: 100, totalReviews: 2 })
  })

  it('returns 0 when all reviews are again or hard', async () => {
    const reviewLogs: Row[] = [
      { rating: 'again', reviewed_at: '2026-04-20T09:00:00Z' },
      { rating: 'hard', reviewed_at: '2026-04-19T09:00:00Z' },
    ]
    const db = makeMockDb(reviewLogs)
    const req = new Request('http://localhost/api/stats/accuracy?days=7')
    const response = await GET(req, {
      db: db as never,
      authFn: async () => ({ id: USER }),
      now: () => new Date('2026-04-20T12:00:00Z'),
    })
    const body = await response.json()
    expect(body).toEqual({ accuracy: 0, totalReviews: 2 })
  })

  it('includes reviews exactly at the window boundary', async () => {
    const reviewLogs: Row[] = [
      { rating: 'good', reviewed_at: '2026-04-13T12:00:00Z' },
      { rating: 'again', reviewed_at: '2026-04-13T11:59:59Z' },
    ]
    const db = makeMockDb(reviewLogs)
    const req = new Request('http://localhost/api/stats/accuracy?days=7')
    const response = await GET(req, {
      db: db as never,
      authFn: async () => ({ id: USER }),
      now: () => new Date('2026-04-20T12:00:00Z'),
    })
    const body = await response.json()
    expect(body).toEqual({ accuracy: 100, totalReviews: 1 })
  })

  it('returns 400 when days is above the max', async () => {
    const db = makeMockDb()
    const req = new Request('http://localhost/api/stats/accuracy?days=31')
    const response = await GET(req, {
      db: db as never,
      authFn: async () => ({ id: USER }),
    })
    expect(response.status).toBe(400)
  })

  it('rounds accuracy to a whole number', async () => {
    const reviewLogs: Row[] = [
      { rating: 'good', reviewed_at: '2026-04-20T09:00:00Z' },
      { rating: 'good', reviewed_at: '2026-04-20T09:01:00Z' },
      { rating: 'again', reviewed_at: '2026-04-20T09:02:00Z' },
    ]
    const db = makeMockDb(reviewLogs)
    const req = new Request('http://localhost/api/stats/accuracy?days=7')
    const response = await GET(req, {
      db: db as never,
      authFn: async () => ({ id: USER }),
      now: () => new Date('2026-04-20T12:00:00Z'),
    })
    const body = await response.json()
    expect(body).toEqual({ accuracy: 67, totalReviews: 3 })
  })

  it('returns 400 when days is out of range', async () => {
    const db = makeMockDb()
    const req = new Request('http://localhost/api/stats/accuracy?days=0')
    const response = await GET(req, {
      db: db as never,
      authFn: async () => ({ id: USER }),
    })
    expect(response.status).toBe(400)
  })

  it('returns 400 when days is not an integer', async () => {
    const db = makeMockDb()
    const req = new Request('http://localhost/api/stats/accuracy?days=abc')
    const response = await GET(req, {
      db: db as never,
      authFn: async () => ({ id: USER }),
    })
    expect(response.status).toBe(400)
  })

  it('defaults to 7 days when the param is omitted', async () => {
    const db = makeMockDb([])
    const req = new Request('http://localhost/api/stats/accuracy')
    await GET(req, {
      db: db as never,
      authFn: async () => ({ id: USER }),
      now: () => new Date('2026-04-20T12:00:00Z'),
    })
    const cutoff = db.getCapturedCutoff()
    expect(cutoff).not.toBeNull()
    const cutoffDate = new Date(cutoff as string)
    const expected = new Date('2026-04-13T12:00:00Z')
    expect(cutoffDate.getTime()).toBe(expected.getTime())
  })
})
