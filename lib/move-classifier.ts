import type { CardClassification } from '@/types/database'

// Issue #78: 'great' was firing on standard opening moves (e4 from the
// starting position, etc.) and burying real signal under noise. Inside the
// opening-book window every reasonable move scores within a handful of cp of
// the engine's top, so a match there isn't a skill to drill. Past move 8 the
// player is on their own — a best-match move there IS interesting.
//
// Blunder/mistake still apply regardless of fullmove: a genuine early error
// like 3...Qh5?? is exactly the kind of position the user wants to remember.
const OPENING_BOOK_LAST_MOVE = 8

export function classifyMove(
  cpl: number,
  movePlayed: string,
  bestMove: string,
  legalMoveCount: number,
  fullmove: number,
): CardClassification | null {
  if (cpl > 200) return 'blunder'
  if (cpl >= 100) return 'mistake'
  if (
    movePlayed === bestMove &&
    legalMoveCount > 1 &&
    fullmove > OPENING_BOOK_LAST_MOVE
  ) {
    return 'great'
  }
  return null
}
