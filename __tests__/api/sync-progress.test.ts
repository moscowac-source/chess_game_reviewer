/**
 * @jest-environment node
 */

import { GET } from '@/app/api/sync/progress/route'
import { makeMockDb } from '@/__tests__/helpers/mock-db'

const USER_ID = 'user-123'
const OTHER_USER_ID = 'user-999'

function makeReq(id: string | null) {
  const url = id === null
    ? 'http://localhost/api/sync/progress'
    : `http://localhost/api/sync/progress?id=${encodeURIComponent(id)}`
  return new Request(url)
}

describe('GET /api/sync/progress', () => {
  it('returns 401 when no authenticated user', async () => {
    const { db } = makeMockDb({ sync_log: [] })
    const res = await GET(makeReq('sl-1'), { db, authFn: async () => null })
    expect(res.status).toBe(401)
  })

  it('returns 400 when id query param is missing', async () => {
    const { db } = makeMockDb({ sync_log: [] })
    const res = await GET(makeReq(null), { db, authFn: async () => ({ id: USER_ID }) })
    expect(res.status).toBe(400)
  })

  it('returns 404 when the sync_log row does not exist', async () => {
    const { db } = makeMockDb({ sync_log: [] })
    const res = await GET(makeReq('nope'), { db, authFn: async () => ({ id: USER_ID }) })
    expect(res.status).toBe(404)
  })

  it('returns 404 when the sync_log row belongs to another user', async () => {
    const { db } = makeMockDb({
      sync_log: [{
        id: 'sl-1', user_id: OTHER_USER_ID,
        stage: 'analyzing', games_processed: 1, games_total: 3, cards_created: 0, error: null,
      }],
    })
    const res = await GET(makeReq('sl-1'), { db, authFn: async () => ({ id: USER_ID }) })
    expect(res.status).toBe(404)
  })

  it('returns stage, games_done, games_total, cards_created, and error from the row', async () => {
    const { db } = makeMockDb({
      sync_log: [{
        id: 'sl-1', user_id: USER_ID,
        stage: 'analyzing', games_processed: 2, games_total: 5, cards_created: 7, error: null,
      }],
    })
    const res = await GET(makeReq('sl-1'), { db, authFn: async () => ({ id: USER_ID }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({
      stage: 'analyzing',
      games_done: 2,
      games_total: 5,
      cards_created: 7,
      error: null,
    })
  })

  it('normalizes a null stage to "queued"', async () => {
    const { db } = makeMockDb({
      sync_log: [{
        id: 'sl-2', user_id: USER_ID,
        stage: null, games_processed: 0, games_total: 0, cards_created: 0, error: null,
      }],
    })
    const res = await GET(makeReq('sl-2'), { db, authFn: async () => ({ id: USER_ID }) })
    const body = await res.json()
    expect(body.stage).toBe('queued')
  })

  it('surfaces the error string when present', async () => {
    const { db } = makeMockDb({
      sync_log: [{
        id: 'sl-3', user_id: USER_ID,
        stage: 'error', games_processed: 0, games_total: 2, cards_created: 0, error: 'boom',
      }],
    })
    const res = await GET(makeReq('sl-3'), { db, authFn: async () => ({ id: USER_ID }) })
    const body = await res.json()
    expect(body.error).toBe('boom')
    expect(body.stage).toBe('error')
  })
})
