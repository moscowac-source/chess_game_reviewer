import { NextResponse } from 'next/server'
import { withAuthedRoute, type AuthedRouteDeps } from '@/lib/with-authed-route'
import { apiError } from '@/lib/api-response'
import { computeStreak } from '@/lib/streak'

interface StreakDeps extends AuthedRouteDeps {
  now?: () => Date
}

export const GET = withAuthedRoute<StreakDeps>(async ({ db, user, deps }) => {
  const now = deps.now ?? (() => new Date())

  const { data, error } = await db
    .from('review_log')
    .select('reviewed_at')
    .eq('user_id', user.id)

  if (error) {
    return apiError(500, error.message)
  }

  const dates = (data ?? []).map((row: { reviewed_at: string }) => new Date(row.reviewed_at))
  const streak = computeStreak(dates, now())

  return NextResponse.json({ streak })
})
