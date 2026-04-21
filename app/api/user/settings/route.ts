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
const MAX_NAME_LEN = 60

export const GET = withAuthedRoute(async ({ db, user }) => {
  const { data, error } = await db
    .from('users')
    .select('daily_new_limit, first_name, last_name')
    .eq('id', user.id)
    .single()

  if (error) return apiError(500, error.message)
  return NextResponse.json({
    daily_new_limit: data?.daily_new_limit ?? 10,
    first_name: data?.first_name ?? null,
    last_name: data?.last_name ?? null,
  })
})

function validateName(raw: unknown): { ok: true; value: string | null } | { ok: false } {
  if (raw === null) return { ok: true, value: null }
  if (typeof raw !== 'string') return { ok: false }
  const trimmed = raw.trim()
  if (trimmed.length === 0) return { ok: true, value: null }
  if (trimmed.length > MAX_NAME_LEN) return { ok: false }
  return { ok: true, value: trimmed }
}

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

  const raw = (body ?? {}) as Record<string, unknown>
  const update: Record<string, unknown> = {}

  if ('daily_new_limit' in raw) {
    const d = raw.daily_new_limit
    if (typeof d !== 'number' || !Number.isInteger(d) || d < MIN_DAILY_NEW || d > MAX_DAILY_NEW) {
      return NextResponse.json(
        { error: `daily_new_limit must be an integer between ${MIN_DAILY_NEW} and ${MAX_DAILY_NEW}` },
        { status: 400 },
      )
    }
    update.daily_new_limit = d
  }

  if ('first_name' in raw) {
    const r = validateName(raw.first_name)
    if (!r.ok) return NextResponse.json({ error: `first_name must be a string up to ${MAX_NAME_LEN} chars` }, { status: 400 })
    update.first_name = r.value
  }

  if ('last_name' in raw) {
    const r = validateName(raw.last_name)
    if (!r.ok) return NextResponse.json({ error: `last_name must be a string up to ${MAX_NAME_LEN} chars` }, { status: 400 })
    update.last_name = r.value
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const db = actualDeps.db ?? (await createClient())
  const { error } = await db
    .from('users')
    .update(update)
    .eq('id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
