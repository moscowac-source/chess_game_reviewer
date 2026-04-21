/**
 * @jest-environment node
 */

import { GET } from '@/app/api/stats/classification/route'
import { makeMockDb } from '@/__tests__/helpers/mock-db'

const USER = '00000000-0000-0000-0000-000000000001'

describe('GET /api/stats/classification', () => {
  it('returns 401 when unauthenticated', async () => {
    const { db } = makeMockDb()
    const req = new Request('http://localhost/api/stats/classification')
    const response = await GET(req, { db, authFn: async () => null })
    expect(response.status).toBe(401)
  })

  it('returns zeros when the user has no cards', async () => {
    const { db } = makeMockDb()
    const req = new Request('http://localhost/api/stats/classification')
    const response = await GET(req, {
      db,
      authFn: async () => ({ id: USER }),
    })
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body).toEqual({ blunder: 0, mistake: 0, great: 0, brilliant: 0 })
  })

  it("counts the user's cards grouped by classification", async () => {
    const { db } = makeMockDb({
      card_state: [
        { card_id: 'c1', user_id: USER },
        { card_id: 'c2', user_id: USER },
        { card_id: 'c3', user_id: USER },
        { card_id: 'c4', user_id: USER },
        { card_id: 'c5', user_id: USER },
        { card_id: 'c6', user_id: USER },
      ],
      cards: [
        { id: 'c1', classification: 'blunder' },
        { id: 'c2', classification: 'blunder' },
        { id: 'c3', classification: 'mistake' },
        { id: 'c4', classification: 'great' },
        { id: 'c5', classification: 'brilliant' },
        { id: 'c6', classification: 'brilliant' },
      ],
    })
    const req = new Request('http://localhost/api/stats/classification')
    const response = await GET(req, {
      db,
      authFn: async () => ({ id: USER }),
    })
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body).toEqual({ blunder: 2, mistake: 1, great: 1, brilliant: 2 })
  })

  it('ignores classifications outside the four categories', async () => {
    const { db } = makeMockDb({
      card_state: [
        { card_id: 'c1', user_id: USER },
        { card_id: 'c2', user_id: USER },
      ],
      cards: [
        { id: 'c1', classification: 'blunder' },
        { id: 'c2', classification: 'unknown' },
      ],
    })
    const req = new Request('http://localhost/api/stats/classification')
    const response = await GET(req, {
      db,
      authFn: async () => ({ id: USER }),
    })
    const body = await response.json()
    expect(body).toEqual({ blunder: 1, mistake: 0, great: 0, brilliant: 0 })
  })

  it("only counts the authenticated user's cards", async () => {
    const OTHER = '00000000-0000-0000-0000-000000000002'
    const { db } = makeMockDb({
      card_state: [
        { card_id: 'c1', user_id: USER },
        { card_id: 'c2', user_id: OTHER },
        { card_id: 'c3', user_id: OTHER },
      ],
      cards: [
        { id: 'c1', classification: 'blunder' },
        { id: 'c2', classification: 'brilliant' },
        { id: 'c3', classification: 'great' },
      ],
    })
    const req = new Request('http://localhost/api/stats/classification')
    const response = await GET(req, {
      db,
      authFn: async () => ({ id: USER }),
    })
    const body = await response.json()
    expect(body).toEqual({ blunder: 1, mistake: 0, great: 0, brilliant: 0 })
  })
})
