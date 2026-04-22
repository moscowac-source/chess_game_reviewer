import type { SupabaseClient } from '@supabase/supabase-js'
import { inngest } from './client'
import { runSync, type SyncProgress, type StepRunner } from '@/lib/sync-orchestrator'
import { createServiceClient } from '@/lib/supabase-service'
import { makeSupabaseStepLogger } from '@/lib/sync-step-logger'
import type { UciEngine } from '@/lib/stockfish-analyzer'
import { markSyncFailed } from './terminal-state'

export interface SyncGamesDeps {
  /**
   * Factory that returns the Stockfish engine to use for analysis. When the
   * sync runs on the persistent worker this points at a single warm engine
   * that was initialised at boot; on Vercel it stays undefined and
   * `analyzeGame` falls back to the default per-game factory.
   */
  engineFactory?: () => UciEngine | Promise<UciEngine>
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
 * Builds the handler body for the Inngest sync-games function. Injecting
 * `engineFactory` at build time is what lets the persistent worker share a
 * single warm Stockfish engine across every job instead of paying the 40MB
 * NNUE cold-load on every invocation (issue #67 / plan F #74).
 */
export function makeSyncGamesHandler(deps: SyncGamesDeps = {}) {
  return async function syncGamesHandler({ event, step }: SyncGamesHandlerArgs) {
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
        engineFactory: deps.engineFactory,
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
}

/** Default handler with no injected deps — used by Vercel /api/inngest. */
export const syncGamesHandler = makeSyncGamesHandler()

/**
 * Builds the Inngest sync-games function. Worker code calls this with a
 * warmed-engine factory; Vercel uses the default export below, which has
 * no injected deps.
 *
 * Event payload: { syncLogId, userId, username, mode }
 */
export function createSyncGamesFunction(deps: SyncGamesDeps = {}) {
  return inngest.createFunction(
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
    makeSyncGamesHandler(deps) as unknown as Parameters<typeof inngest.createFunction>[1],
  )
}

export const syncGamesFunction = createSyncGamesFunction()
