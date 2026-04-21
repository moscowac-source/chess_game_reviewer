import { fetchGames } from '../../../lib/chess-com/client'

const ARCHIVE_LIST_URL = 'https://api.chess.com/pub/player/testuser/games/archives'
const ARCHIVE_JAN = 'https://api.chess.com/pub/player/testuser/games/2024/01'
const ARCHIVE_FEB = 'https://api.chess.com/pub/player/testuser/games/2024/02'
const ARCHIVE_MAR = 'https://api.chess.com/pub/player/testuser/games/2024/03'

const PGN_JAN = '[Event "Live Chess"]\n1. e4 e5 *'
const PGN_FEB = '[Event "Live Chess"]\n1. d4 d5 *'
const PGN_MAR = '[Event "Live Chess"]\n1. c4 c5 *'

function makeFetchMock(responses: Record<string, { status: number; body: unknown }>) {
  // fetchGames now passes a second arg (`{ headers: { User-Agent } }`) to every
  // fetch call. Ignore it here and match by URL alone.
  return jest.fn().mockImplementation((url: string) => {
    const entry = responses[url]
    if (!entry) throw new Error(`Unexpected fetch call: ${url}`)
    return Promise.resolve({
      ok: entry.status >= 200 && entry.status < 300,
      status: entry.status,
      json: async () => entry.body,
    })
  })
}

afterEach(() => {
  jest.restoreAllMocks()
})

describe('fetchGames — incremental mode', () => {
  it('fetches only the most recent archive and returns its PGNs', async () => {
    global.fetch = makeFetchMock({
      [ARCHIVE_LIST_URL]: {
        status: 200,
        body: { archives: [ARCHIVE_JAN, ARCHIVE_FEB, ARCHIVE_MAR] },
      },
      [ARCHIVE_MAR]: {
        status: 200,
        body: { games: [{ pgn: PGN_MAR }] },
      },
    })

    const result = await fetchGames('testuser', 'incremental')

    expect(result).toEqual([PGN_MAR])
    expect(global.fetch).toHaveBeenCalledTimes(2)
    expect(global.fetch).toHaveBeenCalledWith(ARCHIVE_LIST_URL, expect.anything())
    expect(global.fetch).toHaveBeenCalledWith(ARCHIVE_MAR, expect.anything())
  })

  it('returns empty array when archive list is empty', async () => {
    global.fetch = makeFetchMock({
      [ARCHIVE_LIST_URL]: {
        status: 200,
        body: { archives: [] },
      },
    })

    const result = await fetchGames('testuser', 'incremental')

    expect(result).toEqual([])
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })
})

describe('fetchGames — historical mode', () => {
  it('fetches all archives and returns combined PGN array', async () => {
    global.fetch = makeFetchMock({
      [ARCHIVE_LIST_URL]: {
        status: 200,
        body: { archives: [ARCHIVE_JAN, ARCHIVE_FEB, ARCHIVE_MAR] },
      },
      [ARCHIVE_JAN]: { status: 200, body: { games: [{ pgn: PGN_JAN }] } },
      [ARCHIVE_FEB]: { status: 200, body: { games: [{ pgn: PGN_FEB }] } },
      [ARCHIVE_MAR]: { status: 200, body: { games: [{ pgn: PGN_MAR }] } },
    })

    const result = await fetchGames('testuser', 'historical')

    expect(result).toEqual([PGN_JAN, PGN_FEB, PGN_MAR])
    expect(global.fetch).toHaveBeenCalledTimes(4)
  })

  it('returns empty array when archive list is empty', async () => {
    global.fetch = makeFetchMock({
      [ARCHIVE_LIST_URL]: {
        status: 200,
        body: { archives: [] },
      },
    })

    const result = await fetchGames('testuser', 'historical')

    expect(result).toEqual([])
  })

  it('applies delayMs between each archive fetch', async () => {
    jest.useFakeTimers()

    global.fetch = makeFetchMock({
      [ARCHIVE_LIST_URL]: {
        status: 200,
        body: { archives: [ARCHIVE_JAN, ARCHIVE_FEB] },
      },
      [ARCHIVE_JAN]: { status: 200, body: { games: [{ pgn: PGN_JAN }] } },
      [ARCHIVE_FEB]: { status: 200, body: { games: [{ pgn: PGN_FEB }] } },
    })

    const promise = fetchGames('testuser', 'historical', { delayMs: 300 })

    // Advance through both delays (300ms each), flushing promises between ticks
    await jest.advanceTimersByTimeAsync(600)
    const result = await promise

    expect(result).toEqual([PGN_JAN, PGN_FEB])
    expect(global.fetch).toHaveBeenCalledTimes(3)
    jest.useRealTimers()
  })
})
