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
})
