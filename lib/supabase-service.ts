import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Service-role Supabase client for background workers (Inngest functions, cron).
 *
 * Bypasses RLS — only call from trusted server-only contexts where the
 * user identity has already been validated and the operations you perform are
 * scoped to that user_id explicitly in every query/write.
 *
 * Requires `SUPABASE_SERVICE_ROLE_KEY` in the server environment. Throws a
 * clear error at call time (not at module load) if missing so the rest of the
 * app can still build.
 */
export function createServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set')
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set — required for background sync')
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
