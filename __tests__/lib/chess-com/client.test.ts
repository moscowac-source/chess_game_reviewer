/**
 * @jest-environment node
 */
import { fetchMonthlyArchive, ChessComApiError } from '../../../lib/chess-com/client'

const FAKE_PGN_1 = '[Event "Live Chess"]\n1. e4 e5 *'
const FAKE_PGN_2 = '[Event "Live Chess"]\n1. d4 d5 *'

function fakeResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (k: string) => headers[k.toLowerCase()] ?? null },
    json: async () => body,
  }
}

function mockFetch(status: number, body: unknown) {
  global.fetch = jest.fn().mockResolvedValue(fakeResponse(status, body)) as unknown as typeof fetch
}

afterEach(() => {
  jest.restoreAllMocks()
})

describe('fetchMonthlyArchive', () => {
  it('waits delayMs before fetching when delayMs is set', async () => {
    mockFetch(200, { games: [] })
    jest.useFakeTimers()

    const promise = fetchMonthlyArchive('testuser', 2024, 3, { delayMs: 500 })

    expect(global.fetch).not.toHaveBeenCalled()
    jest.advanceTimersByTime(500)
    await promise

    expect(global.fetch).toHaveBeenCalledTimes(1)
    jest.useRealTimers()
  })

  it('throws ChessComApiError with statusCode on 500', async () => {
    mockFetch(500, {})

    await expect(fetchMonthlyArchive('testuser', 2024, 3)).rejects.toThrow(ChessComApiError)
    await expect(fetchMonthlyArchive('testuser', 2024, 3)).rejects.toMatchObject({
      statusCode: 500,
    })
  })

  it('returns empty pgns for months with no games', async () => {
    mockFetch(200, { games: [] })

    const result = await fetchMonthlyArchive('testuser', 2024, 1)

    expect(result).toEqual({
      status: 200,
      pgns: [],
      etag: null,
      lastModified: null,
    })
  })

  it('fetches a single archive and returns parsed PGN array plus cache headers', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      fakeResponse(
        200,
        { games: [{ pgn: FAKE_PGN_1 }, { pgn: FAKE_PGN_2 }] },
        { etag: '"v1"', 'last-modified': 'Mon, 01 Apr 2024 00:00:00 GMT' },
      ),
    ) as unknown as typeof fetch

    const result = await fetchMonthlyArchive('testuser', 2024, 3)

    expect(result).toEqual({
      status: 200,
      pgns: [FAKE_PGN_1, FAKE_PGN_2],
      etag: '"v1"',
      lastModified: 'Mon, 01 Apr 2024 00:00:00 GMT',
    })
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.chess.com/pub/player/testuser/games/2024/03',
      expect.objectContaining({ headers: expect.any(Object) }),
    )
  })
})
