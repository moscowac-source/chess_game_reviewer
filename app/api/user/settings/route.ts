import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient, getSessionUser } from '@/lib/supabase-server'
import { withAuthedRoute } from '@/lib/with-authed-route'
import { apiError } from '@/lib/api-response'

interface SettingsDeps {
  db?: SupabaseClient
  authFn?: () => Promise<{ id: string } | null>
}

type NextRouteContext = { params: Promise<Record<string, string | string[] | undefined>> }

const MIN_DAILY_NEW = 4
const MAX_DAILY_NEW = 30

export const GET = withAuthedRoute(async ({ db, user }) => {
  const { data, error } = await db
    .from('users')
    .select('daily_new_limit')
    .eq('id', user.id)
    .single()

  if (error) return apiError(500, error.message)
  return NextResponse.json({ daily_new_limit: data?.daily_new_limit ?? 10 })
})

export async function PATCH(req: Request, deps: SettingsDeps): Promise<NextResponse>
export async function PATCH(req: Request, ctx: NextRouteContext): Promise<NextResponse>
export async function PATCH(req: Request, deps: SettingsDeps | NextRouteContext): Promise<NextResponse> {
  const actualDeps: SettingsDeps = (deps ?? {}) as SettingsDeps
  const authFn = actualDeps.authFn ?? getSessionUser
  const user = await authFn()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const raw = (body as { daily_new_limit?: unknown } | null)?.daily_new_limit
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < MIN_DAILY_NEW || raw > MAX_DAILY_NEW) {
    return NextResponse.json(
      { error: `daily_new_limit must be an integer between ${MIN_DAILY_NEW} and ${MAX_DAILY_NEW}` },
      { status: 400 },
    )
  }

  const db = actualDeps.db ?? (await createClient())
  const { error } = await db
    .from('users')
    .update({ daily_new_limit: raw })
    .eq('id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
