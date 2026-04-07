import type { SupabaseClient } from '@supabase/supabase-js'
import type { PositionAnalysis } from './stockfish-analyzer'

export interface GenerateCardsResult {
  created: number
  skipped: number
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
    }))
    const { error: insertError } = await db.from('cards').insert(rows)
    if (insertError) throw insertError
  }

  return {
    created: toInsert.length,
    skipped: classified.length - toInsert.length,
  }
}
