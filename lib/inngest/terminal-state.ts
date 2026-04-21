import type { SupabaseClient } from '@supabase/supabase-js'

const MAX_ERROR_LEN = 2000

export async function markSyncFailed(
  db: SupabaseClient,
  syncLogId: string,
  message: string,
): Promise<void> {
  const truncated = message.length > MAX_ERROR_LEN ? message.slice(0, MAX_ERROR_LEN) : message
  await db
    .from('sync_log')
    .update({
      stage: 'error',
      completed_at: new Date().toISOString(),
      error: truncated,
    })
    .eq('id', syncLogId)
}
