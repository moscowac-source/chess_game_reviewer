/**
 * @jest-environment node
 */

import { POST } from '@/app/api/sync/route'
import type { SyncResult } from '@/lib/sync-orchestrator'
import { makeMockDb } from '@/__tests__/helpers/mock-db'

// ---------------------------------------------------------------------------
// Shared fixture data
// ---------------------------------------------------------------------------

const FIXTURE_PGN = `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2024.01.01"]
[UTCDate "2024.01.01"]
[UTCTime "12:00:00"]
[White "player1"]
[Black "player2"]
[Result "1-0"]
[ECO "C50"]
[Link "https://www.chess.com/game/live/1"]

1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6?? 4. Qxf7# 1-0`

const MOCK_USER = { id: 'mock-user-id', chess_com_username: 'testuser' }

function makeGamesFetcher(pgns: string[]) {
  return async (_username: string, _mode: string) => pgns
}

// Build a mock DB seeded with the user row and (optionally) pre-existing
// cards by FEN and pre-existing games by URL.
function seedDb(
  existingFens: string[] = [],
  existingGamesByUrl: Record<string, string> = {},
) {
  const games = Object.entries(existingGamesByUrl).map(([url, id]) => ({
    id,
    url,
    user_id: MOCK_USER.id,
  }))
  const cards = existingFens.map((fen) => ({ fen }))
  return makeMockDb({
    users: [MOCK_USER],
    games,
    cards,
    sync_log: [],
  })
}

type MsgHandler = ((msg: string | { data: string }) => void) | null

