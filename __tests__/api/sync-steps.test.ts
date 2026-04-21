/**
 * @jest-environment node
 */

import { GET } from '@/app/api/sync/[id]/steps/route'
import { makeMockDb } from '@/__tests__/helpers/mock-db'

const USER_ID = 'dev-user-id'
const SYNC_ID = 'sync-abc'
const AUTH_FN = async () => ({ id: USER_ID })

function makeReq() {
  return new Request(`http://localhost/api/sync/${SYNC_ID}/steps`, { method: 'GET' })
}

function params(id: string) {
  return Promise.resolve({ id })
}

const SYNC_LOG_ROW = {
  id: SYNC_ID,
  user_id: USER_ID,
  mode: 'incremental',
  started_at: '2024-01-01T00:00:00Z',
  completed_at: '2024-01-01T00:01:00Z',
  error: null,
  games_processed: 2,
  cards_created: 1,
  games_total: 2,
  stage: 'complete',
}

const STEP_ROWS = [
  {
    id: 'step-1',
    sync_log_id: SYNC_ID,
    game_url: null,
    game_index: null,
    step: 'sync-start',
    status: 'ok',
    duration_ms: 5,
    error: null,
    error_code: null,
    details: { mode: 'incremental' },
    created_at: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'step-2',
    sync_log_id: SYNC_ID,
    game_url: 'https://chess.com/game/1',
    game_index: 0,
    step: 'analyze',
    status: 'ok',
    duration_ms: 220,
    error: null,
    error_code: null,
    details: null,
    created_at: '2024-01-01T00:00:01.000Z',
  },
]

describe('GET /api/sync/[id]/steps', () => {
  it('returns sync + steps for the owner', async () => {
    const { db } = makeMockDb({
      sync_log: [SYNC_LOG_ROW],
      sync_step_log: STEP_ROWS,
    })

    const res = await GET(makeReq(), { db, authFn: AUTH_FN, params: params(SYNC_ID) })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.sync.id).toBe(SYNC_ID)
    expect(body.sync.stage).toBe('complete')
    expect(body.steps).toHaveLength(2)
    expect(body.steps[0].step).toBe('sync-start')
    expect(body.steps[1].step).toBe('analyze')
  })

  it('404s when the sync_log row is owned by someone else', async () => {
    const { db } = makeMockDb({
      sync_log: [{ ...SYNC_LOG_ROW, user_id: 'other-user' }],
      sync_step_log: STEP_ROWS,
    })

    const res = await GET(makeReq(), { db, authFn: AUTH_FN, params: params(SYNC_ID) })

    expect(res.status).toBe(404)
  })

  it('404s when the sync_log row does not exist', async () => {
    const { db } = makeMockDb({ sync_log: [], sync_step_log: [] })

    const res = await GET(makeReq(), { db, authFn: AUTH_FN, params: params(SYNC_ID) })

    expect(res.status).toBe(404)
  })

  it('401s when unauthenticated', async () => {
    const { db } = makeMockDb({ sync_log: [SYNC_LOG_ROW], sync_step_log: STEP_ROWS })

    const res = await GET(makeReq(), {
      db,
      authFn: async () => null,
      params: params(SYNC_ID),
    })

    expect(res.status).toBe(401)
  })
})
