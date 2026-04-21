import type { SupabaseClient } from '@supabase/supabase-js'
import { inngest } from './client'
import { runSync, type SyncProgress, type StepRunner } from '@/lib/sync-orchestrator'
import { createServiceClient } from '@/lib/supabase-service'
import { makeSupabaseStepLogger } from '@/lib/sync-step-logger'
import { markSyncFailed } from './terminal-state'

export interface SyncGamesDeps {
  db?: SupabaseClient
}

interface SyncGamesHandlerArgs {
  event: {
    data: {
      syncLogId: string
      userId: string
      username: string
      mode: 'historical' | 'incremental'
    }
  }
  step: StepRunner
}

/**
 * The handler body for the Inngest sync-games function. Extracted as a named
 * export so unit tests can drive it directly with a stub `step` without
 * needing the Inngest runtime.
 */
export async function syncGamesHandler({ event, step }: SyncGamesHandlerArgs) {
  const { syncLogId, userId, username, mode } = event.data

  const db: SupabaseClient = createServiceClient()

  await step.run('mark-fetching', async () => {
    await db
      .from('sync_log')
      .update({ stage: 'fetching' })
      .eq('id', syncLogId)
  })

  try {
    const result = await runSync(mode, {
      username,
      userId,
      db,
      step,
      stepLogger: makeSupabaseStepLogger(db, syncLogId),
      onProgress: async (p: SyncProgress) => {
        await db
          .from('sync_log')
          .update({
            stage: p.stage,
            games_total: p.gamesTotal,
            games_processed: p.gamesProcessed,
            cards_created: p.cardsCreated,
          })
          .eq('id', syncLogId)
      },
    })

    await step.run('mark-complete', async () => {
      await db
        .from('sync_log')
        .update({
          stage: 'complete',
          completed_at: new Date().toISOString(),
          games_processed: result.gamesProcessed,
          cards_created: result.cardsCreated,
          error: result.errors.length > 0 ? result.errors.join('; ') : null,
        })
        .eq('id', syncLogId)
    })

    return result
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await markSyncFailed(db, syncLogId, message)
    throw err
  }
}

/**
 * Inngest function that runs the full sync pipeline in the background and
 * writes live progress to the target `sync_log` row as it goes.
 *
 * Event payload: { syncLogId, userId, username, mode }
 */
export const syncGamesFunction = inngest.createFunction(
  {
    id: 'sync-games',
    name: 'Sync Chess.com games',
    triggers: [{ event: 'sync/run' }],
    // Runs after all retries are exhausted. Without this, a function that
    // times out or crashes mid-run leaves sync_log.stage stuck on whatever
    // the last onProgress write was (usually 'analyzing'), and the client
    // polls forever because it's waiting for a terminal stage.
    onFailure: async ({ event, error }) => {
      const { syncLogId } = (event.data.event?.data ?? {}) as { syncLogId?: string }
      if (!syncLogId) return
      const db = createServiceClient()
      const message = error instanceof Error ? error.message : String(error)
      await markSyncFailed(db, syncLogId, message)
    },
  },
  syncGamesHandler as unknown as Parameters<typeof inngest.createFunction>[1],
)
