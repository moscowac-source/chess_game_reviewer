import type { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient, getSessionUser } from '@/lib/supabase-server'
import { apiError } from '@/lib/api-response'

export interface AuthedRouteDeps {
  db?: SupabaseClient
  authFn?: () => Promise<{ id: string } | null>
  params?: Promise<Record<string, string | string[] | undefined>>
}

export interface AuthedRouteContext<D extends AuthedRouteDeps = AuthedRouteDeps> {
  req: Request
  db: SupabaseClient
  user: { id: string }
  deps: D
}

type NextRouteContext = {
  params: Promise<Record<string, string | string[] | undefined>>
}

export interface WrappedAuthedRoute<D extends AuthedRouteDeps> {
  (req: Request, deps: D): Promise<Response | NextResponse>
  (req: Request, ctx: NextRouteContext): Promise<Response | NextResponse>
}

/**
 * Wrap an API route handler with the shared auth + db preamble.
 *
 * - Resolves `db` from `deps.db` (falling back to the real client)
 * - Resolves `authFn` from `deps.authFn` (falling back to the session cookie)
 * - Short-circuits with 401 when no authenticated user
 * - Catches uncaught errors from the handler and returns 500
 *
 * Extra per-route deps (e.g. `params`, `recordReviewFn`) pass through unchanged
 * on the `deps` field — extend the deps type parameter to type them.
 *
 * The returned function carries two overload signatures so it satisfies both
 * Next.js's route-handler contract `(req, { params })` and the test-time
 * dependency-injection shape `(req, deps)`.
 */
export function withAuthedRoute<D extends AuthedRouteDeps = AuthedRouteDeps>(
  handler: (ctx: AuthedRouteContext<D>) => Promise<Response | NextResponse>,
): WrappedAuthedRoute<D> {
  const wrapped = async (
    req: Request,
    deps?: D | NextRouteContext,
  ): Promise<Response | NextResponse> => {
    const actualDeps = (deps ?? {}) as D
    const db = actualDeps.db ?? (await createClient())
    const authFn = actualDeps.authFn ?? getSessionUser
    try {
      const user = await authFn()
      if (!user) return apiError(401, 'Unauthorized')
      return await handler({ req, db, user, deps: actualDeps })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Internal error'
      return apiError(500, message)
    }
  }
  return wrapped as WrappedAuthedRoute<D>
}
