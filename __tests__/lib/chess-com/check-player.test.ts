/**
 * @jest-environment node
 */
import { checkPlayerExists, ChessComApiError } from '../../../lib/chess-com/client'

function fakeResponse(status: number) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    json: async () => ({}),
  }
}

function mockFetch(status: number) {
  global.fetch = jest.fn().mockResolvedValue(fakeResponse(status)) as unknown as typeof fetch
}

afterEach(() => {
  jest.restoreAllMocks()
})

describe('checkPlayerExists', () => {
  it('returns true on a 200 and queries the lowercased handle', async () => {
    mockFetch(200)

    await expect(checkPlayerExists('Hikaru')).resolves.toBe(true)
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.chess.com/pub/player/hikaru',
      expect.objectContaining({ headers: expect.any(Object) }),
    )
  })

  it('returns false on a 404 (player does not exist)', async () => {
    mockFetch(404)

    await expect(checkPlayerExists('nope')).resolves.toBe(false)
  })

  it('throws ChessComApiError on other failures (e.g. 500)', async () => {
    mockFetch(500)

    await expect(checkPlayerExists('hikaru')).rejects.toThrow(ChessComApiError)
  })
})
