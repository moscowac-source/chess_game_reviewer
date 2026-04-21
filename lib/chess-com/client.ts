const CHESS_COM_BASE = 'https://api.chess.com/pub/player'

// Chess.com's public API rejects/rate-limits requests without a User-Agent.
// Identify the app and include a contact address per their guidelines.
const USER_AGENT = 'ChessImprover/1.0 (https://chess-game-reviewer.vercel.app)'

function chessComHeaders(): HeadersInit {
  return { 'User-Agent': USER_AGENT }
}

export class ChessComApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message)
    this.name = 'ChessComApiError'
  }
}

export async function fetchArchiveList(username: string): Promise<string[]> {
  // Chess.com's public API is case-sensitive — 'Catalyst030119' returns 301,
  // 'catalyst030119' returns 200. Normalize at the boundary.
  // The archives index lives at /games/archives, NOT /archives.
  const url = `${CHESS_COM_BASE}/${username.toLowerCase()}/games/archives`
  const response = await fetch(url, { headers: chessComHeaders() })

  if (!response.ok) {
    throw new ChessComApiError(
      `Chess.com API error: ${response.status}`,
      response.status
    )
  }

  const data = await response.json()
  return data.archives ?? []
}

export async function fetchGames(
  username: string,
  mode: 'historical' | 'incremental',
  options?: { delayMs?: number }
): Promise<string[]> {
  const archives = await fetchArchiveList(username)

  if (archives.length === 0) return []

  const targets = mode === 'incremental' ? [archives[archives.length - 1]] : archives

  const allPgns: string[] = []
  for (const archiveUrl of targets) {
    const delayMs = options?.delayMs ?? 0
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }

    const response = await fetch(archiveUrl, { headers: chessComHeaders() })
    if (!response.ok) {
      throw new ChessComApiError(
        `Chess.com API error: ${response.status}`,
        response.status
      )
    }
    const data = await response.json()
    const games: Array<{ pgn: string }> = data.games ?? []
    allPgns.push(...games.map((g) => g.pgn))
  }

  return allPgns
}

export async function fetchMonthlyArchive(
  username: string,
  year: number,
  month: number,
  options?: { delayMs?: number }
): Promise<string[]> {
  const delayMs = options?.delayMs ?? 0

  if (delayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, delayMs))
  }

  const mm = String(month).padStart(2, '0')
  const url = `https://api.chess.com/pub/player/${username.toLowerCase()}/games/${year}/${mm}`

  const response = await fetch(url, { headers: chessComHeaders() })

  if (!response.ok) {
    throw new ChessComApiError(
      `Chess.com API error: ${response.status}`,
      response.status
    )
  }

  const data = await response.json()
  const games: Array<{ pgn: string }> = data.games ?? []
  return games.map((g) => g.pgn)
}
