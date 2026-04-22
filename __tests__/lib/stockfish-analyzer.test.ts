/**
 * @jest-environment node
 */

import { analyzeGame } from '@/lib/stockfish-analyzer'
import type { UciEngine } from '@/lib/stockfish-analyzer'
import type { GamePosition } from '@/lib/game-parser'

// Builds a mock engine that returns the given centipawn scores in sequence
// (one per `go depth` call — one per FEN evaluated)
// Optionally accepts bestMoves and pvLines arrays for Phase 7 field testing.
function makeListenerEngine(
  onGo: (emit: (line: string) => void) => void,
): UciEngine {
  const listeners: Array<(line: string) => void> = []
  const engine: UciEngine = {
    postMessage(command: string) {
      if (command.startsWith('go')) {
        setTimeout(() => {
          onGo((line) => listeners.forEach((l) => l(line)))
        }, 0)
      }
    },
    addMessageListener(l) { listeners.push(l) },
    removeMessageListener(l) {
      const i = listeners.indexOf(l)
      if (i >= 0) listeners.splice(i, 1)
    },
  }
  return engine
}

function makeMockEngine(
  cpScores: number[],
  bestMoves?: string[],
  pvLines?: string[][],
): () => UciEngine {
  let callIndex = 0
  return () => makeListenerEngine((emit) => {
    const idx = callIndex++
    const score = cpScores[idx] ?? 0
    const bestMove = bestMoves?.[idx] ?? 'e2e4'
    const pv = pvLines?.[idx] ?? ['e2e4', 'e7e5']
    emit(`info depth 15 score cp ${score} pv ${pv.join(' ')}`)
    emit(`bestmove ${bestMove} ponder e7e5`)
  })
}

function makeMockEngineWithLines(infoLines: string[]): () => UciEngine {
  let callIndex = 0
  return () => makeListenerEngine((emit) => {
    const line = infoLines[callIndex++] ?? 'info depth 1 score cp 0'
    emit(line)
    emit('bestmove e2e4')
  })
}

