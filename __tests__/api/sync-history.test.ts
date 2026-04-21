/**
 * @jest-environment node
 */

import { GET } from '@/app/api/sync/history/route'
import { makeMockDb } from '@/__tests__/helpers/mock-db'

const USER_ID = 'dev-user-id'
const AUTH_FN = async () => ({ id: USER_ID })

function makeReq() {
  return new Request('http://localhost/api/sync/history', { method: 'GET' })
}

const OWN_LOGS = [
  { id: 'own-1', user_id: USER_ID, mode: 'incremental', started_at: '2024-01-03T00:00:00Z' },
  { id: 'own-2', user_id: USER_ID, mode: 'incremental', started_at: '2024-01-02T00:00:00Z' },
  { id: 'own-3', user_id: USER_ID, mode: 'historical',  started_at: '2024-01-01T00:00:00Z' },
]

const OTHER_LOG = {
  id: 'other-1',
  user_id: 'some-other-user',
  mode: 'incremental',
  started_at: '2024-01-04T00:00:00Z',
}

describe('GET /api/sync/history', () => {
  it('returns only the caller’s runs, newest first', async () => {
    const { db } = makeMockDb({ sync_log: [OTHER_LOG, ...OWN_LOGS] })

    const res = await GET(makeReq(), { db, authFn: AUTH_FN })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toHaveLength(3)
    expect(body.map((r: { id: string }) => r.id)).toEqual(['own-1', 'own-2', 'own-3'])
  })

  it('returns an empty list when the user has no runs', async () => {
    const { db } = makeMockDb({ sync_log: [OTHER_LOG] })

    const res = await GET(makeReq(), { db, authFn: AUTH_FN })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual([])
  })

  it('401s when unauthenticated', async () => {
    const { db } = makeMockDb({ sync_log: OWN_LOGS })

    const res = await GET(makeReq(), { db, authFn: async () => null })

    expect(res.status).toBe(401)
  })
})
