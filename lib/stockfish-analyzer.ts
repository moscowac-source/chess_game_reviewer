import { Chess } from 'chess.js'
import type { GamePosition } from './game-parser'
import { classifyMove } from './move-classifier'
import type { CardClassification } from '@/types/database'

export interface PositionAnalysis {
  fen: string
  movePlayed: string
  cpl: number
  bestMove: string
  bestLine: string[]
  classification: CardClassification | null
}

export interface UciEngine {
  postMessage(command: string): void
  onmessage: ((msg: string | { data: string }) => void) | null
}

interface EvalResult {
  score: number
  bestMove: string
  bestLine: string[]
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

function parsePv(line: string): string[] {
  const match = line.match(/\bpv\s+(.+)$/)
  if (!match) return []
  return match[1].trim().split(/\s+/)
}

async function evaluateFen(engine: UciEngine, fen: string): Promise<EvalResult> {
  return new Promise((resolve) => {
    let lastScore = 0
    let lastBestLine: string[] = []
    engine.onmessage = (event) => {
      const line = typeof event === 'string' ? event : event.data
      const score = parseInfoScore(line)
      if (score !== null) {
        lastScore = score
        const pv = parsePv(line)
        if (pv.length > 0) lastBestLine = pv
      }
      if (line.startsWith('bestmove')) {
        const parts = line.split(/\s+/)
        resolve({ score: lastScore, bestMove: parts[1] ?? '', bestLine: lastBestLine })
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

function legalMoveCount(fen: string): number {
  return new Chess(fen).moves().length
}

function uciToSan(fen: string, uciMove: string): string | null {
  try {
    const chess = new Chess(fen)
    const from = uciMove.slice(0, 2) as `${'a'|'b'|'c'|'d'|'e'|'f'|'g'|'h'}${'1'|'2'|'3'|'4'|'5'|'6'|'7'|'8'}`
    const to = uciMove.slice(2, 4) as typeof from
    const promotion = uciMove[4] as 'q' | 'r' | 'b' | 'n' | undefined
    const move = chess.move({ from, to, ...(promotion ? { promotion } : {}) })
    return move?.san ?? null
  } catch {
    return null
  }
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

    const before = await evaluateFen(engine, fen)

    const nextFen =
      i + 1 < positions.length
        ? positions[i + 1].fen
        : fenAfterMove(fen, movePlayed)

    const after = await evaluateFen(engine, nextFen)
    const cpl = Math.max(0, before.score + after.score)
    const moveCount = legalMoveCount(fen)
    const bestMoveSan = uciToSan(fen, before.bestMove) ?? before.bestMove
    const classification = classifyMove(cpl, movePlayed, bestMoveSan, moveCount)

    results.push({
      fen,
      movePlayed,
      cpl,
      bestMove: before.bestMove,
      bestLine: before.bestLine,
      classification,
    })
  }

  return results
}

function createDefaultEngine(): UciEngine {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Stockfish = require('stockfish')
  return typeof Stockfish === 'function' ? Stockfish() : Stockfish.default()
}
