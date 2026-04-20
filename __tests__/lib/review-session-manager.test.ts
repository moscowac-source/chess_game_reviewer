/**
 * @jest-environment node
 */

import { buildReviewSession } from '@/lib/review-session-manager'

// ---------------------------------------------------------------------------
// Mock DB helpers
// ---------------------------------------------------------------------------

type Row = Record<string, unknown>

function makeMockDb(
  initialCardStates: Row[] = [],
  initialCards: Row[] = [],
  initialReviewLogs: Row[] = [],
) {
  const cardStates: Row[] = [...initialCardStates]
  const cards: Row[] = [...initialCards]
  const reviewLogs: Row[] = [...initialReviewLogs]

  const db = {
    from: (table: string) => {
      if (table === 'card_state') {
        return {
          select: (_cols: string) => ({
            eq: (col: string, val: unknown) => ({
              data: cardStates.filter((r) => r[col] === val),
              error: null,
              // Make it thenable so await works
              then: (resolve: (v: { data: Row[]; error: null }) => unknown) =>
                Promise.resolve({ data: cardStates.filter((r) => r[col] === val), error: null }).then(resolve),
            }),
          }),
        }
      }

      if (table === 'cards') {
        return {
          select: (_cols: string) => ({
            in: (_col: string, vals: unknown[]) =>
              Promise.resolve({
                data: cards.filter((c) => vals.includes(c['id'])),
                error: null,
              }),
          }),
        }
      }

      if (table === 'review_log') {
        return {
          select: (_cols: string) => ({
            eq: (col: string, val: unknown) =>
              Promise.resolve({
                data: reviewLogs.filter((r) => r[col] === val),
                error: null,
              }),
          }),
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

  return { db, cardStates, cards, reviewLogs }
}

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const PAST = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days ago
const FUTURE = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days from now
const TODAY = new Date().toISOString()

const USER = 'user-1'

// ---------------------------------------------------------------------------
// Test 1 (tracer bullet): Returns due cards
// ---------------------------------------------------------------------------
describe('buildReviewSession', () => {
  it('returns due cards (seen before, due_date in the past)', async () => {
    const cardStates: Row[] = [
      { card_id: 'card-1', user_id: USER, state: 'review', due_date: PAST, stability: 5, difficulty: 3, review_count: 2 },
      { card_id: 'card-2', user_id: USER, state: 'review', due_date: PAST, stability: 5, difficulty: 3, review_count: 2 },
    ]
    const cards: Row[] = [
      { id: 'card-1', fen: 'fen1', correct_move: 'e4', classification: 'blunder' },
      { id: 'card-2', fen: 'fen2', correct_move: 'Nf3', classification: 'mistake' },
    ]
    const { db } = makeMockDb(cardStates, cards)

    const session = await buildReviewSession(USER, db as never)

    expect(session.cards).toHaveLength(2)
    expect(session.cards.every((c) => c.isNew === false)).toBe(true)
    expect(session.totalDue).toBe(2)
  })

  // -------------------------------------------------------------------------
  // Test 2: Queue includes new cards up to daily limit
  // -------------------------------------------------------------------------
  it('includes new cards (state=new) alongside due cards', async () => {
    const cardStates: Row[] = [
      { card_id: 'card-1', user_id: USER, state: 'review', due_date: PAST, stability: 5, difficulty: 3, review_count: 2 },
      { card_id: 'card-2', user_id: USER, state: 'new', due_date: TODAY, stability: 0, difficulty: 0, review_count: 0 },
    ]
    const cards: Row[] = [
      { id: 'card-1', fen: 'fen1', correct_move: 'e4', classification: 'blunder' },
      { id: 'card-2', fen: 'fen2', correct_move: 'Nf3', classification: 'mistake' },
    ]
    const { db } = makeMockDb(cardStates, cards)

    const session = await buildReviewSession(USER, db as never, { dailyNewLimit: 5 })

    expect(session.cards).toHaveLength(2)
    const dueCard = session.cards.find((c) => c.cardId === 'card-1')
    const newCard = session.cards.find((c) => c.cardId === 'card-2')
    expect(dueCard?.isNew).toBe(false)
    expect(newCard?.isNew).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 3: Daily new-card limit is enforced
  // -------------------------------------------------------------------------
  it('caps new cards at dailyNewLimit', async () => {
    // Create 5 new cards but set dailyNewLimit to 3
    const cardStates: Row[] = Array.from({ length: 5 }, (_, i) => ({
      card_id: `new-card-${i}`,
      user_id: USER,
      state: 'new',
      due_date: TODAY,
      stability: 0,
      difficulty: 0,
      review_count: 0,
    }))
    const cards: Row[] = Array.from({ length: 5 }, (_, i) => ({
      id: `new-card-${i}`,
      fen: `fen${i}`,
      correct_move: 'e4',
      classification: 'blunder',
    }))
    const { db } = makeMockDb(cardStates, cards)

    const session = await buildReviewSession(USER, db as never, { dailyNewLimit: 3 })

    const newCards = session.cards.filter((c) => c.isNew)
    expect(newCards).toHaveLength(3)
    expect(session.cards).toHaveLength(3) // no due cards either
  })

  // -------------------------------------------------------------------------
  // Test 4: Resumability — already-reviewed new cards reduce remaining slots
  // -------------------------------------------------------------------------
  it('reduces new-card slots by number of new cards already reviewed today', async () => {
    // 4 new cards remain
    const cardStates: Row[] = [
      // 2 cards already reviewed today (review_count=1, state='learning')
      { card_id: 'reviewed-1', user_id: USER, state: 'learning', due_date: FUTURE, stability: 1, difficulty: 5, review_count: 1 },
      { card_id: 'reviewed-2', user_id: USER, state: 'learning', due_date: FUTURE, stability: 1, difficulty: 5, review_count: 1 },
      // 4 new cards still untouched
      { card_id: 'new-1', user_id: USER, state: 'new', due_date: TODAY, stability: 0, difficulty: 0, review_count: 0 },
      { card_id: 'new-2', user_id: USER, state: 'new', due_date: TODAY, stability: 0, difficulty: 0, review_count: 0 },
      { card_id: 'new-3', user_id: USER, state: 'new', due_date: TODAY, stability: 0, difficulty: 0, review_count: 0 },
      { card_id: 'new-4', user_id: USER, state: 'new', due_date: TODAY, stability: 0, difficulty: 0, review_count: 0 },
    ]
    const cards: Row[] = [
      { id: 'reviewed-1', fen: 'fen-r1', correct_move: 'e4', classification: 'blunder' },
      { id: 'reviewed-2', fen: 'fen-r2', correct_move: 'e4', classification: 'blunder' },
      { id: 'new-1', fen: 'fen-n1', correct_move: 'Nf3', classification: 'mistake' },
      { id: 'new-2', fen: 'fen-n2', correct_move: 'Nf3', classification: 'mistake' },
      { id: 'new-3', fen: 'fen-n3', correct_move: 'Nf3', classification: 'mistake' },
      { id: 'new-4', fen: 'fen-n4', correct_move: 'Nf3', classification: 'mistake' },
    ]
    // Today's review logs for the 2 already-reviewed cards
    const reviewLogs: Row[] = [
      { card_id: 'reviewed-1', user_id: USER, rating: 'easy', reviewed_at: TODAY },
      { card_id: 'reviewed-2', user_id: USER, rating: 'good', reviewed_at: TODAY },
    ]
    const { db } = makeMockDb(cardStates, cards, reviewLogs)

    // Daily limit is 4. 2 already reviewed today → only 2 more new cards should appear.
    const session = await buildReviewSession(USER, db as never, { dailyNewLimit: 4 })

    const newCards = session.cards.filter((c) => c.isNew)
    expect(newCards).toHaveLength(2)
    expect(session.newCardsToday).toBe(2)
  })

  // -------------------------------------------------------------------------
  // Test 5: Returns empty session when nothing is due
  // -------------------------------------------------------------------------
  it('returns an empty session when no cards are due and no new cards exist', async () => {
    const { db } = makeMockDb([], [])

    const session = await buildReviewSession(USER, db as never)

    expect(session.cards).toHaveLength(0)
    expect(session.totalDue).toBe(0)
    expect(session.newCardsToday).toBe(0)
  })

  // -------------------------------------------------------------------------
  // Test 6: Session cards have the correct shape
  // -------------------------------------------------------------------------
  it('returns cards with the correct fields', async () => {
    const cardStates: Row[] = [
      { card_id: 'card-1', user_id: USER, state: 'review', due_date: PAST, stability: 5, difficulty: 3, review_count: 2 },
    ]
    const cards: Row[] = [
      { id: 'card-1', fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3', correct_move: 'Bb5', classification: 'blunder', theme: 'opening', note: null, cpl: 250 },
    ]
    const { db } = makeMockDb(cardStates, cards)

    const session = await buildReviewSession(USER, db as never)

    expect(session.cards[0]).toEqual({
      cardId: 'card-1',
      fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
      correctMove: 'Bb5',
      classification: 'blunder',
      isNew: false,
      theme: 'opening',
      note: null,
      cpl: 250,
    })
  })

  // Issue #29: cpl is passed through on each SessionCard; null when missing
  it('passes cpl through from the cards row, defaulting to null when absent', async () => {
    const cardStates: Row[] = [
      { card_id: 'card-with-cpl', user_id: USER, state: 'review', due_date: PAST, stability: 5, difficulty: 3, review_count: 2 },
      { card_id: 'card-no-cpl', user_id: USER, state: 'review', due_date: PAST, stability: 5, difficulty: 3, review_count: 2 },
    ]
    const cards: Row[] = [
      { id: 'card-with-cpl', fen: 'fen1', correct_move: 'e4', classification: 'blunder', cpl: 310 },
      { id: 'card-no-cpl', fen: 'fen2', correct_move: 'Nf3', classification: 'mistake' },
    ]
    const { db } = makeMockDb(cardStates, cards)

    const session = await buildReviewSession(USER, db as never)

    const withCpl = session.cards.find((c) => c.cardId === 'card-with-cpl')
    const noCpl = session.cards.find((c) => c.cardId === 'card-no-cpl')
    expect(withCpl?.cpl).toBe(310)
    expect(noCpl?.cpl).toBeNull()
  })

  // -------------------------------------------------------------------------
  // Issue #28: session passes theme + note through from cards row
  // -------------------------------------------------------------------------
  it('passes theme and note through from the cards row', async () => {
    const cardStates: Row[] = [
      { card_id: 'card-1', user_id: USER, state: 'review', due_date: PAST, stability: 5, difficulty: 3, review_count: 2 },
    ]
    const cards: Row[] = [
      { id: 'card-1', fen: 'fen1', correct_move: 'e4', classification: 'blunder', theme: 'tactics', note: "Don't trade the fianchetto bishop" },
    ]
    const { db } = makeMockDb(cardStates, cards)

    const session = await buildReviewSession(USER, db as never)

    expect(session.cards[0]).toMatchObject({
      theme: 'tactics',
      note: "Don't trade the fianchetto bishop",
    })
  })

  // =========================================================================
  // Phase 17: Quiz Modes — Filtered Sessions
  // =========================================================================

  // -------------------------------------------------------------------------
  // Test 7: mode=standard behaves identically to the default
  // -------------------------------------------------------------------------
  it('mode=standard returns the same result as the default (no mode)', async () => {

    const cardStates: Row[] = [
      { card_id: 'card-1', user_id: USER, state: 'review', due_date: PAST, stability: 5, difficulty: 3, review_count: 2 },
      { card_id: 'card-2', user_id: USER, state: 'new', due_date: TODAY, stability: 0, difficulty: 0, review_count: 0 },
    ]
    const cards: Row[] = [
      { id: 'card-1', fen: 'fen1', correct_move: 'e4', classification: 'blunder' },
      { id: 'card-2', fen: 'fen2', correct_move: 'Nf3', classification: 'great' },
    ]
    const { db: dbDefault } = makeMockDb(cardStates, cards)
    const { db: dbStandard } = makeMockDb(cardStates, cards)

    const defaultSession = await buildReviewSession(USER, dbDefault as never)
    const standardSession = await buildReviewSession(USER, dbStandard as never, { mode: 'standard' })

    expect(standardSession.cards).toHaveLength(defaultSession.cards.length)
    expect(standardSession.totalDue).toBe(defaultSession.totalDue)
  })

  // -------------------------------------------------------------------------
  // Test 8: mode=mistakes returns only blunder/mistake cards
  // -------------------------------------------------------------------------
  it('mode=mistakes returns only cards with classification blunder or mistake', async () => {
    const cardStates: Row[] = [
      { card_id: 'card-blunder', user_id: USER, state: 'review', due_date: PAST, stability: 5, difficulty: 3, review_count: 2 },
      { card_id: 'card-mistake', user_id: USER, state: 'review', due_date: PAST, stability: 5, difficulty: 3, review_count: 2 },
      { card_id: 'card-great',   user_id: USER, state: 'review', due_date: PAST, stability: 5, difficulty: 3, review_count: 2 },
    ]
    const cards: Row[] = [
      { id: 'card-blunder', fen: 'fen1', correct_move: 'e4', classification: 'blunder' },
      { id: 'card-mistake', fen: 'fen2', correct_move: 'Nf3', classification: 'mistake' },
      { id: 'card-great',   fen: 'fen3', correct_move: 'Bb5', classification: 'great' },
    ]
    const { db } = makeMockDb(cardStates, cards)

    const session = await buildReviewSession(USER, db as never, { mode: 'mistakes' })

    const ids = session.cards.map((c) => c.cardId)
    expect(ids).toContain('card-blunder')
    expect(ids).toContain('card-mistake')
    expect(ids).not.toContain('card-great')
  })

  // -------------------------------------------------------------------------
  // Test 9: mode=brilliancies returns only great/brilliant cards
  // -------------------------------------------------------------------------
  it('mode=brilliancies returns only cards with classification great or brilliant', async () => {
    const cardStates: Row[] = [
      { card_id: 'card-blunder',   user_id: USER, state: 'review', due_date: PAST, stability: 5, difficulty: 3, review_count: 2 },
      { card_id: 'card-great',     user_id: USER, state: 'review', due_date: PAST, stability: 5, difficulty: 3, review_count: 2 },
      { card_id: 'card-brilliant', user_id: USER, state: 'review', due_date: PAST, stability: 5, difficulty: 3, review_count: 2 },
    ]
    const cards: Row[] = [
      { id: 'card-blunder',   fen: 'fen1', correct_move: 'e4',  classification: 'blunder' },
      { id: 'card-great',     fen: 'fen2', correct_move: 'Nf3', classification: 'great' },
      { id: 'card-brilliant', fen: 'fen3', correct_move: 'Bb5', classification: 'brilliant' },
    ]
    const { db } = makeMockDb(cardStates, cards)

    const session = await buildReviewSession(USER, db as never, { mode: 'brilliancies' })

    const ids = session.cards.map((c) => c.cardId)
    expect(ids).toContain('card-great')
    expect(ids).toContain('card-brilliant')
    expect(ids).not.toContain('card-blunder')
  })

  // -------------------------------------------------------------------------
  // Test 10: mode=recent returns only cards from games in last 7 days
  // -------------------------------------------------------------------------
  it('mode=recent returns only cards whose game_played_at is within the last 7 days', async () => {
    const now = new Date('2025-06-15T12:00:00Z')
    const duePast     = '2025-06-13T12:00:00Z' // due before now — cards are due in this mock world
    const recentDate  = new Date('2025-06-12T10:00:00Z').toISOString() // 3 days ago — included
    const oldDate     = new Date('2025-06-01T10:00:00Z').toISOString() // 14 days ago — excluded
    const nullDate    = null                                             // no date — excluded

    const cardStates: Row[] = [
      { card_id: 'card-recent', user_id: USER, state: 'review', due_date: duePast, stability: 5, difficulty: 3, review_count: 2 },
      { card_id: 'card-old',    user_id: USER, state: 'review', due_date: duePast, stability: 5, difficulty: 3, review_count: 2 },
      { card_id: 'card-null',   user_id: USER, state: 'review', due_date: duePast, stability: 5, difficulty: 3, review_count: 2 },
    ]
    const cards: Row[] = [
      { id: 'card-recent', fen: 'fen1', correct_move: 'e4',  classification: 'blunder', game_played_at: recentDate },
      { id: 'card-old',    fen: 'fen2', correct_move: 'Nf3', classification: 'mistake', game_played_at: oldDate },
      { id: 'card-null',   fen: 'fen3', correct_move: 'Bb5', classification: 'great',   game_played_at: nullDate },
    ]
    const { db } = makeMockDb(cardStates, cards)

    const session = await buildReviewSession(USER, db as never, { mode: 'recent', now })

    const ids = session.cards.map((c) => c.cardId)
    expect(ids).toContain('card-recent')
    expect(ids).not.toContain('card-old')
    expect(ids).not.toContain('card-null')
  })

  // -------------------------------------------------------------------------
  // Test 11: FSRS due-date filtering still applies within a filtered mode
  // -------------------------------------------------------------------------
  it('mode=mistakes excludes cards that are not yet due even if classification matches', async () => {
    const cardStates: Row[] = [
      { card_id: 'card-due',     user_id: USER, state: 'review', due_date: PAST,   stability: 5, difficulty: 3, review_count: 2 },
      { card_id: 'card-not-due', user_id: USER, state: 'review', due_date: FUTURE, stability: 5, difficulty: 3, review_count: 2 },
    ]
    const cards: Row[] = [
      { id: 'card-due',     fen: 'fen1', correct_move: 'e4',  classification: 'blunder' },
      { id: 'card-not-due', fen: 'fen2', correct_move: 'Nf3', classification: 'mistake' },
    ]
    const { db } = makeMockDb(cardStates, cards)

    const session = await buildReviewSession(USER, db as never, { mode: 'mistakes' })

    const ids = session.cards.map((c) => c.cardId)
    expect(ids).toContain('card-due')
    expect(ids).not.toContain('card-not-due')
  })
})
