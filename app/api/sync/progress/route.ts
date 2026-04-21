import { NextResponse } from 'next/server'
import { withAuthedRoute } from '@/lib/with-authed-route'
import { apiError } from '@/lib/api-response'

export const GET = withAuthedRoute(async ({ req, db, user }) => {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return apiError(400, 'Missing required query param: id')

  const { data, error } = await db
    .from('sync_log')
    .select('id, user_id, stage, games_processed, games_total, cards_created, error')
    .eq('id', id)
    .maybeSingle()

  if (error) return apiError(500, error.message)
  if (!data || data.user_id !== user.id) return apiError(404, 'Sync run not found')

  return NextResponse.json({
    stage: data.stage ?? 'queued',
    games_done: data.games_processed ?? 0,
    games_total: data.games_total ?? 0,
    cards_created: data.cards_created ?? 0,
    error: data.error ?? null,
  })
})