describe('analyzeGame', () => {
  describe('server-only guard', () => {
    it('throws when called in a browser context (window defined)', async () => {
      ;(global as unknown as Record<string, unknown>).window = {}
      await expect(analyzeGame([], makeMockEngine([]))).rejects.toThrow(
        'server-side',
      )
      delete (global as unknown as Record<string, unknown>).window
    })
  })

  describe('empty input', () => {
    it('returns an empty array when given no positions', async () => {
      const result = await analyzeGame([], makeMockEngine([]))
      expect(result).toEqual([])
    })
  })

  describe('engine output parsing', () => {
    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    const onePosition: GamePosition[] = [{ fen: startFen, movePlayed: 'e4' }]

    it('parses mate-in-N score: score mate 3 → 10000-3=9997 cp', async () => {
      // evalBefore = mate 3 → 9997, evalAfterFromOpponent = cp 0 → 0
      // CPL = max(0, 9997 + 0) = 9997
      const engine = makeMockEngineWithLines([
        'info depth 15 score mate 3',
        'info depth 15 score cp 0',
      ])
      const result = await analyzeGame(onePosition, engine)
      expect(result[0].cpl).toBe(9997)
    })

    it('parses negative mate score: score mate -2 → -(10000+2)=-10002 cp', async () => {
      // evalBefore = cp 100, evalAfterFromOpponent = mate -2 → -10002
      // CPL = max(0, 100 + (-10002)) = max(0, -9902) = 0
      const engine = makeMockEngineWithLines([
        'info depth 15 score cp 100',
        'info depth 15 score mate -2',
      ])
      const result = await analyzeGame(onePosition, engine)
      expect(result[0].cpl).toBe(0)
    })
  })

  describe('CPL calculation', () => {
    // Starting FEN (White to move)
    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    const afterE4Fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'

    const onePosition: GamePosition[] = [
      { fen: startFen, movePlayed: 'e4' },
    ]

    it('returns one result per position with fen and movePlayed preserved', async () => {
      // evalBefore=20, evalAfterFromOpponent=10 → CPL = max(0, 20+10) = 30
      const result = await analyzeGame(onePosition, makeMockEngine([20, 10]))
      expect(result).toHaveLength(1)
      expect(result[0].fen).toBe(startFen)
      expect(result[0].movePlayed).toBe('e4')
    })

    it('computes CPL as max(0, evalBefore + evalAfterFromOpponent)', async () => {
      // evalBefore=200, evalAfterFromOpponent=150 → CPL = 350
      const result = await analyzeGame(onePosition, makeMockEngine([200, 150]))
      expect(result[0].cpl).toBe(350)
    })

    it('clamps CPL to 0 when move gains evaluation', async () => {
      // evalBefore=50, evalAfterFromOpponent=-80 → max(0, 50-80)=0
      const result = await analyzeGame(onePosition, makeMockEngine([50, -80]))
      expect(result[0].cpl).toBe(0)
    })

    it('returns one result per position across a two-move sequence', async () => {
      const twoPositions: GamePosition[] = [
        { fen: startFen, movePlayed: 'e4' },
        { fen: afterE4Fen, movePlayed: 'e5' },
      ]
      // evalBefore[0]=30, evalAfter[0]=20, evalBefore[1]=25, evalAfter[1]=15
      const result = await analyzeGame(twoPositions, makeMockEngine([30, 20, 25, 15]))
      expect(result).toHaveLength(2)
      expect(result[0].cpl).toBe(50)  // max(0, 30+20)
      expect(result[1].cpl).toBe(40)  // max(0, 25+15)
    })
  })

  describe('Phase 7: bestMove, bestLine, and classification fields', () => {
    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

    it('captures bestMove from engine output', async () => {
      const positions: GamePosition[] = [{ fen: startFen, movePlayed: 'e4' }]
      // evalBefore=20, evalAfter=10; bestMove for evalBefore call = 'e2e4'
      const result = await analyzeGame(
        positions,
        makeMockEngine([20, 10], ['e2e4', 'd2d4']),
      )
      expect(result[0].bestMove).toBe('e2e4')
    })

    it('captures bestLine (PV) from engine output', async () => {
      const positions: GamePosition[] = [{ fen: startFen, movePlayed: 'e4' }]
      const result = await analyzeGame(
        positions,
        makeMockEngine([20, 10], ['e2e4'], [['e2e4', 'e7e5', 'g1f3']]),
      )
      expect(result[0].bestLine).toEqual(['e2e4', 'e7e5', 'g1f3'])
    })

    it('classifies a blunder (CPL > 200) correctly', async () => {
      const positions: GamePosition[] = [{ fen: startFen, movePlayed: 'e4' }]
      // CPL = max(0, 50 + 260) = 310 → blunder
      const result = await analyzeGame(
        positions,
        makeMockEngine([50, 260], ['d2d4']),
      )
      expect(result[0].classification).toBe('blunder')
    })

    it('classifies a great move (matches bestMove, not forced) correctly', async () => {
      // Use a position with many legal moves; movePlayed matches bestMove; CPL = 0
      const positions: GamePosition[] = [{ fen: startFen, movePlayed: 'e4' }]
      // CPL = max(0, 20 + (-25)) = 0; bestMove for evalBefore = 'e2e4' = movePlayed
      const result = await analyzeGame(
        positions,
        makeMockEngine([20, -25], ['e2e4']),
      )
      expect(result[0].classification).toBe('great')
    })

    it('returns null classification for an unremarkable move', async () => {
      const positions: GamePosition[] = [{ fen: startFen, movePlayed: 'e4' }]
      // CPL = 50 (between 0 and 100); doesn't match bestMove
      const result = await analyzeGame(
        positions,
        makeMockEngine([100, -50], ['d2d4']),
      )
      expect(result[0].classification).toBeNull()
    })
  })

  describe('hang detection', () => {
    it('throws engine-init-timeout when the engine factory never resolves', async () => {
      const neverResolvingFactory = () => new Promise<UciEngine>(() => { /* hang */ })
      await expect(
        analyzeGame(
          [{ fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', movePlayed: 'e4' }],
          neverResolvingFactory,
          { engineInitTimeoutMs: 50, evalTimeoutMs: 5000 },
        ),
      ).rejects.toThrow(/engine-init/)
    })

    it('throws eval-timeout when the engine never emits bestmove', async () => {
      const hangingEngine: () => UciEngine = () => ({
        postMessage() { /* never respond */ },
        addMessageListener() {},
        removeMessageListener() {},
      })
      await expect(
        analyzeGame(
          [{ fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', movePlayed: 'e4' }],
          hangingEngine,
          { engineInitTimeoutMs: 5000, evalTimeoutMs: 50 },
        ),
      ).rejects.toThrow(/eval/)
    })
  })

  describe('engine command budget', () => {
    it('uses movetime (not depth) so each eval has a hard per-position time cap', async () => {
      const commands: string[] = []
      const engine: () => UciEngine = () => {
        const listeners: Array<(line: string) => void> = []
        const e: UciEngine = {
          postMessage(cmd: string) {
            commands.push(cmd)
            if (cmd.startsWith('go')) {
              setTimeout(() => {
                listeners.forEach((l) => l('info depth 12 score cp 20 pv e2e4'))
                listeners.forEach((l) => l('bestmove e2e4'))
              }, 0)
            }
          },
          addMessageListener(l) { listeners.push(l) },
          removeMessageListener(l) {
            const i = listeners.indexOf(l)
            if (i >= 0) listeners.splice(i, 1)
          },
        }
        return e
      }

      const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
      await analyzeGame([{ fen: startFen, movePlayed: 'e4' }], engine)

      const goCommands = commands.filter((c) => c.startsWith('go'))
      expect(goCommands.length).toBeGreaterThan(0)
      for (const cmd of goCommands) {
        expect(cmd).toMatch(/^go movetime \d+$/)
      }
    })
  })

  describe('fixture position sequences', () => {
    // Scenario 1: blunder — one move loses 250+ CPL
    it('scenario 1: blunder move produces high CPL (>200)', async () => {
      const positions: GamePosition[] = [
        {
          fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          movePlayed: 'e4',
        },
      ]
      // Simulated: engine says position was +50, after move it is +260 for opponent
      const result = await analyzeGame(positions, makeMockEngine([50, 260]))
      expect(result[0].cpl).toBe(310)
      expect(result[0].cpl).toBeGreaterThan(200)
    })

    // Scenario 2: good move — CPL is 0 (engine agrees with played move)
    it('scenario 2: good move produces zero CPL', async () => {
      const positions: GamePosition[] = [
        {
          fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
          movePlayed: 'e5',
        },
      ]
      // Engine eval before = 20 for side to move, after = -25 for opponent
      // CPL = max(0, 20 + (-25)) = 0
      const result = await analyzeGame(positions, makeMockEngine([20, -25]))
      expect(result[0].cpl).toBe(0)
    })

    // Scenario 3: multi-move game — CPL reported independently per ply
    it('scenario 3: five-move sequence produces five independent CPL results', async () => {
      // Each position uses arbitrary FEN (game parser provides real ones; here we use start FEN repeated)
      const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
      const positions: GamePosition[] = Array.from({ length: 5 }, (_, i) => ({
        fen,
        movePlayed: 'e4',
      }))
      // 10 evaluations: evalBefore and evalAfterFromOpponent for each of 5 plies
      const cpScores = [10, 5, 30, 10, 50, 260, 0, 0, 100, 80]
      const result = await analyzeGame(positions, makeMockEngine(cpScores))
      expect(result).toHaveLength(5)
      expect(result[0].cpl).toBe(15)   // 10+5
      expect(result[1].cpl).toBe(40)   // 30+10
      expect(result[2].cpl).toBe(310)  // 50+260
      expect(result[3].cpl).toBe(0)    // 0+0
      expect(result[4].cpl).toBe(180)  // 100+80
    })
  })
})
