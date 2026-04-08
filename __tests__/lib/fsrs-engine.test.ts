/**
 * @jest-environment node
 */

import { initializeCardState, recordReview, getNextCard, mapOutcomeToRating } from '@/lib/fsrs-engine'

// ---------------------------------------------------------------------------
// Mock DB helpers
// ---------------------------------------------------------------------------

type Row = Record<string, unknown>

function makeMockDb(initialCardStates: Row[] = [], initialCards: Row[] = []) {
  const cardStates: Row[] = [...initialCardStates]
  const cards: Row[] = [...initialCards]
  const reviewLogs: Row[] = []

  const db = {
    from: (table: string) => {
      if (table === 'card_state') {
        return {
          insert: (rows: Row | Row[]) => {
            const toInsert = Array.isArray(rows) ? rows : [rows]
            cardStates.push(...toInsert)
            return { select: () => ({ single: () => Promise.resolve({ data: toInsert[0], error: null }) }) }
          },
          select: (_cols: string) => ({
            eq: (col: string, val: unknown) => ({
              eq: (col2: string, val2: unknown) => ({
                single: () => {
                  const found = cardStates.find(
                    (r) => r[col] === val && r[col2] === val2
                  )
                  return Promise.resolve({ data: found ?? null, error: null })
                },
              }),
              order: (orderCol: string, opts: { ascending: boolean }) => ({
                limit: (n: number) => {
                  const filtered = cardStates.filter((r) => r[col] === val)
                  const sorted = [...filtered].sort((a, b) => {
                    const aVal = a[orderCol] as string
                    const bVal = b[orderCol] as string
                    return opts.ascending ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
                  })
                  return Promise.resolve({ data: sorted.slice(0, n), error: null })
                },
              }),
            }),
          }),
          update: (patch: Row) => ({
            eq: (col: string, val: unknown) => ({
              eq: (col2: string, val2: unknown) =>
                Promise.resolve((() => {
                  const idx = cardStates.findIndex(
                    (r) => r[col] === val && r[col2] === val2
                  )
                  if (idx >= 0) cardStates[idx] = { ...cardStates[idx], ...patch }
                  return { error: null }
                })()),
            }),
          }),
        }
      }

      if (table === 'cards') {
        return {
          select: (_cols: string) => ({
            eq: (col: string, val: unknown) => ({
              single: () => {
                const found = cards.find((r) => r[col] === val)
                return Promise.resolve({ data: found ?? null, error: null })
              },
            }),
            in: (_col: string, vals: unknown[]) => ({
              order: (orderCol: string, opts: { ascending: boolean }) => ({
                limit: (n: number) => {
                  const filtered = cards.filter((r) => vals.includes(r['id']))
                  const sorted = [...filtered].sort((a, b) => {
                    const aVal = a[orderCol] as string
                    const bVal = b[orderCol] as string
                    return opts.ascending ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
                  })
                  return Promise.resolve({ data: sorted.slice(0, n), error: null })
                },
              }),
            }),
          }),
        }
      }

      if (table === 'review_log') {
        return {
          insert: (rows: Row | Row[]) => {
            const toInsert = Array.isArray(rows) ? rows : [rows]
            reviewLogs.push(...toInsert)
            return Promise.resolve({ error: null })
          },
        }
      }

      throw new Error(`Unknown table: ${table}`)
    },
  }

  return { db, cardStates, reviewLogs }
}

