import type { SupabaseClient } from '@supabase/supabase-js'
import type { PositionAnalysis } from './stockfish-analyzer'
import { defaultCardStateRow } from './fsrs-engine'

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
  gameId?: string | null,
  userId?: string | null,
): Promise<GenerateCardsResult> {
  const classified = positions.filter((p) => p.classification !== null)

  if (classified.length === 0) return { created: 0, skipped: 0 }

  const fens = classified.map((p) => p.fen)

  const { data: existing, error: selectError } = await db
    .from('cards')
    .select('id, fen')
    .in('fen', fens)

  if (selectError) throw selectError

  const existingByFen = new Map<string, string>(
    (existing ?? []).map((r: { id: string; fen: string }) => [r.fen, r.id]),
  )
  const toInsert = classified.filter((p) => !existingByFen.has(p.fen))

  const insertedIds: string[] = []
  if (toInsert.length > 0) {
    const rows = toInsert.map((p) => ({
      fen: p.fen,
      correct_move: p.movePlayed,
      best_move: p.bestMoveSan,
      classification: p.classification,
      theme: classifyTheme(p.fen),
      note: null,
      cpl: p.cpl,
      game_id: gameId ?? null,
    }))
    const { data: newRows, error: insertError } = await db
      .from('cards')
      .insert(rows)
      .select('id')
    if (insertError) throw insertError
    for (const r of (newRows ?? []) as { id: string }[]) insertedIds.push(r.id)
  }

  // Card ownership is represented by card_state rows (one per user+card). The
  // `cards` table is deduplicated by FEN across all users, so for every
  // classified position we see we need to ensure this user has a state row —
  // whether the card was just inserted or already existed from another user.
  if (userId) {
    const allCardIds = [...existingByFen.values(), ...insertedIds]
    if (allCardIds.length > 0) {
      const stateRows = allCardIds.map((cardId) => defaultCardStateRow(cardId, userId))
      const { error: stateError } = await db
        .from('card_state')
        .upsert(stateRows, { onConflict: 'user_id,card_id', ignoreDuplicates: true })
      if (stateError) throw stateError
    }
  }

  return {
    created: toInsert.length,
    skipped: classified.length - toInsert.length,
  }
}
