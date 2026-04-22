import type { InngestFunction } from 'inngest'
import { createSyncGamesFunction, makeSyncGamesHandler } from '../../lib/inngest/functions'
import { createDefaultEngine, type UciEngine } from '../../lib/stockfish-analyzer'

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
  const sharedFactory = () => engine

  // `makeHandler`'s only purpose is to let unit tests capture the factory
  // passed into each function builder. Production code path just builds the
  // sync-games function as normal.
  if (deps.makeHandler) {
    deps.makeHandler({ engineFactory: sharedFactory })
  }

  return [createSyncGamesFunction({ engineFactory: sharedFactory })]
}
