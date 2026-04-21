/**
 * @jest-environment node
 */

import { PATCH } from '@/app/api/review/cards/[cardId]/route'
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
    params: { cardId },
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
