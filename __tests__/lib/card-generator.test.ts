/**
 * @jest-environment node
 */

import { generateCards } from '@/lib/card-generator'
import type { PositionAnalysis } from '@/lib/stockfish-analyzer'

// Builds a fake database that remembers what cards already exist
// and records what gets inserted
function makeMockDb(existingFens: string[] = []) {
  const insertedRows: Record<string, unknown>[] = []
  const db = {
    from: (_table: string) => ({
      select: (_cols: string) => ({
        in: (_col: string, vals: string[]) =>
          Promise.resolve({
            data: existingFens
              .filter((f) => vals.includes(f))
              .map((fen) => ({ fen })),
            error: null,
          }),
      }),
      insert: (rows: Record<string, unknown>[]) => {
        insertedRows.push(...rows)
        return Promise.resolve({ data: rows, error: null })
      },
    }),
  }
  return { db, insertedRows }
}

function makePosition(
  fen: string,
  movePlayed: string,
  classification: PositionAnalysis['classification'],
): PositionAnalysis {
  return { fen, movePlayed, cpl: 0, bestMove: movePlayed, bestLine: [], classification }
}

const FEN_A = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'
const FEN_B = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2'

// ---------------------------------------------------------------------------
// Test 1: a single new classified position creates one card
// ---------------------------------------------------------------------------
describe('generateCards', () => {
  it('creates a card for a single new classified position', async () => {
    const { db, insertedRows } = makeMockDb()
    const positions = [makePosition(FEN_A, 'e5', 'blunder')]

    const result = await generateCards(positions, db as never)

    expect(result.created).toBe(1)
    expect(result.skipped).toBe(0)
    expect(insertedRows).toHaveLength(1)
    expect(insertedRows[0]).toMatchObject({
      fen: FEN_A,
      correct_move: 'e5',
      classification: 'blunder',
    })
  })

  // -------------------------------------------------------------------------
  // Test 2: duplicate FEN → skipped, no new row inserted
  // -------------------------------------------------------------------------
  it('skips a position whose FEN already exists in the database', async () => {
    const { db, insertedRows } = makeMockDb([FEN_A])
    const positions = [makePosition(FEN_A, 'e5', 'blunder')]

    const result = await generateCards(positions, db as never)

    expect(result.created).toBe(0)
    expect(result.skipped).toBe(1)
    expect(insertedRows).toHaveLength(0)
  })

  // -------------------------------------------------------------------------
  // Test 3: two different FENs → two separate cards
  // -------------------------------------------------------------------------
  it('creates separate cards for two different positions', async () => {
    const { db, insertedRows } = makeMockDb()
    const positions = [
      makePosition(FEN_A, 'e5', 'blunder'),
      makePosition(FEN_B, 'Nf3', 'mistake'),
    ]

    const result = await generateCards(positions, db as never)

    expect(result.created).toBe(2)
    expect(result.skipped).toBe(0)
    expect(insertedRows).toHaveLength(2)
  })

  // -------------------------------------------------------------------------
  // Test 4: position with no classification is ignored entirely
  // -------------------------------------------------------------------------
  it('ignores positions with no classification', async () => {
    const { db, insertedRows } = makeMockDb()
    const positions = [makePosition(FEN_A, 'e5', null)]

    const result = await generateCards(positions, db as never)

    expect(result.created).toBe(0)
    expect(result.skipped).toBe(0)
    expect(insertedRows).toHaveLength(0)
  })

  // -------------------------------------------------------------------------
  // Test 5: mix — 3 positions, one FEN already exists → 2 created, 1 skipped
  // -------------------------------------------------------------------------
  it('handles a mix of new and already-seen positions', async () => {
    const FEN_C = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3'
    const { db, insertedRows } = makeMockDb([FEN_B])
    const positions = [
      makePosition(FEN_A, 'e5', 'blunder'),
      makePosition(FEN_B, 'Nf3', 'mistake'),  // already exists
      makePosition(FEN_C, 'Nc6', 'great'),
    ]

    const result = await generateCards(positions, db as never)

    expect(result.created).toBe(2)
    expect(result.skipped).toBe(1)
    expect(insertedRows).toHaveLength(2)
    expect(insertedRows.map((r) => r.fen)).not.toContain(FEN_B)
  })
})
