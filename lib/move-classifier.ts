import type { CardClassification } from '@/types/database'

export function classifyMove(
  cpl: number,
  movePlayed: string,
  bestMove: string,
  legalMoveCount: number,
): CardClassification | null {
  if (cpl > 200) return 'blunder'
  if (cpl >= 100) return 'mistake'
  if (movePlayed === bestMove && legalMoveCount > 1) return 'great'
  return null
}
