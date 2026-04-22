import type { SupabaseClient } from '@supabase/supabase-js'
import type { ArchiveCache, ConditionalCacheHints } from './client'

/**
 * Supabase-backed archive cache. One row per (user_id, year, month) stores
 * the ETag / Last-Modified header we last saw so the next sync can send
 * `If-None-Match` and get a cheap 304 for immutable past months.
 *
 * Writes are best-effort: if persisting the cache fails, the sync should
 * still complete. Log but swallow errors.
 */
export function makeSupabaseArchiveCache(
  db: SupabaseClient,
  userId: string,
): ArchiveCache {
  return {
    async get(year: number, month: number): Promise<ConditionalCacheHints | null> {
      const { data, error } = await db
        .from('chess_com_archives')
        .select('etag,last_modified')
        .eq('user_id', userId)
        .eq('year', year)
        .eq('month', month)
        .maybeSingle()
      if (error || !data) return null
      return {
        etag: data.etag ?? null,
        lastModified: data.last_modified ?? null,
      }
    },

    async set(
      year: number,
      month: number,
      value: { etag: string | null; lastModified: string | null },
    ): Promise<void> {
      const { error } = await db
        .from('chess_com_archives')
        .upsert(
          {
            user_id: userId,
            year,
            month,
            etag: value.etag,
            last_modified: value.lastModified,
            fetched_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,year,month' },
        )
      if (error) {
        console.warn('[archive-cache] failed to persist row', { year, month, error })
      }
    },
  }
}
