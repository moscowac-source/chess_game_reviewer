import { parseGame } from '../../lib/game-parser'

// Fixture: 3-move Ruy Lopez opening fragment, result wildcard
const SHORT_GAME_PGN = `[Event "Test"]
[White "Alice"]
[Black "Bob"]
[Result "*"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 *`

// Fixture: game ending in resignation (1-0)
const RESIGNATION_PGN = `[Event "Test"]
[White "Alice"]
[Black "Bob"]
[Result "1-0"]

1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0`

// Fixture: draw by agreement
const DRAW_PGN = `[Event "Test"]
[White "Alice"]
[Black "Bob"]
[Result "1/2-1/2"]

1. e4 e5 2. Nf3 Nc6 1/2-1/2`

// Fixture: one move only (incomplete)
const ONE_MOVE_PGN = `[Event "Test"]
[White "Alice"]
[Black "Bob"]
[Result "*"]

1. d4 *`

describe('parseGame', () => {
  it('returns one record per ply for a short game', () => {
    const positions = parseGame(SHORT_GAME_PGN)
    expect(positions).toHaveLength(6)
  })

  it('returns the starting FEN as the first position fen', () => {
    const positions = parseGame(SHORT_GAME_PGN)
    expect(positions[0].fen).toBe(
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    )
  })

  it('returns movePlayed in SAN notation', () => {
    const positions = parseGame(SHORT_GAME_PGN)
    expect(positions[0].movePlayed).toBe('e4')
    expect(positions[1].movePlayed).toBe('e5')
    expect(positions[2].movePlayed).toBe('Nf3')
    expect(positions[5].movePlayed).toBe('a6')
  })

  it('fen at each ply is the board state before that move was played', () => {
    const positions = parseGame(SHORT_GAME_PGN)
    // After e4 has been played, it's Black's turn — that should be position[1].fen
    expect(positions[1].fen).toContain(' b ')
    // After e4+e5, it's White's turn — position[2].fen
    expect(positions[2].fen).toContain(' w ')
  })

  it('handles game ending by resignation — returns all played moves', () => {
    const positions = parseGame(RESIGNATION_PGN)
    expect(positions).toHaveLength(7) // 7 plies before the checkmate move; Qxf7# is the 7th
    expect(positions[6].movePlayed).toBe('Qxf7#')
  })

  it('handles draw by agreement — returns all played moves', () => {
    const positions = parseGame(DRAW_PGN)
    expect(positions).toHaveLength(4)
    expect(positions[3].movePlayed).toBe('Nc6')
  })

  it('handles incomplete game with a single move', () => {
    const positions = parseGame(ONE_MOVE_PGN)
    expect(positions).toHaveLength(1)
    expect(positions[0].movePlayed).toBe('d4')
  })

  it('is a pure function — calling it twice returns identical results', () => {
    const first = parseGame(SHORT_GAME_PGN)
    const second = parseGame(SHORT_GAME_PGN)
    expect(first).toEqual(second)
  })
})
