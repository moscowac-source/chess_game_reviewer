const CHESS_COM_BASE = 'https://api.chess.com/pub/player'

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
  const url = `${CHESS_COM_BASE}/${username.toLowerCase()}/archives`
  const response = await fetch(url)

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

    const response = await fetch(archiveUrl)
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

  const response = await fetch(url)

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
