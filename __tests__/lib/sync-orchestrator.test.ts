/**
 * @jest-environment node
 */

import { runSync, type SyncLogger } from '@/lib/sync-orchestrator'
import { makeMockDb } from '@/__tests__/helpers/mock-db'

jest.mock('@/lib/stockfish-analyzer', () => ({
  analyzeGame: jest.fn(),
}))
jest.mock('@/lib/card-generator', () => ({
  generateCards: jest.fn(),
}))
jest.mock('@/lib/game-parser', () => ({
  parseGame: jest.fn(),
  parsePgnHeaders: jest.fn(),
}))

import { analyzeGame } from '@/lib/stockfish-analyzer'
import { generateCards } from '@/lib/card-generator'
import { parseGame, parsePgnHeaders } from '@/lib/game-parser'

const mockedAnalyze = analyzeGame as jest.MockedFunction<typeof analyzeGame>
const mockedGenerate = generateCards as jest.MockedFunction<typeof generateCards>
const mockedParse = parseGame as jest.MockedFunction<typeof parseGame>
const mockedHeaders = parsePgnHeaders as jest.MockedFunction<typeof parsePgnHeaders>

const USER_ID = '00000000-0000-0000-0000-000000000001'

const EMPTY_HEADERS = {
  white: 'a',
  black: 'b',
  result: '1-0',
  url: 'https://chess.com/game/1',
  eco: 'B20',
  playedAt: '2026-04-20T12:00:00Z',
}

function makeLoggerSpy(): { logger: SyncLogger; calls: { started: number; completed: Array<{ id: string; result: unknown }> } } {
  const calls = { started: 0, completed: [] as Array<{ id: string; result: unknown }> }
  const logger: SyncLogger = {
    async logStart() {
      calls.started++
      return 'log-id-1'
    },
    async logComplete(id, result) {
      calls.completed.push({ id, result })
    },
  }
  return { logger, calls }
}

beforeEach(() => {
  jest.clearAllMocks()
  // Sensible defaults — tests override as needed
  mockedHeaders.mockReturnValue({ ...EMPTY_HEADERS })
  mockedParse.mockReturnValue([])
  mockedAnalyze.mockResolvedValue([])
  mockedGenerate.mockResolvedValue({ created: 0, skipped: 0 })
})

describe('runSync', () => {
  it('returns zero counts and logs start+complete when no games come back', async () => {
    const { db } = makeMockDb()
    const { logger, calls } = makeLoggerSpy()

    const result = await runSync('incremental', {
      username: 'player',
      userId: USER_ID,
      db,
      gamesFetcher: async () => [],
      syncLogger: logger,
    })

    expect(result).toEqual({ gamesProcessed: 0, cardsCreated: 0, errors: [] })
    expect(calls.started).toBe(1)
    expect(calls.completed).toEqual([
      { id: 'log-id-1', result: { gamesProcessed: 0, cardsCreated: 0, errors: [] } },
    ])
  })

  it('processes a single new game: inserts games row, calls generateCards with new id, and counts the results', async () => {
    const { db, inserted } = makeMockDb()
    const { logger, calls } = makeLoggerSpy()

    mockedParse.mockReturnValue([{ fen: 'FEN', movePlayed: 'e4' }])
    mockedAnalyze.mockResolvedValue([
      { fen: 'FEN', movePlayed: 'e4', cpl: 300, bestMove: 'e5', bestLine: ['e5'], classification: 'blunder' },
    ])
    mockedGenerate.mockResolvedValue({ created: 1, skipped: 0 })

    const result = await runSync('historical', {
      username: 'player',
      userId: USER_ID,
      db,
      gamesFetcher: async () => ['<pgn>'],
      syncLogger: logger,
    })

    expect(result).toEqual({ gamesProcessed: 1, cardsCreated: 1, errors: [] })
    expect(inserted.games).toHaveLength(1)
    expect(inserted.games[0]).toMatchObject({
      user_id: USER_ID,
      pgn: '<pgn>',
      url: EMPTY_HEADERS.url,
      white: EMPTY_HEADERS.white,
    })
    const insertedGameId = inserted.games[0].id as string
    expect(mockedGenerate).toHaveBeenCalledWith(expect.any(Array), db, insertedGameId)
    expect(calls.completed[0].result).toEqual({ gamesProcessed: 1, cardsCreated: 1, errors: [] })
  })

  it('short-circuits when a games row with the same url already exists: reuses the existing id and does not insert', async () => {
    const existingGameId = 'existing-game-123'
    const { db, inserted } = makeMockDb({
      games: [{ id: existingGameId, user_id: USER_ID, url: EMPTY_HEADERS.url }],
    })
    const { logger } = makeLoggerSpy()

    mockedGenerate.mockResolvedValue({ created: 0, skipped: 3 })

    const result = await runSync('incremental', {
      username: 'player',
      userId: USER_ID,
      db,
      gamesFetcher: async () => ['<pgn>'],
      syncLogger: logger,
    })

    expect(result.gamesProcessed).toBe(1)
    expect(inserted.games ?? []).toHaveLength(0)
    expect(mockedGenerate).toHaveBeenCalledWith(expect.any(Array), db, existingGameId)
  })

  it('tolerates a single failing game: counts only successful games and captures the error message', async () => {
    const { db } = makeMockDb()
    const { logger, calls } = makeLoggerSpy()

    let parseCall = 0
    mockedParse.mockImplementation(() => {
      parseCall++
      if (parseCall === 1) throw new Error('bad pgn')
      return [{ fen: 'FEN2', movePlayed: 'd4' }]
    })
    mockedGenerate.mockResolvedValue({ created: 2, skipped: 0 })

    const result = await runSync('historical', {
      username: 'player',
      userId: USER_ID,
      db,
      gamesFetcher: async () => ['<pgn-1>', '<pgn-2>'],
      syncLogger: logger,
    })

    expect(result.gamesProcessed).toBe(1)
    expect(result.cardsCreated).toBe(2)
    expect(result.errors).toEqual(['bad pgn'])
    expect(calls.completed[0].result).toEqual({
      gamesProcessed: 1,
      cardsCreated: 2,
      errors: ['bad pgn'],
    })
  })

  it('writes sync_log start + complete on success through the supplied logger', async () => {
    const { db } = makeMockDb()
    const { logger, calls } = makeLoggerSpy()

    mockedGenerate.mockResolvedValue({ created: 5, skipped: 1 })

    await runSync('incremental', {
      username: 'player',
      userId: USER_ID,
      db,
      gamesFetcher: async () => ['<pgn>'],
      syncLogger: logger,
    })

    expect(calls.started).toBe(1)
    expect(calls.completed).toHaveLength(1)
    expect(calls.completed[0].id).toBe('log-id-1')
    expect(calls.completed[0].result).toEqual({ gamesProcessed: 1, cardsCreated: 5, errors: [] })
  })

  it('when the fetcher itself throws, propagates and leaves the sync_log row without a completion', async () => {
    const { db } = makeMockDb()
    const { logger, calls } = makeLoggerSpy()

    const boom = new Error('chess.com unreachable')

    await expect(
      runSync('incremental', {
        username: 'player',
        userId: USER_ID,
        db,
        gamesFetcher: async () => {
          throw boom
        },
        syncLogger: logger,
      }),
    ).rejects.toBe(boom)

    expect(calls.started).toBe(1)
    expect(calls.completed).toHaveLength(0)
  })
})
