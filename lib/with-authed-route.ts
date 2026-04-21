import type { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { getSessionUser } from '@/lib/supabase-server'
import { apiError } from '@/lib/api-response'

export interface AuthedRouteDeps {
  db?: SupabaseClient
  authFn?: () => Promise<{ id: string } | null>
}

export interface AuthedRouteContext<D extends AuthedRouteDeps = AuthedRouteDeps> {
  req: Request
  db: SupabaseClient
  user: { id: string }
  deps: D
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
 */
export function withAuthedRoute<D extends AuthedRouteDeps = AuthedRouteDeps>(
  handler: (ctx: AuthedRouteContext<D>) => Promise<Response | NextResponse>,
): (req: Request, deps?: D) => Promise<Response | NextResponse> {
  return async (req, deps) => {
    const actualDeps = (deps ?? {}) as D
    const db = actualDeps.db ?? supabase
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
}
