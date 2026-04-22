/**
 * @jest-environment node
 */

import { createWorkerFunctions } from '../../worker/src/functions'

function makeFakeEngine() {
  const listeners: Array<(line: string) => void> = []
  return {
    postMessage: jest.fn((cmd: string) => {
      if (cmd.startsWith('go')) {
        setTimeout(() => listeners.forEach((l) => l('bestmove e2e4')), 0)
      }
    }),
    addMessageListener: jest.fn((l: (line: string) => void) => { listeners.push(l) }),
    removeMessageListener: jest.fn((l: (line: string) => void) => {
      const i = listeners.indexOf(l)
      if (i >= 0) listeners.splice(i, 1)
    }),
  }
}

describe('worker engine warm-up', () => {
  it('createWorkerFunctions resolves the engineFactory exactly once regardless of how many functions are registered', async () => {
    const engine = makeFakeEngine()
    const engineFactory = jest.fn(async () => engine)

    const functions = await createWorkerFunctions({ engineFactory })

    expect(functions.length).toBeGreaterThan(0)
    expect(engineFactory).toHaveBeenCalledTimes(1)
  })

  it('every registered function reuses the same warm engine instance', async () => {
    const engine = makeFakeEngine()
    const engineFactory = jest.fn(async () => engine)

    const capturedFactories: Array<() => unknown> = []
    const makeHandlerSpy = jest.fn((deps: { engineFactory?: () => unknown } = {}) => {
      if (deps.engineFactory) capturedFactories.push(deps.engineFactory)
      return (async () => ({})) as unknown as ReturnType<
        typeof import('@/lib/inngest/functions').makeSyncGamesHandler
      >
    })

    await createWorkerFunctions({
      engineFactory,
      makeHandler: makeHandlerSpy as unknown as typeof import('@/lib/inngest/functions').makeSyncGamesHandler,
    })

    expect(capturedFactories.length).toBeGreaterThan(0)
    for (const factory of capturedFactories) {
      expect(await factory()).toBe(engine)
    }
  })
})
