import type { CardClassification } from '@/types/database'

// Tightened "great" thresholds — issue #78. Matching the engine's top move is
// only a teaching moment when the position had room to go wrong: past opening
// theory, with enough legal alternatives, and with a clean CPL.
const GREAT_MIN_FULLMOVE = 12
const GREAT_MIN_LEGAL_MOVES = 8
const GREAT_MAX_CPL = 10

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
    legalMoveCount >= GREAT_MIN_LEGAL_MOVES &&
    fullmove >= GREAT_MIN_FULLMOVE &&
    cpl <= GREAT_MAX_CPL
  ) {
    return 'great'
  }
  return null
}
