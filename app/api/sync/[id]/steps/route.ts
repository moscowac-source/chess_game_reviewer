import { NextResponse } from 'next/server'
import { withAuthedRoute, type AuthedRouteDeps } from '@/lib/with-authed-route'
import { apiError } from '@/lib/api-response'

interface StepsRouteDeps extends AuthedRouteDeps {
  params: Promise<{ id: string }>
}

export const GET = withAuthedRoute<StepsRouteDeps>(async ({ db, user, deps }) => {
  const { id } = await deps.params

  // Verify the sync_log row belongs to this user — RLS also enforces it on the
  // session-bound client, but the explicit 404 keeps error messages honest for
  // non-owners.
  const { data: parent } = await db
    .from('sync_log')
    .select('id, user_id, mode, started_at, completed_at, error, games_processed, cards_created, games_total, stage')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!parent) return apiError(404, 'Not found')

  const { data: steps, error } = await db
    .from('sync_step_log')
    .select('id, game_url, game_index, step, status, duration_ms, error, error_code, details, created_at')
    .eq('sync_log_id', id)
    .order('created_at', { ascending: true })

  if (error) return apiError(500, error.message)

  return NextResponse.json({ sync: parent, steps: steps ?? [] })
})
