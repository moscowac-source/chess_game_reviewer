import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { fetch as undiciFetch } from 'undici'

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
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL is not set')
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set — required for background sync')
  // Use undici's fetch directly instead of Node's global. Something in the
  // worker's module graph (Inngest SDK and/or one of its deps) wipes
  // `globalThis.fetch` after boot — a standalone `node -e` has fetch, but
  // by the time an Inngest handler runs it's undefined, and supabase-js
  // then throws "fetch is not a function". undici is the same HTTP client
  // Node's global fetch is built on, so this is a direct, stable reference.
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: undiciFetch as unknown as typeof fetch },
  })
}
