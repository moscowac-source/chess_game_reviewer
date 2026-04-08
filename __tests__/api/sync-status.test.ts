/**
 * @jest-environment node
 */

import { GET } from '@/app/api/sync/status/route'

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

function makeStatusRequest() {
  return new Request('http://localhost/api/sync/status', { method: 'GET' })
}

// A fake sync_log row that matches the SyncLog shape
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

// Builds a fake DB that returns `rows` when sync_log is queried
function makeMockDb(rows: typeof FIXTURE_LOG[] = []) {
  return {
    from: (table: string) => {
      if (table === 'sync_log') {
        return {
          select: (_cols: string) => ({
            order: (_col: string, _opts: unknown) => ({
              limit: (_n: number) =>
                Promise.resolve({ data: rows, error: null }),
            }),
          }),
        }
      }
      return {}
    },
  }
}

const AUTH_FN = async () => ({ id: 'dev-user-id' })

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/sync/status', () => {
  // Tracer bullet: returns the most recent sync log entry
  it('returns the most recent sync log entry', async () => {
    const db = makeMockDb([FIXTURE_LOG])

    const response = await GET(makeStatusRequest(), { db: db as never, authFn: AUTH_FN })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.id).toBe(FIXTURE_LOG.id)
    expect(body.mode).toBe('incremental')
    expect(body.games_processed).toBe(5)
    expect(body.cards_created).toBe(3)
    expect(body.error).toBeNull()
  })

  // Returns null when no syncs have ever run
  it('returns null when no sync log entries exist', async () => {
    const db = makeMockDb([])

    const response = await GET(makeStatusRequest(), { db: db as never, authFn: AUTH_FN })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toBeNull()
  })

  it('returns 401 when no authenticated user', async () => {
    const db = makeMockDb([FIXTURE_LOG])
    const response = await GET(makeStatusRequest(), { db: db as never, authFn: async () => null })
    expect(response.status).toBe(401)
  })
})
