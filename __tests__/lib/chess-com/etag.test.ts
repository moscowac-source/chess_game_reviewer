/**
 * @jest-environment node
 */
import { fetchMonthlyArchive } from '@/lib/chess-com/client'

function responseOk(body: unknown, headers: Record<string, string> = {}) {
  return {
    ok: true,
    status: 200,
    headers: { get: (k: string) => headers[k.toLowerCase()] ?? null },
    json: async () => body,
  }
}

function response304(headers: Record<string, string> = {}) {
  return {
    ok: false,
    status: 304,
    headers: { get: (k: string) => headers[k.toLowerCase()] ?? null },
    json: async () => ({}),
  }
}

describe('fetchMonthlyArchive — ETag / If-Modified-Since conditional fetch', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('sends If-None-Match when a cached ETag is provided', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      responseOk({ games: [{ pgn: 'P1' }] }, { etag: '"abc123"' }),
    )
    global.fetch = fetchMock as unknown as typeof fetch

    await fetchMonthlyArchive('alice', 2024, 3, {
      cache: { etag: '"abc123"' },
    })

    const call = fetchMock.mock.calls[0]
    const headers = call[1].headers as Record<string, string>
    expect(headers['If-None-Match']).toBe('"abc123"')
  })

  it('sends If-Modified-Since when a cached Last-Modified is provided', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      responseOk({ games: [] }),
    )
    global.fetch = fetchMock as unknown as typeof fetch

    await fetchMonthlyArchive('alice', 2024, 3, {
      cache: { lastModified: 'Tue, 15 Nov 2024 12:00:00 GMT' },
    })

    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>
    expect(headers['If-Modified-Since']).toBe('Tue, 15 Nov 2024 12:00:00 GMT')
  })

  it('returns status: 304 with no pgns when the archive has not changed', async () => {
    global.fetch = jest.fn().mockResolvedValue(response304()) as unknown as typeof fetch

    const result = await fetchMonthlyArchive('alice', 2024, 3, {
      cache: { etag: '"abc123"' },
    })

    expect(result).toEqual({
      status: 304,
      pgns: [],
      etag: null,
      lastModified: null,
    })
  })

  it('returns the new ETag / Last-Modified on a 200 response so the caller can persist them', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      responseOk(
        { games: [{ pgn: 'P1' }, { pgn: 'P2' }] },
        { etag: '"new-tag"', 'last-modified': 'Tue, 20 Feb 2024 00:00:00 GMT' },
      ),
    )
    global.fetch = fetchMock as unknown as typeof fetch

    const result = await fetchMonthlyArchive('alice', 2024, 2)

    expect(result).toEqual({
      status: 200,
      pgns: ['P1', 'P2'],
      etag: '"new-tag"',
      lastModified: 'Tue, 20 Feb 2024 00:00:00 GMT',
    })
  })
})
