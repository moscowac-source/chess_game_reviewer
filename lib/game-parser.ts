import { Chess } from 'chess.js'

export interface GamePosition {
  fen: string
  movePlayed: string
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
