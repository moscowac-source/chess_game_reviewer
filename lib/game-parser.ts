import { Chess } from 'chess.js'

export interface GamePosition {
  fen: string
  movePlayed: string
}

export interface PgnHeaders {
  white: string | null
  black: string | null
  result: string | null
  url: string | null
  eco: string | null
  playedAt: string | null
}

export function parseGame(pgn: string): GamePosition[] {
  const chess = new Chess()
  chess.loadPgn(pgn)
  const moves = chess.history()

  const board = new Chess()
  const positions: GamePosition[] = []

  for (const san of moves) {
    const fen = board.fen()
    board.move(san)
    positions.push({ fen, movePlayed: san })
  }

  return positions
}

function coalesceHeader(headers: Record<string, string>, ...names: string[]): string | null {
  for (const name of names) {
    const v = headers[name]
    if (typeof v === 'string' && v.length > 0) return v
  }
  return null
}

function toIsoPlayedAt(date: string | null, time: string | null): string | null {
  if (!date) return null
  // Chess.com PGN format: UTCDate "2024.03.14", UTCTime "18:45:12"
  const dateParts = date.split('.')
  if (dateParts.length !== 3) return null
  const [y, m, d] = dateParts
  const t = time && /^\d{2}:\d{2}:\d{2}$/.test(time) ? time : '00:00:00'
  const iso = `${y}-${m}-${d}T${t}.000Z`
  const parsed = new Date(iso)
  return isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

export function parsePgnHeaders(pgn: string): PgnHeaders {
  const chess = new Chess()
  try {
    chess.loadPgn(pgn)
  } catch {
    // fall through — header() still returns whatever was parsed
  }
  const headers = chess.header() as Record<string, string>

  const utcDate = coalesceHeader(headers, 'UTCDate', 'Date')
  const utcTime = coalesceHeader(headers, 'UTCTime')

  return {
    white: coalesceHeader(headers, 'White'),
    black: coalesceHeader(headers, 'Black'),
    result: coalesceHeader(headers, 'Result'),
    url: coalesceHeader(headers, 'Link'),
    eco: coalesceHeader(headers, 'ECO'),
    playedAt: toIsoPlayedAt(utcDate, utcTime),
  }
}
