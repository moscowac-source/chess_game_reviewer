/**
 * @jest-environment node
 */

import { syncRunStatusLabel, RUNNING_GRACE_MS } from '@/lib/sync-run-status'
import type { SyncLog } from '@/types/database'

const START = '2024-01-01T00:00:00Z'
const START_MS = new Date(START).getTime()
const FRESH = START_MS + 60_000 // 1 minute after start
const STALE = START_MS + RUNNING_GRACE_MS + 60_000 // past the threshold

function log(partial: Partial<SyncLog>): SyncLog {
  return {
    id: 's',
    user_id: 'u',
    mode: 'incremental',
    started_at: START,
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
    expect(syncRunStatusLabel(log({ stage: 'complete' }), FRESH)).toEqual({
      label: 'All stages green',
      tone: 'success',
    })
  })

  it('returns success when stage=complete even if completed_at never got set', () => {
    // Observed during Plan F smoke test: worker finished, but the row's
    // completed_at column stayed null. Stage is the source of truth.
    expect(syncRunStatusLabel(log({ stage: 'complete', completed_at: null }), STALE)).toEqual({
      label: 'All stages green',
      tone: 'success',
    })
  })

  it('returns error when the server recorded an error message', () => {
    expect(syncRunStatusLabel(log({ stage: 'error', error: 'Chess.com 404' }), FRESH)).toEqual({
      label: 'Chess.com 404',
      tone: 'error',
    })
  })

  it('returns error with a fallback label when stage=error but no message', () => {
    expect(syncRunStatusLabel(log({ stage: 'error' }), FRESH)).toEqual({
      label: 'Sync failed',
      tone: 'error',
    })
  })

  it('returns info (still running) when a non-terminal run is within the grace window', () => {
    expect(syncRunStatusLabel(log({ stage: 'analyzing' }), FRESH)).toEqual({
      label: 'Still running…',
      tone: 'info',
    })
  })

  it('returns info for queued runs during the grace window', () => {
    expect(syncRunStatusLabel(log({ stage: 'queued' }), FRESH)).toEqual({
      label: 'Still running…',
      tone: 'info',
    })
  })

  it('returns info for legacy rows with no stage during the grace window', () => {
    expect(syncRunStatusLabel(log({ stage: null }), FRESH)).toEqual({
      label: 'Still running…',
      tone: 'info',
    })
  })

  it('returns warn (stuck) once a non-terminal run has aged past the grace window', () => {
    expect(syncRunStatusLabel(log({ stage: 'analyzing' }), STALE)).toEqual({
      label: 'Run did not finish',
      tone: 'warn',
    })
  })

  it('returns warn for legacy rows with no stage once aged past the grace window', () => {
    expect(syncRunStatusLabel(log({ stage: null }), STALE)).toEqual({
      label: 'Run did not finish',
      tone: 'warn',
    })
  })

  it('prefers the explicit error message even if stage claims complete', () => {
    // Guards against weird race where completed_at was written with a
    // partial-failure error attached.
    expect(syncRunStatusLabel(log({ stage: 'complete', error: 'Partial failure' }), FRESH)).toEqual({
      label: 'Partial failure',
      tone: 'error',
    })
  })
})
