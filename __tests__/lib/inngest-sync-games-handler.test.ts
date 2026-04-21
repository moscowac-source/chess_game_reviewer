/**
 * @jest-environment node
 */

interface ChainableDb {
  from: jest.Mock
  update: jest.Mock
  eq: jest.Mock
}
function makeChainableDb(): ChainableDb {
  const chain = {} as ChainableDb
  chain.from = jest.fn(() => chain)
  chain.update = jest.fn(() => chain)
  chain.eq = jest.fn(async () => ({ data: null, error: null }))
  return chain
}

const fakeDb = makeChainableDb()

jest.mock('@/lib/supabase-service', () => ({
  createServiceClient: jest.fn(() => fakeDb),
}))

jest.mock('@/lib/sync-orchestrator', () => ({
  runSync: jest.fn(),
}))

jest.mock('@/lib/sync-step-logger', () => ({
  makeSupabaseStepLogger: jest.fn(() => 'STEP_LOGGER'),
}))

jest.mock('@/lib/inngest/terminal-state', () => ({
  markSyncFailed: jest.fn(),
}))

import { syncGamesHandler } from '@/lib/inngest/functions'
import { runSync } from '@/lib/sync-orchestrator'

const mockedRunSync = runSync as jest.MockedFunction<typeof runSync>

describe('syncGamesHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedRunSync.mockResolvedValue({ gamesProcessed: 3, cardsCreated: 5, errors: [] })
  })

  it('forwards the Inngest step object into runSync so per-game work is memoized across retries', async () => {
    const step = {
      run: jest.fn(async (_id: string, fn: () => unknown) => await fn()),
    }

    await syncGamesHandler({
      event: {
        data: {
          syncLogId: 'log-1',
          userId: 'user-1',
          username: 'alice',
          mode: 'incremental',
        },
      },
      step,
    } as unknown as Parameters<typeof syncGamesHandler>[0])

    expect(mockedRunSync).toHaveBeenCalledTimes(1)
    const [, opts] = mockedRunSync.mock.calls[0]
    expect(opts.step).toBe(step)
    expect(opts.username).toBe('alice')
    expect(opts.userId).toBe('user-1')
  })
})
