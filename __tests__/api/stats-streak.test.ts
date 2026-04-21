/**
 * @jest-environment node
 */

import { GET } from '@/app/api/stats/streak/route'
import { makeMockDb } from '@/__tests__/helpers/mock-db'

const USER = '00000000-0000-0000-0000-000000000001'

describe('GET /api/stats/streak', () => {
  it('returns 401 when unauthenticated', async () => {
    const { db } = makeMockDb()
    const req = new Request('http://localhost/api/stats/streak')
    const response = await GET(req, { db, authFn: async () => null })
    expect(response.status).toBe(401)
  })

  it('returns 0 when the user has no reviews', async () => {
    const { db } = makeMockDb({ review_log: [] })
    const req = new Request('http://localhost/api/stats/streak')
    const response = await GET(req, {
      db,
      authFn: async () => ({ id: USER }),
      now: () => new Date('2026-04-20T12:00:00Z'),
    })
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body).toEqual({ streak: 0 })
  })

  it('returns the correct streak from review_log rows', async () => {
    const { db } = makeMockDb({
      review_log: [
        { user_id: USER, reviewed_at: '2026-04-20T09:00:00Z' },
        { user_id: USER, reviewed_at: '2026-04-20T20:00:00Z' },
        { user_id: USER, reviewed_at: '2026-04-19T11:00:00Z' },
        { user_id: USER, reviewed_at: '2026-04-18T08:00:00Z' },
        // gap at 2026-04-17
        { user_id: USER, reviewed_at: '2026-04-16T08:00:00Z' },
      ],
    })
    const req = new Request('http://localhost/api/stats/streak')
    const response = await GET(req, {
      db,
      authFn: async () => ({ id: USER }),
      now: () => new Date('2026-04-20T12:00:00Z'),
    })
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body).toEqual({ streak: 3 })
  })
})
