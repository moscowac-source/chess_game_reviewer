import { Chess } from 'chess.js'
import type { GamePosition } from './game-parser'

export interface PositionAnalysis {
  fen: string
  movePlayed: string
  cpl: number
}

export interface UciEngine {
  postMessage(command: string): void
  onmessage: ((msg: string | { data: string }) => void) | null
}

function parseInfoScore(line: string): number | null {
  const cpMatch = line.match(/score cp (-?\d+)/)
  if (cpMatch) return parseInt(cpMatch[1], 10)

  const mateMatch = line.match(/score mate (-?\d+)/)
  if (mateMatch) {
    const m = parseInt(mateMatch[1], 10)
    return m > 0 ? 10000 - m : -(10000 + m)
  }

  return null
}

async function evaluateFen(engine: UciEngine, fen: string): Promise<number> {
  return new Promise((resolve) => {
    let lastScore = 0
    engine.onmessage = (event) => {
      const line = typeof event === 'string' ? event : event.data
      const score = parseInfoScore(line)
      if (score !== null) lastScore = score
      if (line.startsWith('bestmove')) {
        resolve(lastScore)
      }
    }
    engine.postMessage(`position fen ${fen}`)
    engine.postMessage('go depth 15')
  })
}

function fenAfterMove(fen: string, san: string): string {
  const chess = new Chess(fen)
  chess.move(san)
  return chess.fen()
}

export async function analyzeGame(
  positions: GamePosition[],
  engineFactory: () => UciEngine = createDefaultEngine,
): Promise<PositionAnalysis[]> {
  if (typeof window !== 'undefined') {
    throw new Error('Stockfish analyzer must only run server-side')
  }

  if (positions.length === 0) return []

  const engine = engineFactory()
  const results: PositionAnalysis[] = []

  for (let i = 0; i < positions.length; i++) {
    const { fen, movePlayed } = positions[i]

    const evalBefore = await evaluateFen(engine, fen)

    const nextFen =
      i + 1 < positions.length
        ? positions[i + 1].fen
        : fenAfterMove(fen, movePlayed)

    const evalAfterFromOpponent = await evaluateFen(engine, nextFen)
    const cpl = Math.max(0, evalBefore + evalAfterFromOpponent)

    results.push({ fen, movePlayed, cpl })
  }

  return results
}

function createDefaultEngine(): UciEngine {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Stockfish = require('stockfish')
  return typeof Stockfish === 'function' ? Stockfish() : Stockfish.default()
}
