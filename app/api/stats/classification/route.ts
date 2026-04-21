import { NextResponse } from 'next/server'
import { withAuthedRoute } from '@/lib/with-authed-route'
import { apiError } from '@/lib/api-response'

export const GET = withAuthedRoute(async ({ db, user }) => {
  const counts = { blunder: 0, mistake: 0, great: 0, brilliant: 0 }

  const { data: stateRows, error: stateError } = await db
    .from('card_state')
    .select('card_id')
    .eq('user_id', user.id)

  if (stateError) {
    return apiError(500, stateError.message)
  }

  const cardIds = (stateRows ?? []).map((r: { card_id: string }) => r.card_id)
  if (cardIds.length === 0) {
    return NextResponse.json(counts)
  }

  const { data: cardRows, error: cardError } = await db
    .from('cards')
    .select('classification')
    .in('id', cardIds)

  if (cardError) {
    return apiError(500, cardError.message)
  }

  for (const row of (cardRows ?? []) as { classification: string }[]) {
    if (row.classification in counts) {
      counts[row.classification as keyof typeof counts] += 1
    }
  }

  return NextResponse.json(counts)
})
