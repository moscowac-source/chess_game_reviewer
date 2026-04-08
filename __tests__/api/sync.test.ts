/**
 * @jest-environment node
 */

import { POST } from '@/app/api/sync/route'
import type { SyncResult } from '@/lib/sync-orchestrator'

// ---------------------------------------------------------------------------
// Shared fixture data
// ---------------------------------------------------------------------------

// A minimal but valid PGN (Scholar's mate in 4 moves)
const FIXTURE_PGN = `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2024.01.01"]
[White "player1"]
[Black "player2"]
[Result "1-0"]

1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6?? 4. Qxf7# 1-0`

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

// Fake Chess.com client that returns a fixed set of PGNs
function makeGamesFetcher(pgns: string[]) {
  return async (_username: string, _mode: string) => pgns
}

const MOCK_USER = { id: 'mock-user-id', chess_com_username: 'testuser' }

// Fake database that remembers which FENs already exist and records inserts.
// Pass `existingFens` to simulate a DB that already has those cards.
function makeMockDb(existingFens: string[] = []) {
  const insertedRows: Record<string, unknown>[] = []
  const db = {
    from: (table: string) => {
      if (table === 'sync_log') {
        return {
          insert: (_row: Record<string, unknown>) => ({
            select: (_cols: string) => ({
              single: () => Promise.resolve({ data: { id: 'mock-log-id' }, error: null }),
            }),
          }),
          update: (_updates: Record<string, unknown>) => ({
            eq: (_col: string, _val: string) => Promise.resolve({ data: null, error: null }),
          }),
        }
      }
      if (table === 'users') {
        return {
          select: (_cols: string) => ({
            limit: (_n: number) => ({
              single: () => Promise.resolve({ data: MOCK_USER, error: null }),
            }),
          }),
        }
      }
      return {
        select: (_cols: string) => ({
          in: (_col: string, vals: string[]) =>
            Promise.resolve({
              data: existingFens
                .filter((f) => vals.includes(f))
                .map((fen) => ({ fen })),
              error: null,
            }),
        }),
        insert: (rows: Record<string, unknown>[]) => {
          insertedRows.push(...rows)
          return Promise.resolve({ data: rows, error: null })
        },
      }
    },
  }
  return { db, insertedRows }
}

type MsgHandler = ((msg: string | { data: string }) => void) | null

// Fake Stockfish engine that reports a large centipawn loss for every position
// — every move looks like a blunder, so cards get created.
function makeBlunderEngineFactory() {
  return () => {
    let handler: MsgHandler = null
    return {
      set onmessage(fn: MsgHandler) {
        handler = fn
      },
      postMessage(cmd: string) {
        if (cmd.startsWith('go ')) {
          // score cp 300: both before and after will be 300, so CPL = 600 > 200
          handler?.('info depth 15 score cp 300 pv d2d4')
          handler?.('bestmove d2d4')
        } else if (cmd === 'isready') {
          handler?.('readyok')
        } else if (cmd === 'uci') {
          handler?.('uciok')
        }
      },
    }
  }
}

// Fake Stockfish engine that immediately reports no centipawn loss for every
// position — so no cards are classified, but the pipeline runs end-to-end.
function makeNoOpEngineFactory() {
  return () => {
    let handler: MsgHandler = null
    return {
      set onmessage(fn: MsgHandler) {
        handler = fn
      },
      postMessage(cmd: string) {
        if (cmd.startsWith('go ')) {
          // Return a small eval and bestmove for every position
          handler?.('info depth 15 score cp 10 pv e2e4')
          handler?.('bestmove e2e4')
        } else if (cmd === 'isready') {
          handler?.('readyok')
        } else if (cmd === 'uci') {
          handler?.('uciok')
        }
      },
    }
  }
}

function makeRequest(mode: 'historical' | 'incremental') {
  return new Request('http://localhost/api/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode }),
  })
}

