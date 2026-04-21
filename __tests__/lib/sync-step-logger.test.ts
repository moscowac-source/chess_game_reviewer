/**
 * @jest-environment node
 */

import { makeSupabaseStepLogger } from '@/lib/sync-step-logger'
import { makeMockDb } from '@/__tests__/helpers/mock-db'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('makeSupabaseStepLogger', () => {
  it('writes one sync_step_log row per event with the supplied sync_log_id', async () => {
    const { db, inserted } = makeMockDb()
    const log = makeSupabaseStepLogger(db, 'sync-log-42')

    await log({
      step: 'parse-headers',
      status: 'ok',
      gameUrl: 'https://chess.com/game/7',
      gameIndex: 3,
      durationMs: 12,
    })

    expect(inserted.sync_step_log).toHaveLength(1)
    expect(inserted.sync_step_log[0]).toMatchObject({
      sync_log_id: 'sync-log-42',
      step: 'parse-headers',
      status: 'ok',
      game_url: 'https://chess.com/game/7',
      game_index: 3,
      duration_ms: 12,
      error: null,
      error_code: null,
      details: null,
    })
  })

  it('captures error fields (message, code, JSONB details) on error rows', async () => {
    const { db, inserted } = makeMockDb()
    const log = makeSupabaseStepLogger(db, 'sync-log-1')

    await log({
      step: 'ensure-game-row',
      status: 'error',
      gameIndex: 4,
      durationMs: 55,
      error: 'duplicate key value violates unique constraint',
      errorCode: '23505',
      details: { details: 'Key (url)=(abc) already exists.', hint: 'retry' },
    })

    expect(inserted.sync_step_log[0]).toMatchObject({
      step: 'ensure-game-row',
      status: 'error',
      error: 'duplicate key value violates unique constraint',
      error_code: '23505',
      details: { details: 'Key (url)=(abc) already exists.', hint: 'retry' },
      duration_ms: 55,
    })
  })

  it('throws loudly when the insert fails so observability gaps do not go silent', async () => {
    // Supabase-style error shape: `.insert().then` resolves with { error }.
    const fakeDb = {
      from: () => ({
        insert: () => Promise.resolve({ data: null, error: { message: 'permission denied' } }),
      }),
    } as unknown as SupabaseClient
    const log = makeSupabaseStepLogger(fakeDb, 'sync-log-x')

    await expect(log({ step: 'analyze', status: 'ok' })).rejects.toThrow(
      /sync_step_log insert failed: permission denied/,
    )
  })
})
