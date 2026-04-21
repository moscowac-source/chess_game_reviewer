import { NextResponse } from 'next/server'
import { withAuthedRoute, type AuthedRouteDeps } from '@/lib/with-authed-route'
import { apiError } from '@/lib/api-response'

interface AccuracyDeps extends AuthedRouteDeps {
  now?: () => Date
}

const DAY_MS = 24 * 60 * 60 * 1000

export const GET = withAuthedRoute<AccuracyDeps>(async ({ req, db, user, deps }) => {
  const now = deps.now ?? (() => new Date())

  const url = new URL(req.url)
  const daysParam = url.searchParams.get('days')
  let days = 7
  if (daysParam !== null) {
    const parsed = Number(daysParam)
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 30) {
      return apiError(400, 'Invalid days parameter')
    }
    days = parsed
  }

  const cutoff = new Date(now().getTime() - days * DAY_MS).toISOString()

  const { data, error } = await db
    .from('review_log')
    .select('rating, reviewed_at')
    .eq('user_id', user.id)
    .gte('reviewed_at', cutoff)

  if (error) {
    return apiError(500, error.message)
  }

  const rows = (data ?? []) as { rating: string }[]
  const totalReviews = rows.length
  if (totalReviews === 0) {
    return NextResponse.json({ accuracy: null, totalReviews: 0 })
  }

  const correct = rows.filter((r) => r.rating === 'good' || r.rating === 'easy').length
  const accuracy = Math.round((correct / totalReviews) * 100)

  return NextResponse.json({ accuracy, totalReviews })
})
