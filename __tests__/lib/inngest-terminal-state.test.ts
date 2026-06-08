/**
 * @jest-environment node
 */

import { markSyncFailed } from '@/lib/inngest/terminal-state'
import { makeMockDb } from '@/__tests__/helpers/mock-db'

const SYNC_ID = 'sync-xyz'

describe('markSyncFailed', () => {
  it('sets stage=error, completed_at, and error message on the sync_log row', async () => {
    const { db, updated } = makeMockDb({
      sync_log: [{ id: SYNC_ID, stage: 'analyzing', completed_at: null, error: null }],
    })

    await markSyncFailed(db, SYNC_ID, 'Sync timed out after retries')

    const log = updated.sync_log?.[0]
    expect(log).toBeDefined()
    expect(log!.values.stage).toBe('error')
    expect(log!.values.error).toBe('Sync timed out after retries')
    expect(typeof log!.values.completed_at).toBe('string')
    expect(log!.filters).toEqual([{ op: 'eq', col: 'id', val: SYNC_ID }])
  })

  it('truncates long error messages to keep the DB row small', async () => {
    const { db, updated } = makeMockDb({
      sync_log: [{ id: SYNC_ID, stage: 'analyzing' }],
    })

    const longMsg = 'x'.repeat(5000)
    await markSyncFailed(db, SYNC_ID, longMsg)

    const stored = updated.sync_log![0].values.error as string
    expect(stored.length).toBeLessThanOrEqual(2000)
  })

  // #70: a failed run should close its audit timeline with a terminal step row,
  // mirroring the `sync-end` row a successful run emits.
  it('writes a terminal sync-failed step row to the audit timeline', async () => {
    const { db, inserted } = makeMockDb({
      sync_log: [{ id: SYNC_ID, stage: 'analyzing' }],
      sync_step_log: [],
    })

    await markSyncFailed(db, SYNC_ID, 'Sync timed out after retries')

    const steps = inserted.sync_step_log ?? []
    expect(steps).toHaveLength(1)
    expect(steps[0]).toMatchObject({
      sync_log_id: SYNC_ID,
      step: 'sync-failed',
      status: 'error',
      error: 'Sync timed out after retries',
    })
  })

  it('truncates the terminal step row error to match the sync_log row', async () => {
    const { db, inserted } = makeMockDb({
      sync_log: [{ id: SYNC_ID, stage: 'analyzing' }],
      sync_step_log: [],
    })

    await markSyncFailed(db, SYNC_ID, 'x'.repeat(5000))

    const stored = (inserted.sync_step_log ?? [])[0].error as string
    expect(stored.length).toBeLessThanOrEqual(2000)
  })

  it('does not write a second terminal row when one already exists (idempotent across retries)', async () => {
    const { db, inserted } = makeMockDb({
      sync_log: [{ id: SYNC_ID, stage: 'error' }],
      sync_step_log: [
        { id: 'existing-1', sync_log_id: SYNC_ID, step: 'sync-failed', status: 'error' },
      ],
    })

    await markSyncFailed(db, SYNC_ID, 'Sync timed out after retries')

    expect(inserted.sync_step_log ?? []).toHaveLength(0)
  })

  it('still records the failure on sync_log even if the step-row write fails', async () => {
    const { db, updated } = makeMockDb({
      sync_log: [{ id: SYNC_ID, stage: 'analyzing' }],
      sync_step_log: [],
    })
    // Make the audit-row insert blow up; the sync_log update must still stand.
    const realFrom = db.from.bind(db)
    ;(db as unknown as { from: (t: string) => unknown }).from = (table: string) => {
      if (table === 'sync_step_log') {
        return {
          select: () => ({ eq: () => ({ eq: () => ({ limit: () => { throw new Error('audit down') } }) }) }),
        }
      }
      return realFrom(table)
    }

    await expect(markSyncFailed(db, SYNC_ID, 'boom')).resolves.toBeUndefined()
    expect(updated.sync_log![0].values.stage).toBe('error')
  })
})
