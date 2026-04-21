/**
 * @jest-environment node
 */

import { GET, PATCH } from '@/app/api/review/cards/[cardId]/route'
import { makeMockDb } from '@/__tests__/helpers/mock-db'
import type { ReviewRating } from '@/types/database'

const CARD_ID = 'card-0000-0000-0000-000000000001'
const USER_ID = '00000000-0000-0000-0000-000000000001'

function makeRequest(body: Record<string, unknown>) {
  return new Request(`http://localhost/api/review/cards/${CARD_ID}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeContext(cardId: string, recordReviewFn?: jest.Mock, authFn?: () => Promise<{ id: string } | null>) {
  return {
    params: Promise.resolve({ cardId }),
    recordReviewFn,
    authFn: authFn ?? (async () => ({ id: USER_ID })),
  }
}

describe('PATCH /api/review/cards/[cardId]', () => {
  it("maps 'firstTry' outcome to 'easy' rating and records the review", async () => {
    const recordReviewFn = jest.fn().mockResolvedValue(undefined)

    const response = await PATCH(
      makeRequest({ outcome: 'firstTry' }),
      makeContext(CARD_ID, recordReviewFn),
    )

    expect(response.status).toBe(200)
    expect(recordReviewFn).toHaveBeenCalledWith(
      CARD_ID,
      USER_ID,
      'easy' satisfies ReviewRating,
      expect.anything(),
    )
  })

  it.each<[string, ReviewRating]>([
    ['afterHint', 'good'],
    ['afterAttempts', 'hard'],
    ['failed', 'again'],
  ])("maps '%s' outcome to '%s' rating", async (outcome, expectedRating) => {
    const recordReviewFn = jest.fn().mockResolvedValue(undefined)

    const response = await PATCH(
      makeRequest({ outcome }),
      makeContext(CARD_ID, recordReviewFn),
    )

    expect(response.status).toBe(200)
    expect(recordReviewFn).toHaveBeenCalledWith(
      CARD_ID,
      USER_ID,
      expectedRating,
      expect.anything(),
    )
  })

  it('returns 400 for an unrecognised outcome', async () => {
    const recordReviewFn = jest.fn()

    const response = await PATCH(
      makeRequest({ outcome: 'accidentalGenius' }),
      makeContext(CARD_ID, recordReviewFn),
    )

    expect(response.status).toBe(400)
    expect(recordReviewFn).not.toHaveBeenCalled()
  })
})

describe('GET /api/review/cards/[cardId]', () => {
  function makeGetRequest(cardId: string) {
    return new Request(`http://localhost/api/review/cards/${cardId}`, { method: 'GET' })
  }

  it('returns the card for the owning user', async () => {
    const { db } = makeMockDb({
      card_state: [{ card_id: CARD_ID, user_id: USER_ID }],
      cards: [{
        id: CARD_ID,
        fen: 'fen-abc',
        correct_move: 'e4',
        classification: 'blunder',
        theme: 'opening',
        note: null,
        cpl: 310,
      }],
    })

    const response = await GET(makeGetRequest(CARD_ID), {
      db,
      authFn: async () => ({ id: USER_ID }),
      params: Promise.resolve({ cardId: CARD_ID }),
    })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({
      cardId: CARD_ID,
      fen: 'fen-abc',
      correctMove: 'e4',
      classification: 'blunder',
      isNew: false,
      theme: 'opening',
      note: null,
      cpl: 310,
    })
  })

  it('returns 404 when the card id is unknown', async () => {
    const { db } = makeMockDb({ card_state: [], cards: [] })

    const response = await GET(makeGetRequest('missing'), {
      db,
      authFn: async () => ({ id: USER_ID }),
      params: Promise.resolve({ cardId: 'missing' }),
    })

    expect(response.status).toBe(404)
  })

  it("returns 404 when the card belongs to a different user", async () => {
    const OTHER_USER = '00000000-0000-0000-0000-000000000999'
    const { db } = makeMockDb({
      card_state: [{ card_id: CARD_ID, user_id: OTHER_USER }],
      cards: [{
        id: CARD_ID,
        fen: 'fen-abc',
        correct_move: 'e4',
        classification: 'blunder',
        theme: null,
        note: null,
        cpl: null,
      }],
    })

    const response = await GET(makeGetRequest(CARD_ID), {
      db,
      authFn: async () => ({ id: USER_ID }),
      params: Promise.resolve({ cardId: CARD_ID }),
    })

    expect(response.status).toBe(404)
  })
})
