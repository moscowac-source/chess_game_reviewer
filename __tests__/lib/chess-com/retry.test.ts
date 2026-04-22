/**
 * @jest-environment node
 */
import { fetchMonthlyArchive, ChessComApiError } from '@/lib/chess-com/client'

function responseOk(body: unknown, headers: Record<string, string> = {}) {
  return {
    ok: true,
    status: 200,
    headers: { get: (k: string) => headers[k.toLowerCase()] ?? null },
    json: async () => body,
  }
}

function responseStatus(status: number, headers: Record<string, string> = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (k: string) => headers[k.toLowerCase()] ?? null },
    json: async () => ({}),
  }
}

describe('fetchMonthlyArchive — 429 exponential backoff', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })
  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it('retries on 429 with 1s → 2s → 4s → 8s backoff, then resolves when a retry finally succeeds', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(responseStatus(429))
      .mockResolvedValueOnce(responseStatus(429))
      .mockResolvedValueOnce(responseOk({ games: [{ pgn: 'P1' }] }))
    global.fetch = fetchMock as unknown as typeof fetch

    const promise = fetchMonthlyArchive('alice', 2024, 3)

    // 1st call: immediate. Then wait 1000ms → 2nd. Then wait 2000ms → 3rd.
    await jest.advanceTimersByTimeAsync(1000)
    await jest.advanceTimersByTimeAsync(2000)

    await expect(promise).resolves.toEqual(expect.objectContaining({ pgns: ['P1'] }))
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('gives up after 4 retries and throws ChessComApiError(429)', async () => {
    const fetchMock = jest.fn().mockResolvedValue(responseStatus(429))
    global.fetch = fetchMock as unknown as typeof fetch

    const promise = fetchMonthlyArchive('alice', 2024, 3)
    // Silence unhandled rejection during timer advancement.
    promise.catch(() => {})

    // 1s + 2s + 4s + 8s = 15s total backoff across 4 retries.
    await jest.advanceTimersByTimeAsync(1000)
    await jest.advanceTimersByTimeAsync(2000)
    await jest.advanceTimersByTimeAsync(4000)
    await jest.advanceTimersByTimeAsync(8000)

    await expect(promise).rejects.toMatchObject({
      name: 'ChessComApiError',
      statusCode: 429,
    })
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(5)
    // Constructor reference to silence unused-import lint.
    expect(ChessComApiError.name).toBe('ChessComApiError')
  })

  it('does NOT retry non-429 errors (500 bubbles immediately)', async () => {
    const fetchMock = jest.fn().mockResolvedValue(responseStatus(500))
    global.fetch = fetchMock as unknown as typeof fetch

    await expect(fetchMonthlyArchive('alice', 2024, 3)).rejects.toMatchObject({
      statusCode: 500,
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
