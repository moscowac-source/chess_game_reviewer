import { NextResponse } from 'next/server'
import { withAuthedRoute } from '@/lib/with-authed-route'
import { apiError } from '@/lib/api-response'
import { getUserCards } from '@/lib/user-cards'

export const GET = withAuthedRoute(async ({ db, user }) => {
  const counts = { blunder: 0, mistake: 0, great: 0, brilliant: 0 }

  let cardRows: { classification: string }[]
  try {
    cardRows = await getUserCards<{ classification: string }>(db, user.id, {
      select: 'classification',
    })
  } catch (err) {
    return apiError(500, err instanceof Error ? err.message : 'Failed to load cards')
  }

  for (const row of cardRows) {
    if (row.classification in counts) {
      counts[row.classification as keyof typeof counts] += 1
    }
  }

  return NextResponse.json(counts)
})
