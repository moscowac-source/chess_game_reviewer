import type { SupabaseClient } from '@supabase/supabase-js'

export interface GetUserCardsOptions {
  select?: string
}

export async function getUserCards<T = { id: string }>(
  db: SupabaseClient,
  userId: string,
  options: GetUserCardsOptions = {},
): Promise<T[]> {
  const select = options.select ?? 'id'

  const { data: stateRows, error: stateError } = await db
    .from('card_state')
    .select('card_id')
    .eq('user_id', userId)

  if (stateError) throw new Error(stateError.message)

  const cardIds = (stateRows ?? []).map((r: { card_id: string }) => r.card_id)
  if (cardIds.length === 0) return []

  const { data: cardRows, error: cardError } = await db
    .from('cards')
    .select(select)
    .in('id', cardIds)

  if (cardError) throw new Error(cardError.message)

  return (cardRows ?? []) as T[]
}
