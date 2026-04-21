/**
 * @jest-environment node
 */

import { GET } from '@/app/api/sync/status/route'
import { makeMockDb } from '@/__tests__/helpers/mock-db'

function makeStatusRequest() {
  return new Request('http://localhost/api/sync/status', { method: 'GET' })
}

const FIXTURE_LOG = {
  id: 'abc-123',
  user_id: 'dev-user',
  mode: 'incremental',
  started_at: '2024-01-01T00:00:00Z',
  completed_at: '2024-01-01T00:01:00Z',
  games_processed: 5,
  cards_created: 3,
  error: null,
}

const AUTH_FN = async () => ({ id: 'dev-user-id' })

describe('GET /api/sync/status', () => {
  it('returns the most recent sync log entry', async () => {
    const { db } = makeMockDb({ sync_log: [FIXTURE_LOG] })

    const response = await GET(makeStatusRequest(), { db, authFn: AUTH_FN })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.id).toBe(FIXTURE_LOG.id)
    expect(body.mode).toBe('incremental')
    expect(body.games_processed).toBe(5)
    expect(body.cards_created).toBe(3)
    expect(body.error).toBeNull()
  })

  it('returns null when no sync log entries exist', async () => {
    const { db } = makeMockDb({ sync_log: [] })

    const response = await GET(makeStatusRequest(), { db, authFn: AUTH_FN })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toBeNull()
  })
})
