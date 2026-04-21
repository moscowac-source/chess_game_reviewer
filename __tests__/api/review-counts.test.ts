/**
 * @jest-environment node
 */

import { GET } from '@/app/api/review/counts/route'
import { makeMockDb } from '@/__tests__/helpers/mock-db'

const PAST = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
const FUTURE = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
const TODAY = new Date().toISOString()
const RECENT_DATE = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
const OLD_DATE = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
const USER = '00000000-0000-0000-0000-000000000001'

describe('GET /api/review/counts', () => {
  it('returns due-card counts for all four modes', async () => {
    const { db } = makeMockDb({
      card_state: [
        // due — blunder (appears in: standard, mistakes)
        { card_id: 'card-blunder', user_id: USER, state: 'review', due_date: PAST, stability: 5, difficulty: 3, review_count: 2 },
        // due — great + recent game (appears in: standard, brilliancies, recent)
        { card_id: 'card-great', user_id: USER, state: 'review', due_date: PAST, stability: 5, difficulty: 3, review_count: 2 },
        // not due — blunder (excluded from all modes)
        { card_id: 'card-future', user_id: USER, state: 'review', due_date: FUTURE, stability: 5, difficulty: 3, review_count: 2 },
        // new (appears in: standard)
        { card_id: 'card-new', user_id: USER, state: 'new', due_date: TODAY, stability: 0, difficulty: 0, review_count: 0 },
      ],
      cards: [
        { id: 'card-blunder', fen: 'fen1', correct_move: 'e4', classification: 'blunder', game_played_at: OLD_DATE },
        { id: 'card-great', fen: 'fen2', correct_move: 'Nf3', classification: 'great', game_played_at: RECENT_DATE },
        { id: 'card-future', fen: 'fen3', correct_move: 'Bb5', classification: 'blunder', game_played_at: OLD_DATE },
        { id: 'card-new', fen: 'fen4', correct_move: 'Nc3', classification: 'mistake', game_played_at: RECENT_DATE },
      ],
    })

    const req = new Request('http://localhost/api/review/counts')
    const response = await GET(req, { db, authFn: async () => ({ id: USER }) })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toHaveProperty('standard')
    expect(body).toHaveProperty('recent')
    expect(body).toHaveProperty('mistakes')
    expect(body).toHaveProperty('brilliancies')

    // standard: card-blunder (due) + card-great (due) + card-new (new) = 3
    expect(body.standard).toBe(3)
    // mistakes: card-blunder (due blunder) = 1  (card-new is new state but classification=mistake — included)
    expect(body.mistakes).toBe(2)
    // brilliancies: card-great (due great) = 1
    expect(body.brilliancies).toBe(1)
    // recent: card-great (due, recent game) + card-new (new, recent game) = 2
    expect(body.recent).toBe(2)
  })

  it('returns 401 when no authenticated user', async () => {
    const { db } = makeMockDb()
    const req = new Request('http://localhost/api/review/counts')
    const response = await GET(req, { db, authFn: async () => null })
    expect(response.status).toBe(401)
  })
})
