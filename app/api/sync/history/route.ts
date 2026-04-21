import { NextResponse } from 'next/server'
import { withAuthedRoute } from '@/lib/with-authed-route'
import { apiError } from '@/lib/api-response'

export const GET = withAuthedRoute(async ({ db, user }) => {
  const { data, error } = await db
    .from('sync_log')
    .select('*')
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })
    .limit(7)

  if (error) return apiError(500, error.message)

  return NextResponse.json(data ?? [])
})