function makeBlunderEngineFactory() {
  return () => {
    let handler: MsgHandler = null
    return {
      set onmessage(fn: MsgHandler) {
        handler = fn
      },
      postMessage(cmd: string) {
        if (cmd.startsWith('go ')) {
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

function makeNoOpEngineFactory() {
  return () => {
    let handler: MsgHandler = null
    return {
      set onmessage(fn: MsgHandler) {
        handler = fn
      },
      postMessage(cmd: string) {
        if (cmd.startsWith('go ')) {
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

const DEFAULT_AUTH = async () => MOCK_USER

// ---------------------------------------------------------------------------
describe('POST /api/sync', () => {
  it('returns gamesProcessed, cardsCreated, and errors in the response', async () => {
    const { db } = seedDb()

    const response = await POST(makeRequest('incremental'), {
      gamesFetcher: makeGamesFetcher([FIXTURE_PGN]),
      db,
      engineFactory: makeNoOpEngineFactory(),
      authFn: DEFAULT_AUTH,
    })

    const body = await response.json()

    expect(response.status).toBe(200)
    expect(typeof body.gamesProcessed).toBe('number')
    expect(typeof body.cardsCreated).toBe('number')
    expect(Array.isArray(body.errors)).toBe(true)
  })

  it('historical mode processes all games returned by the fetcher', async () => {
    const SECOND_PGN = `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2024.01.02"]
[White "player1"]
[Black "player2"]
[Result "0-1"]

1. d4 d5 2. Bf4 Nf6 3. e3 e6 4. Nf3 c5 0-1`

    const { db } = seedDb()

    const response = await POST(makeRequest('historical'), {
      gamesFetcher: makeGamesFetcher([FIXTURE_PGN, SECOND_PGN]),
      db,
      engineFactory: makeNoOpEngineFactory(),
      authFn: DEFAULT_AUTH,
    })

    const body = await response.json()

    expect(body.gamesProcessed).toBe(2)
    expect(body.errors).toHaveLength(0)
  })

  it('incremental mode passes the correct mode to the games fetcher', async () => {
    const { db } = seedDb()
    let capturedMode: string | undefined

    const trackingFetcher = async (_username: string, mode: string) => {
      capturedMode = mode
      return [FIXTURE_PGN]
    }

    await POST(makeRequest('incremental'), {
      gamesFetcher: trackingFetcher,
      db,
      engineFactory: makeNoOpEngineFactory(),
      authFn: DEFAULT_AUTH,
    })

    expect(capturedMode).toBe('incremental')
  })

  it('historical mode passes the correct mode to the games fetcher', async () => {
    const { db } = seedDb()
    let capturedMode: string | undefined

    const trackingFetcher = async (_username: string, mode: string) => {
      capturedMode = mode
      return [FIXTURE_PGN]
    }

    await POST(makeRequest('historical'), {
      gamesFetcher: trackingFetcher,
      db,
      engineFactory: makeNoOpEngineFactory(),
      authFn: DEFAULT_AUTH,
    })

    expect(capturedMode).toBe('historical')
  })

  it('records an error for a bad PGN and continues processing other games', async () => {
    const BAD_PGN = 'this is not a valid PGN @@@@'
    const { db } = seedDb()

    const response = await POST(makeRequest('incremental'), {
      gamesFetcher: makeGamesFetcher([BAD_PGN, FIXTURE_PGN]),
      db,
      engineFactory: makeNoOpEngineFactory(),
      authFn: DEFAULT_AUTH,
    })

    const body = await response.json()

    expect(body.gamesProcessed).toBe(1)
    expect(body.errors).toHaveLength(1)
    expect(typeof body.errors[0]).toBe('string')
    expect(response.status).toBe(200)
  })

  it('records an error when the analyzer throws and continues other games', async () => {
    const { db } = seedDb()
    let callCount = 0

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
      db,
      engineFactory: flakyEngineFactory,
      authFn: DEFAULT_AUTH,
    })

    const body = await response.json()

    expect(body.errors).toHaveLength(1)
    expect(body.errors[0]).toContain('Stockfish exploded')
    expect(body.gamesProcessed).toBe(1)
  })
})

// ---------------------------------------------------------------------------
describe('POST /api/sync — integration', () => {
  it('writes card rows to the database after processing a game', async () => {
    const { db, inserted } = seedDb()

    const response = await POST(makeRequest('incremental'), {
      gamesFetcher: makeGamesFetcher([FIXTURE_PGN]),
      db,
      engineFactory: makeBlunderEngineFactory(),
      authFn: DEFAULT_AUTH,
    })

    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.errors).toHaveLength(0)
    expect(body.gamesProcessed).toBe(1)

    const cardInserts = inserted.cards ?? []
    expect(cardInserts.length).toBeGreaterThan(0)
    expect(body.cardsCreated).toBe(cardInserts.length)

    for (const row of cardInserts) {
      expect(typeof row.fen).toBe('string')
      expect(typeof row.correct_move).toBe('string')
      expect(['blunder', 'mistake', 'great', 'brilliant']).toContain(row.classification)
    }
  })

  it('inserts a games row per PGN with parsed Chess.com headers', async () => {
    const { db, inserted } = seedDb()

    await POST(makeRequest('incremental'), {
      gamesFetcher: makeGamesFetcher([FIXTURE_PGN]),
      db,
      engineFactory: makeBlunderEngineFactory(),
      authFn: DEFAULT_AUTH,
    })

    const insertedGames = inserted.games ?? []
    expect(insertedGames).toHaveLength(1)
    expect(insertedGames[0]).toMatchObject({
      user_id: MOCK_USER.id,
      source: 'chess.com',
      white: 'player1',
      black: 'player2',
      result: '1-0',
      url: 'https://www.chess.com/game/live/1',
      eco: 'C50',
    })
  })

  it('links each newly generated card to the games row via game_id', async () => {
    const { db, inserted } = seedDb()

    await POST(makeRequest('incremental'), {
      gamesFetcher: makeGamesFetcher([FIXTURE_PGN]),
      db,
      engineFactory: makeBlunderEngineFactory(),
      authFn: DEFAULT_AUTH,
    })

    const insertedGames = inserted.games ?? []
    const cardInserts = inserted.cards ?? []
    expect(insertedGames).toHaveLength(1)
    const gameId = insertedGames[0].id
    expect(cardInserts.length).toBeGreaterThan(0)
    for (const row of cardInserts) {
      expect(row).toMatchObject({ game_id: gameId })
    }
  })

  it('does not insert a duplicate games row when the same url is synced again', async () => {
    const { db, inserted } = seedDb([], {
      'https://www.chess.com/game/live/1': 'pre-existing-game-id',
    })

    await POST(makeRequest('incremental'), {
      gamesFetcher: makeGamesFetcher([FIXTURE_PGN]),
      db,
      engineFactory: makeBlunderEngineFactory(),
      authFn: DEFAULT_AUTH,
    })

    expect(inserted.games ?? []).toHaveLength(0)
  })

  it('reuses the existing games row id when syncing the same url again', async () => {
    const { db, inserted } = seedDb([], {
      'https://www.chess.com/game/live/1': 'pre-existing-game-id',
    })

    await POST(makeRequest('incremental'), {
      gamesFetcher: makeGamesFetcher([FIXTURE_PGN]),
      db,
      engineFactory: makeBlunderEngineFactory(),
      authFn: DEFAULT_AUTH,
    })

    const cardInserts = inserted.cards ?? []
    expect(cardInserts.length).toBeGreaterThan(0)
    for (const row of cardInserts) {
      expect(row).toMatchObject({ game_id: 'pre-existing-game-id' })
    }
  })

  it('does not create duplicate cards for the same FEN across two syncs', async () => {
    const first = seedDb()
    await POST(makeRequest('incremental'), {
      gamesFetcher: makeGamesFetcher([FIXTURE_PGN]),
      db: first.db,
      engineFactory: makeBlunderEngineFactory(),
      authFn: DEFAULT_AUTH,
    })

    const existingFens = (first.inserted.cards ?? []).map((r) => r.fen as string)
    const second = seedDb(existingFens)
    const response2 = await POST(makeRequest('incremental'), {
      gamesFetcher: makeGamesFetcher([FIXTURE_PGN]),
      db: second.db,
      engineFactory: makeBlunderEngineFactory(),
      authFn: DEFAULT_AUTH,
    })

    const body2 = await response2.json()

    expect(second.inserted.cards ?? []).toHaveLength(0)
    expect(body2.cardsCreated).toBe(0)
  })
})

// ---------------------------------------------------------------------------
describe('POST /api/sync — auth', () => {
  it('returns 401 when no authenticated user', async () => {
    const { db } = seedDb()

    const response = await POST(makeRequest('incremental'), {
      db,
      authFn: async () => null,
    })

    expect(response.status).toBe(401)
  })

  it('returns 200 when authenticated user is provided', async () => {
    const { db } = seedDb()

    const response = await POST(makeRequest('incremental'), {
      db,
      authFn: async () => ({ id: 'user-123', chess_com_username: 'testuser' }),
      gamesFetcher: makeGamesFetcher([FIXTURE_PGN]),
      engineFactory: makeNoOpEngineFactory(),
    })

    expect(response.status).toBe(200)
  })

  it("passes the authenticated user's chess_com_username to the games fetcher", async () => {
    const { db } = seedDb()
    let capturedUsername: string | undefined

    const trackingFetcher = async (username: string, _mode: string) => {
      capturedUsername = username
      return [FIXTURE_PGN]
    }

    await POST(makeRequest('incremental'), {
      db,
      authFn: async () => ({ id: 'user-123', chess_com_username: 'MyChessUsername' }),
      gamesFetcher: trackingFetcher,
      engineFactory: makeNoOpEngineFactory(),
    })

    expect(capturedUsername).toBe('MyChessUsername')
  })
})

// ---------------------------------------------------------------------------
describe('POST /api/sync — sync logging', () => {
  it('calls logStart with the mode and logComplete with the result', async () => {
    const { db } = seedDb()
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
      db,
      engineFactory: makeNoOpEngineFactory(),
      syncLogger,
      authFn: DEFAULT_AUTH,
    })

    expect(startedMode).toBe('incremental')
    expect(completedResult).toBeDefined()
    expect(typeof completedResult!.gamesProcessed).toBe('number')
    expect(typeof completedResult!.cardsCreated).toBe('number')
  })

  it('passes error details to logComplete when a game fails during sync', async () => {
    const { db } = seedDb()
    let completedResult: SyncResult | undefined

    const syncLogger = {
      logStart: async (_mode: string) => 'log-id-2',
      logComplete: async (_id: string, result: SyncResult) => {
        completedResult = result
      },
    }

    await POST(makeRequest('incremental'), {
      gamesFetcher: makeGamesFetcher(['not a valid pgn @@@@', FIXTURE_PGN]),
      db,
      engineFactory: makeNoOpEngineFactory(),
      syncLogger,
      authFn: DEFAULT_AUTH,
    })

    expect(completedResult).toBeDefined()
    expect(Array.isArray(completedResult!.errors)).toBe(true)
    expect((completedResult!.errors as string[]).length).toBeGreaterThan(0)
    expect(completedResult!.gamesProcessed).toBe(1)
  })
})
