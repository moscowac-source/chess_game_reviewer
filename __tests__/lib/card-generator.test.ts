/**
 * @jest-environment node
 */

import { generateCards, classifyTheme } from '@/lib/card-generator'
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
  // Issue #28: each inserted card carries a theme computed from the FEN
  // -------------------------------------------------------------------------
  it('writes a theme on each new card based on the FEN', async () => {
    const { db, insertedRows } = makeMockDb()
    const OPENING_FEN = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'
    const ENDGAME_FEN = '8/8/4k3/3p4/3P4/4K3/1P3P2/R7 w - - 0 40'
    const positions = [
      makePosition(OPENING_FEN, 'e5', 'blunder'),
      makePosition(ENDGAME_FEN, 'Kd6', 'mistake'),
    ]

    await generateCards(positions, db as never)

    expect(insertedRows).toHaveLength(2)
    expect(insertedRows.find((r) => r.fen === OPENING_FEN)).toMatchObject({
      theme: 'opening',
    })
    expect(insertedRows.find((r) => r.fen === ENDGAME_FEN)).toMatchObject({
      theme: 'endgame',
    })
  })

  it('writes note as null on each new card (placeholder for future AI notes)', async () => {
    const { db, insertedRows } = makeMockDb()
    const positions = [makePosition(FEN_A, 'e5', 'blunder')]

    await generateCards(positions, db as never)

    expect(insertedRows).toHaveLength(1)
    expect(insertedRows[0]).toHaveProperty('note', null)
  })

  // Issue #29: the cpl value from the PositionAnalysis is persisted on the card
  it('writes the cpl value from the PositionAnalysis on each new card', async () => {
    const { db, insertedRows } = makeMockDb()
    const position: PositionAnalysis = {
      fen: FEN_A,
      movePlayed: 'e5',
      cpl: 310,
      bestMove: 'Nf3',
      bestLine: ['Nf3'],
      classification: 'blunder',
    }

    await generateCards([position], db as never)

    expect(insertedRows).toHaveLength(1)
    expect(insertedRows[0]).toMatchObject({ cpl: 310 })
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

// ---------------------------------------------------------------------------
// Issue #28: classifyTheme heuristic
// ---------------------------------------------------------------------------
describe('classifyTheme', () => {
  // Starting-position FEN, fullmove counter = 1 → opening
  it('returns opening when fullmove counter is <= 12', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    expect(classifyTheme(fen)).toBe('opening')
  })

  // King + rook + 3 pawns vs king + 2 pawns: 5+2+3 = 10 material, fullmove 40 → endgame
  it('returns endgame when non-king material <= 14 and past opening', () => {
    const fen = '8/8/4k3/3p4/3P4/4K3/1P3P2/R7 w - - 0 40'
    expect(classifyTheme(fen)).toBe('endgame')
  })

  // Middlegame: fullmove 20, both sides still have queen+rooks+minors+pawns
  it('returns tactics when past opening and material is still high', () => {
    const fen = 'r1bq1rk1/pp2bppp/2n1pn2/2pp4/3P4/2NBPN2/PPP2PPP/R1BQ1RK1 w - - 0 20'
    expect(classifyTheme(fen)).toBe('tactics')
  })
})
