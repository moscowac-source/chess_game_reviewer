/**
 * @jest-environment node
 */

import { syncRunStatusLabel } from '@/lib/sync-run-status'
import type { SyncLog } from '@/types/database'

function log(partial: Partial<SyncLog>): SyncLog {
  return {
    id: 's',
    user_id: 'u',
    mode: 'incremental',
    started_at: '2024-01-01T00:00:00Z',
    completed_at: null,
    games_processed: 0,
    cards_created: 0,
    error: null,
    stage: null,
    games_total: 0,
    ...partial,
  }
}

describe('syncRunStatusLabel', () => {
  it('returns success when stage=complete and no error', () => {
    expect(syncRunStatusLabel(log({ stage: 'complete' }))).toEqual({
      label: 'All stages green',
      tone: 'success',
    })
  })

  it('returns error when the server recorded an error message', () => {
    expect(syncRunStatusLabel(log({ stage: 'error', error: 'Chess.com 404' }))).toEqual({
      label: 'Chess.com 404',
      tone: 'error',
    })
  })

  it('returns error with a fallback label when stage=error but no message', () => {
    expect(syncRunStatusLabel(log({ stage: 'error' }))).toEqual({
      label: 'Sync failed',
      tone: 'error',
    })
  })

  it('returns warn when stage is not terminal (run never finished)', () => {
    expect(syncRunStatusLabel(log({ stage: 'analyzing' }))).toEqual({
      label: 'Run did not finish',
      tone: 'warn',
    })
  })

  it('returns warn when stage is missing entirely (legacy rows)', () => {
    expect(syncRunStatusLabel(log({ stage: null }))).toEqual({
      label: 'Run did not finish',
      tone: 'warn',
    })
  })

  it('prefers the explicit error message even if stage claims complete', () => {
    // Guards against weird race where completed_at was written with a
    // partial-failure error attached.
    expect(syncRunStatusLabel(log({ stage: 'complete', error: 'Partial failure' }))).toEqual({
      label: 'Partial failure',
      tone: 'error',
    })
  })
})
