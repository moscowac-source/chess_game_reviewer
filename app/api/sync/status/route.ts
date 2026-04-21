import { NextResponse } from 'next/server'
import { withAuthedRoute } from '@/lib/with-authed-route'
import { apiError } from '@/lib/api-response'

export const GET = withAuthedRoute(async ({ db }) => {
  const { data, error } = await db
    .from('sync_log')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(1)

  if (error) return apiError(500, error.message)

  const entry = data && data.length > 0 ? data[0] : null
  return NextResponse.json(entry)
})
