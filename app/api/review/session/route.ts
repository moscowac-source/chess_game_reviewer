import { NextResponse } from 'next/server'
import { withAuthedRoute } from '@/lib/with-authed-route'
import { buildReviewSession, type ReviewMode } from '@/lib/review-session-manager'

const VALID_MODES = new Set<ReviewMode>(['standard', 'recent', 'mistakes', 'brilliancies'])

export const GET = withAuthedRoute(async ({ req, db, user }) => {
  const { searchParams } = new URL(req.url)
  const modeParam = searchParams.get('mode') ?? 'standard'
  const mode: ReviewMode = VALID_MODES.has(modeParam as ReviewMode)
    ? (modeParam as ReviewMode)
    : 'standard'

  const { data: userRow } = await db
    .from('users')
    .select('daily_new_limit')
    .eq('id', user.id)
    .single()

  const dailyNewLimit =
    typeof (userRow as { daily_new_limit?: number } | null)?.daily_new_limit === 'number'
      ? (userRow as { daily_new_limit: number }).daily_new_limit
      : 10

  const session = await buildReviewSession(user.id, db, { mode, dailyNewLimit })
  return NextResponse.json(session)
})
