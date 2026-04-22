import type { InngestFunction } from 'inngest'
import { createSyncGamesFunction, makeSyncGamesHandler } from '../../lib/inngest/functions'
import { createDefaultEngine, type UciEngine } from '../../lib/stockfish-analyzer'

/**
 * Run a single short eval against the freshly-constructed engine so the
 * real sync's first eval doesn't pay the cold-start JIT/NNUE cost and
 * blow the per-eval timeout.
 */
async function warmupEval(engine: UciEngine): Promise<void> {
  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      engine.removeMessageListener(listener)
      resolve()
    }, 30_000) // hard cap — don't block boot forever
    const listener = (line: string) => {
      if (line.startsWith('bestmove')) {
        clearTimeout(timeout)
        engine.removeMessageListener(listener)
        resolve()
      }
    }
    engine.addMessageListener(listener)
    engine.postMessage('position startpos')
    engine.postMessage('go movetime 500')
  })
}

export interface CreateWorkerFunctionsDeps {
  /**
   * Resolves the warm Stockfish engine. Called exactly once at boot; every
   * registered Inngest function then reuses the same engine instance for
   * every sync job it runs.
   */
  engineFactory?: () => UciEngine | Promise<UciEngine>
  /**
   * Test seam — lets a test assert that the handler built for each function
   * receives a factory resolving to the same warm engine.
   */
  makeHandler?: typeof makeSyncGamesHandler
}

/**
 * Build the Inngest function list the worker will serve. Warms the Stockfish
 * engine once and hands the same instance to every function via a shared
 * factory — the key difference from Vercel, where each invocation pays the
 * 40MB NNUE cold-load itself (issue #67 / plan F #74).
 */
export async function createWorkerFunctions(
  deps: CreateWorkerFunctionsDeps = {},
): Promise<InngestFunction.Any[]> {
  const resolveEngine = deps.engineFactory ?? createDefaultEngine
  const engine = await resolveEngine()

  // Actually run a tiny eval at boot. Constructing the engine is not enough —
  // the first `go movetime 500` after construction routinely takes >3s on a
  // fresh WASM module (JIT + NNUE network load). Doing it here so that the
  // first real sync eval is already hot.
  await warmupEval(engine)

  const sharedFactory = () => engine

  // `makeHandler`'s only purpose is to let unit tests capture the factory
  // passed into each function builder. Production code path just builds the
  // sync-games function as normal.
  if (deps.makeHandler) {
    deps.makeHandler({ engineFactory: sharedFactory })
  }

  return [createSyncGamesFunction({ engineFactory: sharedFactory })]
}