// ---------------------------------------------------------------------------
// Test 1: initializeCardState — new card gets FSRS defaults in card_state
// ---------------------------------------------------------------------------
describe('initializeCardState', () => {
  it('inserts a card_state row with FSRS defaults for a new card', async () => {
    const { db, cardStates } = makeMockDb()

    await initializeCardState('card-1', 'user-1', db as never)

    expect(cardStates).toHaveLength(1)
    const row = cardStates[0]
    expect(row.card_id).toBe('card-1')
    expect(row.user_id).toBe('user-1')
    expect(row.stability).toBe(0)
    expect(row.difficulty).toBe(0)
    expect(row.review_count).toBe(0)
    expect(row.state).toBe('new')
    expect(row.due_date).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// Test 2: recordReview with Easy increases interval
// ---------------------------------------------------------------------------
describe('recordReview', () => {
  it('updates card_state with longer interval after Easy rating', async () => {
    const existingState: Row = {
      card_id: 'card-1',
      user_id: 'user-1',
      stability: 0,
      difficulty: 0,
      due_date: new Date().toISOString(),
      review_count: 0,
      state: 'new',
    }
    const { db, cardStates } = makeMockDb([existingState])

    await recordReview('card-1', 'user-1', 'easy', db as never)

    const updated = cardStates[0]
    // After Easy on a new card, stability should increase and state moves to 'review'
    expect(updated.stability as number).toBeGreaterThan(0)
    expect(updated.review_count).toBe(1)
    expect(updated.state).toBe('review')
    // due_date should be in the future (at least several days out)
    expect(new Date(updated.due_date as string).getTime()).toBeGreaterThan(Date.now())
  })

  // -------------------------------------------------------------------------
  // Test 3: recordReview with Again resets interval
  // -------------------------------------------------------------------------
  it('resets card_state to learning state after Again rating', async () => {
    // Simulate a card that was previously reviewed with some stability
    const existingState: Row = {
      card_id: 'card-1',
      user_id: 'user-1',
      stability: 10,
      difficulty: 5,
      due_date: new Date().toISOString(),
      review_count: 3,
      state: 'review',
    }
    const { db, cardStates } = makeMockDb([existingState])

    await recordReview('card-1', 'user-1', 'again', db as never)

    const updated = cardStates[0]
    // Again puts the card back into learning/relearning — due_date should be very soon
    expect(['learning', 'relearning']).toContain(updated.state)
    expect(updated.review_count).toBe(4)
    // due date should be very close to now (within a day, i.e. < 24h from now)
    const dueDiff = new Date(updated.due_date as string).getTime() - Date.now()
    expect(dueDiff).toBeLessThan(24 * 60 * 60 * 1000)
  })
})

// ---------------------------------------------------------------------------
// Test 4: getNextCard returns card with earliest due_date
// ---------------------------------------------------------------------------
describe('getNextCard', () => {
  it('returns the card with the earliest due_date', async () => {
    const now = new Date()
    const earlier = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
    const later = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)   // 1 day ago

    const cardStates: Row[] = [
      { card_id: 'card-2', user_id: 'user-1', due_date: later.toISOString(), state: 'review', stability: 5, difficulty: 3, review_count: 2 },
      { card_id: 'card-1', user_id: 'user-1', due_date: earlier.toISOString(), state: 'review', stability: 5, difficulty: 3, review_count: 2 },
    ]
    const cards: Row[] = [
      { id: 'card-1', fen: 'fen1', correct_move: 'e4', classification: 'blunder' },
      { id: 'card-2', fen: 'fen2', correct_move: 'Nf3', classification: 'mistake' },
    ]
    const { db } = makeMockDb(cardStates, cards)

    const result = await getNextCard('user-1', db as never)

    expect(result).not.toBeNull()
    expect(result!.id).toBe('card-1')
  })

  it('returns null when no cards are due', async () => {
    const { db } = makeMockDb([], [])

    const result = await getNextCard('user-1', db as never)

    expect(result).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Test 5: mapOutcomeToRating — all four cases
// ---------------------------------------------------------------------------
describe('mapOutcomeToRating', () => {
  it('maps firstTry to easy', () => {
    expect(mapOutcomeToRating('firstTry')).toBe('easy')
  })

  it('maps afterHint to good', () => {
    expect(mapOutcomeToRating('afterHint')).toBe('good')
  })

  it('maps afterAttempts to hard', () => {
    expect(mapOutcomeToRating('afterAttempts')).toBe('hard')
  })

  it('maps failed to again', () => {
    expect(mapOutcomeToRating('failed')).toBe('again')
  })
})

// ---------------------------------------------------------------------------
// Test 6: multi-step review sequence
// ---------------------------------------------------------------------------
describe('multi-step review sequence', () => {
  it('correctly evolves card_state across multiple reviews', async () => {
    const { db, cardStates } = makeMockDb()

    // Step 1: initialize
    await initializeCardState('card-1', 'user-1', db as never)
    expect(cardStates[0].state).toBe('new')

    // Step 2: review with Easy → moves to review state with positive stability
    await recordReview('card-1', 'user-1', 'easy', db as never)
    const afterEasy = cardStates[0]
    expect(afterEasy.state).toBe('review')
    expect(afterEasy.stability as number).toBeGreaterThan(0)
    expect(afterEasy.review_count).toBe(1)

    // Step 3: review with Again → resets to learning/relearning
    await recordReview('card-1', 'user-1', 'again', db as never)
    const afterAgain = cardStates[0]
    expect(['learning', 'relearning']).toContain(afterAgain.state)
    expect(afterAgain.review_count).toBe(2)
  })
})