// ---------------------------------------------------------------------------
// Test 1 (tracer bullet): response has the correct shape
// ---------------------------------------------------------------------------
describe('POST /api/sync', () => {
  it('returns gamesProcessed, cardsCreated, and errors in the response', async () => {
    const { db } = makeMockDb()

    const response = await POST(makeRequest('incremental'), {
      gamesFetcher: makeGamesFetcher([FIXTURE_PGN]),
      db: db as never,
      engineFactory: makeNoOpEngineFactory(),
    })

    const body = await response.json()

    expect(response.status).toBe(200)
    expect(typeof body.gamesProcessed).toBe('number')
    expect(typeof body.cardsCreated).toBe('number')
    expect(Array.isArray(body.errors)).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 2: historical mode — all games from the fetcher are processed
  // -------------------------------------------------------------------------
  it('historical mode processes all games returned by the fetcher', async () => {
    const SECOND_PGN = `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2024.01.02"]
[White "player1"]
[Black "player2"]
[Result "0-1"]

1. d4 d5 2. Bf4 Nf6 3. e3 e6 4. Nf3 c5 0-1`

    const { db } = makeMockDb()

    const response = await POST(makeRequest('historical'), {
      gamesFetcher: makeGamesFetcher([FIXTURE_PGN, SECOND_PGN]),
      db: db as never,
      engineFactory: makeNoOpEngineFactory(),
    })

    const body = await response.json()

    expect(body.gamesProcessed).toBe(2)
    expect(body.errors).toHaveLength(0)
  })

  // -------------------------------------------------------------------------
  // Test 3: incremental mode — fetcher is called with mode='incremental'
  // -------------------------------------------------------------------------
  it('incremental mode passes the correct mode to the games fetcher', async () => {
    const { db } = makeMockDb()
    let capturedMode: string | undefined

    const trackingFetcher = async (username: string, mode: string) => {
      capturedMode = mode
      return [FIXTURE_PGN]
    }

    await POST(makeRequest('incremental'), {
      gamesFetcher: trackingFetcher as never,
      db: db as never,
      engineFactory: makeNoOpEngineFactory(),
    })

    expect(capturedMode).toBe('incremental')
  })

  it('historical mode passes the correct mode to the games fetcher', async () => {
    const { db } = makeMockDb()
    let capturedMode: string | undefined

    const trackingFetcher = async (username: string, mode: string) => {
      capturedMode = mode
      return [FIXTURE_PGN]
    }

    await POST(makeRequest('historical'), {
      gamesFetcher: trackingFetcher as never,
      db: db as never,
      engineFactory: makeNoOpEngineFactory(),
    })

    expect(capturedMode).toBe('historical')
  })

  // -------------------------------------------------------------------------
  // Test 5: a broken PGN doesn't crash the sync — error is recorded, other
  // games still process
  // -------------------------------------------------------------------------
  it('records an error for a bad PGN and continues processing other games', async () => {
    const BAD_PGN = 'this is not a valid PGN @@@@'
    const { db } = makeMockDb()

    const response = await POST(makeRequest('incremental'), {
      gamesFetcher: makeGamesFetcher([BAD_PGN, FIXTURE_PGN]),
      db: db as never,
      engineFactory: makeNoOpEngineFactory(),
    })

    const body = await response.json()

    // One game errored, one succeeded
    expect(body.gamesProcessed).toBe(1)
    expect(body.errors).toHaveLength(1)
    expect(typeof body.errors[0]).toBe('string')
    expect(response.status).toBe(200)
  })

  // -------------------------------------------------------------------------
  // Test 6: analyzer failure on one game — error recorded, others unaffected
  // -------------------------------------------------------------------------
  it('records an error when the analyzer throws and continues other games', async () => {
    const { db } = makeMockDb()
    let callCount = 0

    // Engine factory that explodes on the first game, works on the second
    const flakyEngineFactory = () => {
      callCount++
      if (callCount === 1) {
        throw new Error('Stockfish exploded')
      }
      return makeNoOpEngineFactory()()
    }

    const SECOND_PGN = `[Event "Live Chess"]
[White "a"][Black "b"][Result "1-0"]
1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 1-0`

    const response = await POST(makeRequest('incremental'), {
      gamesFetcher: makeGamesFetcher([FIXTURE_PGN, SECOND_PGN]),
      db: db as never,
      engineFactory: flakyEngineFactory,
    })

    const body = await response.json()

    expect(body.errors).toHaveLength(1)
    expect(body.errors[0]).toContain('Stockfish exploded')
    expect(body.gamesProcessed).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Integration test: end-to-end pipeline with fixture data asserts card rows
// ---------------------------------------------------------------------------
describe('POST /api/sync — integration', () => {
  it('writes card rows to the database after processing a game', async () => {
    const { db, insertedRows } = makeMockDb()

    const response = await POST(makeRequest('incremental'), {
      gamesFetcher: makeGamesFetcher([FIXTURE_PGN]),
      db: db as never,
      engineFactory: makeBlunderEngineFactory(),
    })

    const body = await response.json()

    // Pipeline ran without errors
    expect(response.status).toBe(200)
    expect(body.errors).toHaveLength(0)
    expect(body.gamesProcessed).toBe(1)

    // Cards were written to the database
    expect(insertedRows.length).toBeGreaterThan(0)
    expect(body.cardsCreated).toBe(insertedRows.length)

    // Each inserted row has the required shape
    for (const row of insertedRows) {
      expect(typeof row.fen).toBe('string')
      expect(typeof row.correct_move).toBe('string')
      expect(['blunder', 'mistake', 'great', 'brilliant']).toContain(row.classification)
    }
  })

  it('does not create duplicate cards for the same FEN across two syncs', async () => {
    // First sync — starts with an empty DB
    const { db: db1, insertedRows: rows1 } = makeMockDb()
    await POST(makeRequest('incremental'), {
      gamesFetcher: makeGamesFetcher([FIXTURE_PGN]),
      db: db1 as never,
      engineFactory: makeBlunderEngineFactory(),
    })

    // Second sync — DB already contains those FENs
    const existingFens = rows1.map((r) => r.fen as string)
    const { db: db2, insertedRows: rows2 } = makeMockDb(existingFens)
    const response2 = await POST(makeRequest('incremental'), {
      gamesFetcher: makeGamesFetcher([FIXTURE_PGN]),
      db: db2 as never,
      engineFactory: makeBlunderEngineFactory(),
    })

    const body2 = await response2.json()

    // No new cards created — all FENs were already in the DB
    expect(rows2).toHaveLength(0)
    expect(body2.cardsCreated).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Phase 20: Auth — 401 for unauthenticated requests + username scoping
// ---------------------------------------------------------------------------
describe('POST /api/sync — auth', () => {
  it('returns 401 when no authenticated user', async () => {
    const { db } = makeMockDb()

    const response = await POST(makeRequest('incremental'), {
      db: db as never,
      authFn: async () => null,
    })

    expect(response.status).toBe(401)
  })

  it('returns 200 when authenticated user is provided', async () => {
    const { db } = makeMockDb()

    const response = await POST(makeRequest('incremental'), {
      db: db as never,
      authFn: async () => ({ id: 'user-123', chess_com_username: 'testuser' }),
      gamesFetcher: makeGamesFetcher([FIXTURE_PGN]),
      engineFactory: makeNoOpEngineFactory(),
    })

    expect(response.status).toBe(200)
  })

  it("passes the authenticated user's chess_com_username to the games fetcher", async () => {
    const { db } = makeMockDb()
    let capturedUsername: string | undefined

    const trackingFetcher = async (username: string, _mode: string) => {
      capturedUsername = username
      return [FIXTURE_PGN]
    }

    await POST(makeRequest('incremental'), {
      db: db as never,
      authFn: async () => ({ id: 'user-123', chess_com_username: 'MyChessUsername' }),
      gamesFetcher: trackingFetcher as never,
      engineFactory: makeNoOpEngineFactory(),
    })

    expect(capturedUsername).toBe('MyChessUsername')
  })
})

// ---------------------------------------------------------------------------
// Phase 10: Sync log writing
// ---------------------------------------------------------------------------
describe('POST /api/sync — sync logging', () => {
  // Cycle 1 (tracer bullet): logStart and logComplete are called on a successful sync
  it('calls logStart with the mode and logComplete with the result', async () => {
    const { db } = makeMockDb()
    let startedMode: string | undefined
    let completedResult: SyncResult | undefined

    const syncLogger = {
      logStart: async (mode: string) => {
        startedMode = mode
        return 'log-id-1'
      },
      logComplete: async (_id: string, result: SyncResult) => {
        completedResult = result
      },
    }

    await POST(makeRequest('incremental'), {
      gamesFetcher: makeGamesFetcher([FIXTURE_PGN]),
      db: db as never,
      engineFactory: makeNoOpEngineFactory(),
      syncLogger,
    })

    expect(startedMode).toBe('incremental')
    expect(completedResult).toBeDefined()
    expect(typeof completedResult!.gamesProcessed).toBe('number')
    expect(typeof completedResult!.cardsCreated).toBe('number')
  })

  // Cycle 2: error state is captured in logComplete when a game fails
  it('passes error details to logComplete when a game fails during sync', async () => {
    const { db } = makeMockDb()
    let completedResult: SyncResult | undefined

    const syncLogger = {
      logStart: async (_mode: string) => 'log-id-2',
      logComplete: async (_id: string, result: SyncResult) => {
        completedResult = result
      },
    }

    await POST(makeRequest('incremental'), {
      gamesFetcher: makeGamesFetcher(['not a valid pgn @@@@', FIXTURE_PGN]),
      db: db as never,
      engineFactory: makeNoOpEngineFactory(),
      syncLogger,
    })

    expect(completedResult).toBeDefined()
    expect(Array.isArray(completedResult!.errors)).toBe(true)
    expect((completedResult!.errors as string[]).length).toBeGreaterThan(0)
    expect(completedResult!.gamesProcessed).toBe(1)
  })
})
