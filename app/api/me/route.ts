import { NextResponse } from 'next/server'
import { withAuthedRoute } from '@/lib/with-authed-route'
import { apiError } from '@/lib/api-response'

export const GET = withAuthedRoute(async ({ db, user }) => {
  const { data, error } = await db
    .from('users')
    .select('email, chess_com_username, first_name, last_name')
    .eq('id', user.id)
    .single()

  if (error) return apiError(500, error.message)

  return NextResponse.json({
    email: data?.email ?? null,
    username: data?.chess_com_username ?? null,
    first_name: data?.first_name ?? null,
    last_name: data?.last_name ?? null,
  })
})
