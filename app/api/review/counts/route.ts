import { NextResponse } from 'next/server'
import { withAuthedRoute } from '@/lib/with-authed-route'
import { buildReviewSession, type ReviewMode } from '@/lib/review-session-manager'

const MODES: ReviewMode[] = ['standard', 'recent', 'mistakes', 'brilliancies']

export const GET = withAuthedRoute(async ({ db, user }) => {
  const results = await Promise.all(
    MODES.map(async (mode) => {
      const session = await buildReviewSession(user.id, db, { mode })
      return [mode, session.cards.length] as const
    }),
  )

  const counts = Object.fromEntries(results)
  return NextResponse.json(counts)
})
