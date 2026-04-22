const CHESS_COM_BASE = 'https://api.chess.com/pub/player'

// Chess.com's public API rejects/rate-limits requests without a User-Agent.
// Identify the app and include a contact address per their guidelines.
const USER_AGENT = 'ChessImprover/1.0 (https://chess-game-reviewer.vercel.app)'

// Exponential backoff steps for 429 retries (in ms). Chess.com's rate limit
// is per-IP, so a single transient 429 shouldn't kill a whole sync — sleep
// and try again. 1+2+4+8 = 15s of wait across up to 4 retries before we give
// up and surface the error to the caller.
const RETRY_DELAYS_MS = [1000, 2000, 4000, 8000]

function chessComHeaders(extra: Record<string, string> = {}): HeadersInit {
  return { 'User-Agent': USER_AGENT, ...extra }
}

export class ChessComApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message)
    this.name = 'ChessComApiError'
  }
}

/**
 * Opaque cache hints the caller has on file from a previous fetch. If both
 * are present, `If-None-Match` takes precedence (ETag is the stronger
 * validator on chess.com).
 */
export interface ConditionalCacheHints {
  etag?: string | null
  lastModified?: string | null
}

export interface ConditionalArchiveResponse {
  /** 200 = fresh data, 304 = unchanged. */
  status: 200 | 304
  pgns: string[]
  etag: string | null
  lastModified: string | null
}

export interface ArchiveCache {
  get(year: number, month: number): Promise<ConditionalCacheHints | null>
  set(
    year: number,
    month: number,
    data: { etag: string | null; lastModified: string | null },
  ): Promise<void>
}

/**
 * Fetch wrapper that retries on HTTP 429 with exponential backoff. Everything
 * else (network errors, 4xx, 5xx) bubbles up immediately so the caller can
 * decide whether to retry at a higher level.
 */
async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  let attempt = 0
  while (true) {
    const res = await fetch(url, init)
    if (res.status !== 429) return res
    if (attempt >= RETRY_DELAYS_MS.length) return res
    await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]))
    attempt++
  }
}

export async function fetchArchiveList(username: string): Promise<string[]> {
  // Chess.com's public API is case-sensitive — 'Catalyst030119' returns 301,
  // 'catalyst030119' returns 200. Normalize at the boundary.
  // The archives index lives at /games/archives, NOT /archives.
  const url = `${CHESS_COM_BASE}/${username.toLowerCase()}/games/archives`
  const response = await fetchWithRetry(url, { headers: chessComHeaders() })

  if (!response.ok) {
    throw new ChessComApiError(
      `Chess.com API error: ${response.status}`,
      response.status,
    )
  }

  const data = await response.json()
  return data.archives ?? []
}

export interface FetchMonthlyArchiveOptions {
  delayMs?: number
  cache?: ConditionalCacheHints
}

export async function fetchMonthlyArchive(
  username: string,
  year: number,
  month: number,
  options?: FetchMonthlyArchiveOptions,
): Promise<ConditionalArchiveResponse> {
  const delayMs = options?.delayMs ?? 0

  if (delayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, delayMs))
  }

  const mm = String(month).padStart(2, '0')
  const url = `https://api.chess.com/pub/player/${username.toLowerCase()}/games/${year}/${mm}`

  const conditional: Record<string, string> = {}
  if (options?.cache?.etag) conditional['If-None-Match'] = options.cache.etag
  if (options?.cache?.lastModified) conditional['If-Modified-Since'] = options.cache.lastModified

  const response = await fetchWithRetry(url, { headers: chessComHeaders(conditional) })

  if (response.status === 304) {
    return { status: 304, pgns: [], etag: null, lastModified: null }
  }

  if (!response.ok) {
    throw new ChessComApiError(
      `Chess.com API error: ${response.status}`,
      response.status,
    )
  }

  const data = await response.json()
  const games: Array<{ pgn: string }> = data.games ?? []
  return {
    status: 200,
    pgns: games.map((g) => g.pgn),
    etag: response.headers.get('etag'),
    lastModified: response.headers.get('last-modified'),
  }
}

function parseArchiveUrl(archiveUrl: string): { year: number; month: number } | null {
  // Chess.com archive URLs look like
  //   https://api.chess.com/pub/player/<user>/games/<yyyy>/<mm>
  const match = archiveUrl.match(/\/games\/(\d{4})\/(\d{2})$/)
  if (!match) return null
  return { year: parseInt(match[1], 10), month: parseInt(match[2], 10) }
}

export async function fetchGames(
  username: string,
  mode: 'historical' | 'incremental',
  options?: { delayMs?: number; archiveCache?: ArchiveCache },
): Promise<string[]> {
  const archives = await fetchArchiveList(username)
  if (archives.length === 0) return []

  const targets = mode === 'incremental' ? [archives[archives.length - 1]] : archives
  const delayMs = options?.delayMs ?? 0
  const cache = options?.archiveCache

  const allPgns: string[] = []
  for (const archiveUrl of targets) {
    const ym = parseArchiveUrl(archiveUrl)
    // If the URL doesn't match our expected shape, fall back to a bare fetch
    // — never let cache plumbing block a real sync.
    if (!ym) {
      const response = await fetchWithRetry(archiveUrl, { headers: chessComHeaders() })
      if (!response.ok) {
        throw new ChessComApiError(
          `Chess.com API error: ${response.status}`,
          response.status,
        )
      }
      if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs))
      const data = await response.json()
      const games: Array<{ pgn: string }> = data.games ?? []
      allPgns.push(...games.map((g) => g.pgn))
      continue
    }

    const cacheHints = cache ? (await cache.get(ym.year, ym.month)) ?? undefined : undefined
    const result = await fetchMonthlyArchive(username, ym.year, ym.month, {
      delayMs,
      cache: cacheHints,
    })

    if (result.status === 200) {
      allPgns.push(...result.pgns)
      if (cache) {
        await cache.set(ym.year, ym.month, {
          etag: result.etag,
          lastModified: result.lastModified,
        })
      }
    }
    // 304 → archive unchanged since last sync, caller already has the games.
  }

  return allPgns
}
