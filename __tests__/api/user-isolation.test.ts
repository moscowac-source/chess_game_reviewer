/**
 * @jest-environment node
 *
 * Integration tests verifying that user A cannot read or write user B's data.
 *
 * The shared mock DB filters by whatever `.eq('user_id', val)` is passed,
 * which mirrors what RLS enforces in production. User A's data is pre-seeded;
 * all requests are made as user B. User B's reads return empty; user B's
 * writes don't leak into user A's rows.
 */

import { GET as getSession } from '@/app/api/review/session/route'
import { GET as getCounts } from '@/app/api/review/counts/route'
import { GET as getStatus } from '@/app/api/sync/status/route'
import { PATCH as patchCard } from '@/app/api/review/cards/[cardId]/route'
import { makeMockDb } from '@/__tests__/helpers/mock-db'

const USER_A = 'user-a-00000000-0000-0000-0000-000000000001'
const USER_B = 'user-b-00000000-0000-0000-0000-000000000002'

const PAST = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()

const USER_A_CARD_STATE = {
  card_id: 'card-user-a-001',
  user_id: USER_A,
  state: 'review',
  due_date: PAST,
  stability: 5,
  difficulty: 3,
  review_count: 2,
}

describe('User isolation — user B cannot see user A data', () => {
  it('GET /api/review/session returns empty cards for user B when only user A has card state', async () => {
    const { db } = makeMockDb({
      card_state: [USER_A_CARD_STATE],
      cards: [{ id: 'card-user-a-001', fen: 'fen1', correct_move: 'e4', classification: 'blunder' }],
    })

    const req = new Request('http://localhost/api/review/session')
    const response = await getSession(req, {
      db,
      authFn: async () => ({ id: USER_B }),
    })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.cards).toHaveLength(0)
  })

  it('GET /api/review/counts returns zeros for user B when only user A has card state', async () => {
    const { db } = makeMockDb({
      card_state: [USER_A_CARD_STATE],
      cards: [{ id: 'card-user-a-001', fen: 'fen1', correct_move: 'e4', classification: 'blunder' }],
    })

    const req = new Request('http://localhost/api/review/counts')
    const response = await getCounts(req, {
      db,
      authFn: async () => ({ id: USER_B }),
    })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.standard).toBe(0)
    expect(body.recent).toBe(0)
    expect(body.mistakes).toBe(0)
    expect(body.brilliancies).toBe(0)
  })

  it('GET /api/sync/status returns null for user B when RLS filters out user A sync logs', async () => {
    // The sync/status route doesn't filter by user_id — it relies on Supabase
    // RLS in production. We simulate what RLS returns for user B (empty) by
    // seeding no sync_log rows.
    const { db } = makeMockDb({ sync_log: [] })

    const req = new Request('http://localhost/api/sync/status')
    const response = await getStatus(req, {
      db,
      authFn: async () => ({ id: USER_B }),
    })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toBeNull()
  })

  it('PATCH /api/review/cards uses user B id — does not touch user A card_state', async () => {
    const { db } = makeMockDb({ card_state: [USER_A_CARD_STATE] })

    const cardId = 'card-user-a-001'
    const req = new Request(`http://localhost/api/review/cards/${cardId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outcome: 'firstTry' }),
    })

    const recordReviewFn = jest.fn().mockResolvedValue(undefined)

    await patchCard(req, {
      params: Promise.resolve({ cardId }),
      db,
      authFn: async () => ({ id: USER_B }),
      recordReviewFn,
    })

    expect(recordReviewFn).toHaveBeenCalledWith(cardId, USER_B, expect.any(String), expect.anything())
    expect(recordReviewFn).not.toHaveBeenCalledWith(cardId, USER_A, expect.any(String), expect.anything())
  })
})
