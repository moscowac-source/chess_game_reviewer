import type { SupabaseClient } from '@supabase/supabase-js'
import type { StepLogger, SyncStepEvent } from './sync-orchestrator'

/**
 * Builds a StepLogger bound to a single `sync_log` row.
 *
 * Inserts fail loudly — we intentionally re-throw any error from the
 * `sync_step_log` insert so an observability failure doesn't disappear
 * silently. If the caller wants a best-effort variant, it can wrap this.
 */
export function makeSupabaseStepLogger(
  db: SupabaseClient,
  syncLogId: string,
): StepLogger {
  return async (event: SyncStepEvent): Promise<void> => {
    const { error } = await db.from('sync_step_log').insert({
      sync_log_id: syncLogId,
      game_url: event.gameUrl ?? null,
      game_index: event.gameIndex ?? null,
      step: event.step,
      status: event.status,
      duration_ms: event.durationMs ?? null,
      error: event.error ?? null,
      error_code: event.errorCode ?? null,
      details: event.details ?? null,
    })
    if (error) {
      throw new Error(
        `sync_step_log insert failed: ${error.message ?? 'unknown'} ` +
          `(step=${event.step} status=${event.status})`,
      )
    }
  }
}
