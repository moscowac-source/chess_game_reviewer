import type { SupabaseClient } from '@supabase/supabase-js'
import type { PositionAnalysis } from './stockfish-analyzer'

export interface GenerateCardsResult {
  created: number
  skipped: number
}

export type CardTheme = 'opening' | 'endgame' | 'tactics'

const PIECE_VALUES: Record<string, number> = {
  p: 1, n: 3, b: 3, r: 5, q: 9,
}

export function classifyTheme(fen: string): CardTheme {
  const parts = fen.split(' ')
  const fullmove = parseInt(parts[5] ?? '1', 10)
  if (fullmove <= 12) return 'opening'

  const placement = parts[0] ?? ''
  let material = 0
  for (const ch of placement) {
    const value = PIECE_VALUES[ch.toLowerCase()]
    if (value !== undefined) material += value
  }
  if (material <= 14) return 'endgame'

  return 'tactics'
}

export async function generateCards(
  positions: PositionAnalysis[],
  db: SupabaseClient,
): Promise<GenerateCardsResult> {
  const classified = positions.filter((p) => p.classification !== null)

  if (classified.length === 0) return { created: 0, skipped: 0 }

  const fens = classified.map((p) => p.fen)

  const { data: existing, error: selectError } = await db
    .from('cards')
    .select('fen')
    .in('fen', fens)

  if (selectError) throw selectError

  const existingFens = new Set((existing ?? []).map((r: { fen: string }) => r.fen))
  const toInsert = classified.filter((p) => !existingFens.has(p.fen))

  if (toInsert.length > 0) {
    const rows = toInsert.map((p) => ({
      fen: p.fen,
      correct_move: p.movePlayed,
      classification: p.classification,
      theme: classifyTheme(p.fen),
      note: null,
      cpl: p.cpl,
    }))
    const { error: insertError } = await db.from('cards').insert(rows)
    if (insertError) throw insertError
  }

  return {
    created: toInsert.length,
    skipped: classified.length - toInsert.length,
  }
}
