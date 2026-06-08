import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient, getSessionUser } from '@/lib/supabase/server'
import { checkPlayerExists } from '@/lib/chess-com/client'

/** Outcome of the server-side Chess.com existence check. */
export type PlayerCheck = 'found' | 'not_found' | 'unreachable'

interface ChessAccountDeps {
  db?: SupabaseClient
  authFn?: () => Promise<{ id: string } | null>
  /** Injectable so tests never hit the network. */
  checkPlayer?: (username: string) => Promise<PlayerCheck>
}

type NextRouteContext = { params: Promise<Record<string, string | string[] | undefined>> }

// Chess.com handles are letters/digits/underscore/hyphen. The real validation
// is the existence check below; this just keeps junk out of the proxied call.
const USERNAME_RE = /^[A-Za-z0-9_-]{1,50}$/

async function defaultCheckPlayer(username: string): Promise<PlayerCheck> {
  try {
    return (await checkPlayerExists(username)) ? 'found' : 'not_found'
  } catch {
    // Network error, rate limit, or 5xx — we couldn't confirm either way.
    return 'unreachable'
  }
}

/**
 * Link (or update) the signed-in user's Chess.com account.
 *
 * Replaces the onboarding flow's browser-side Supabase upsert + direct
 * chess.com fetch (#48): auth runs through the session cookie, the existence
 * check is proxied server-side, and the write goes through the service-bound
 * client like every other route.
 */
export async function PUT(req: Request, deps: ChessAccountDeps): Promise<NextResponse>
export async function PUT(req: Request, ctx: NextRouteContext): Promise<NextResponse>
export async function PUT(req: Request, deps: ChessAccountDeps | NextRouteContext): Promise<NextResponse> {
  const actualDeps: ChessAccountDeps = (deps ?? {}) as ChessAccountDeps
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
  const username = typeof raw.username === 'string' ? raw.username.trim() : ''
  if (!USERNAME_RE.test(username)) {
    return NextResponse.json(
      { error: 'Enter a valid Chess.com username (letters, numbers, underscore or hyphen).' },
      { status: 400 },
    )
  }

  const checkPlayer = actualDeps.checkPlayer ?? defaultCheckPlayer
  const check = await checkPlayer(username)
  if (check === 'not_found') {
    return NextResponse.json(
      { error: 'Username not found on Chess.com. Check the spelling and try again.' },
      { status: 404 },
    )
  }
  if (check === 'unreachable') {
    return NextResponse.json(
      { error: 'Could not reach Chess.com to verify that username. Please try again.' },
      { status: 502 },
    )
  }

  // The users row is auto-created on signup (migration 004), so a plain update
  // is enough — no need to carry the email for an insert.
  const db = actualDeps.db ?? (await createClient())
  const { error } = await db
    .from('users')
    .update({ chess_com_username: username })
    .eq('id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, username })
}
