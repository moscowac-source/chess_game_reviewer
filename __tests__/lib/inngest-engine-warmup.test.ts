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

import { makeSyncGamesHandler } from '@/lib/inngest/functions'
import { runSync } from '@/lib/sync-orchestrator'

const mockedRunSync = runSync as jest.MockedFunction<typeof runSync>

describe('makeSyncGamesHandler — engine warm-up', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedRunSync.mockResolvedValue({ gamesProcessed: 1, cardsCreated: 0, errors: [] })
  })

  it('forwards an injected engineFactory into runSync so the worker can share one warm engine across jobs', async () => {
    const warmEngine = { postMessage: jest.fn(), onmessage: null }
    const engineFactory = jest.fn(() => warmEngine)

    const handler = makeSyncGamesHandler({ engineFactory })

    const step = {
      run: jest.fn(async (_id: string, fn: () => unknown) => await fn()),
    }

    await handler({
      event: {
        data: {
          syncLogId: 'log-1',
          userId: 'user-1',
          username: 'alice',
          mode: 'incremental',
        },
      },
      step,
    } as unknown as Parameters<typeof handler>[0])

    const [, opts] = mockedRunSync.mock.calls[0]
    expect(opts.engineFactory).toBe(engineFactory)
  })

  it('default handler (no deps) passes engineFactory=undefined so runSync falls back to per-game default engine creation', async () => {
    const handler = makeSyncGamesHandler({})

    const step = {
      run: jest.fn(async (_id: string, fn: () => unknown) => await fn()),
    }

    await handler({
      event: {
        data: {
          syncLogId: 'log-1',
          userId: 'user-1',
          username: 'alice',
          mode: 'incremental',
        },
      },
      step,
    } as unknown as Parameters<typeof handler>[0])

    const [, opts] = mockedRunSync.mock.calls[0]
    expect(opts.engineFactory).toBeUndefined()
  })
})
