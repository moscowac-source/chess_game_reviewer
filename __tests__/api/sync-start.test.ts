/**
 * @jest-environment node
 */

import { POST } from '@/app/api/sync/start/route'
import { makeMockDb } from '@/__tests__/helpers/mock-db'

const MOCK_USER = { id: 'user-123', chess_com_username: 'testuser' }

function makeReq(body: Record<string, unknown> = { mode: 'incremental' }) {
  return new Request('http://localhost/api/sync/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeInngestSpy() {
  const sent: Array<{ name: string; data: Record<string, unknown> }> = []
  return {
    inngest: {
      send: async (event: { name: string; data: Record<string, unknown> }) => {
        sent.push(event)
        return { ids: ['evt-1'] }
      },
    },
    sent,
  }
}

describe('POST /api/sync/start', () => {
  it('returns 401 when no authenticated user', async () => {
    const { db } = makeMockDb({ users: [] })
    const { inngest } = makeInngestSpy()
    const res = await POST(makeReq(), { db, authFn: async () => null, inngest })
    expect(res.status).toBe(401)
  })

  it('returns 422 when the user has no chess_com_username', async () => {
    const { db } = makeMockDb({ users: [{ id: 'user-123' }] })
    const { inngest } = makeInngestSpy()
    const res = await POST(makeReq(), {
      db,
      authFn: async () => ({ id: 'user-123', chess_com_username: null }),
      inngest,
    })
    expect(res.status).toBe(422)
  })

  it('inserts a sync_log row with stage=queued and returns { sync_id }', async () => {
    const { db, inserted } = makeMockDb({ users: [MOCK_USER], sync_log: [] })
    const { inngest } = makeInngestSpy()

    const res = await POST(makeReq({ mode: 'historical' }), {
      db,
      authFn: async () => MOCK_USER,
      inngest,
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(typeof body.sync_id).toBe('string')
    expect(inserted.sync_log).toHaveLength(1)
    expect(inserted.sync_log[0]).toMatchObject({
      user_id: MOCK_USER.id,
      mode: 'historical',
      stage: 'queued',
      games_processed: 0,
      games_total: 0,
      cards_created: 0,
    })
    expect(body.sync_id).toBe(inserted.sync_log[0].id)
  })

  it('sends a sync/run Inngest event with the syncLogId, userId, username, and mode', async () => {
    const { db } = makeMockDb({ users: [MOCK_USER], sync_log: [] })
    const { inngest, sent } = makeInngestSpy()

    const res = await POST(makeReq({ mode: 'incremental' }), {
      db,
      authFn: async () => MOCK_USER,
      inngest,
    })
    const body = await res.json()

    expect(sent).toHaveLength(1)
    expect(sent[0]).toEqual({
      name: 'sync/run',
      data: {
        syncLogId: body.sync_id,
        userId: MOCK_USER.id,
        username: MOCK_USER.chess_com_username,
        mode: 'incremental',
      },
    })
  })

  it('defaults invalid modes to incremental', async () => {
    const { db } = makeMockDb({ users: [MOCK_USER], sync_log: [] })
    const { inngest, sent } = makeInngestSpy()

    await POST(makeReq({ mode: 'nonsense' }), {
      db,
      authFn: async () => MOCK_USER,
      inngest,
    })

    expect(sent[0].data.mode).toBe('incremental')
  })
})
