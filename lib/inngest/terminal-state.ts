import type { SupabaseClient } from '@supabase/supabase-js'
import { makeSupabaseStepLogger } from '@/lib/sync-step-logger'

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

  await writeTerminalStepRow(db, syncLogId, truncated)
}

/**
 * Close a failed run's audit timeline with a terminal `sync-failed` step row,
 * mirroring the `sync-end` row a successful run emits. Without this, a run that
 * crashes or times out before runSync can write its own `sync-end` leaves the
 * `/sync/<id>` timeline stopping abruptly after the last per-game step (#70).
 *
 * - Idempotent: markSyncFailed can run once per Inngest retry and again from
 *   the onFailure handler, but the timeline should carry a single terminal row.
 * - Best-effort: an audit-log write hiccup must never throw out of the terminal
 *   handler and mask the real failure already recorded on `sync_log`.
 */
async function writeTerminalStepRow(
  db: SupabaseClient,
  syncLogId: string,
  error: string,
): Promise<void> {
  try {
    const { data: existing } = await db
      .from('sync_step_log')
      .select('id')
      .eq('sync_log_id', syncLogId)
      .eq('step', 'sync-failed')
      .limit(1)
    if (existing && existing.length > 0) return

    await makeSupabaseStepLogger(db, syncLogId)({
      step: 'sync-failed',
      status: 'error',
      error,
    })
  } catch {
    // Swallow — sync_log.error is the source of truth for the failure.
  }
}
