import type { SupabaseClient } from '@supabase/supabase-js'
import { inngest } from './client'
import { runSync, type SyncProgress } from '@/lib/sync-orchestrator'
import { createServiceClient } from '@/lib/supabase-service'

export interface SyncGamesDeps {
  db?: SupabaseClient
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
  },
  async ({ event, step }) => {
    const { syncLogId, userId, username, mode } = event.data as {
      syncLogId: string
      userId: string
      username: string
      mode: 'historical' | 'incremental'
    }

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
      await db
        .from('sync_log')
        .update({
          stage: 'error',
          completed_at: new Date().toISOString(),
          error: message,
        })
        .eq('id', syncLogId)
      throw err
    }
  },
)
