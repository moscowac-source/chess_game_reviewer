/**
 * @jest-environment node
 */

import { createWorkerFunctions } from '../../worker/src/functions'

describe('worker engine warm-up', () => {
  it('createWorkerFunctions resolves the engineFactory exactly once regardless of how many functions are registered', async () => {
    const engine = { postMessage: jest.fn(), onmessage: null }
    const engineFactory = jest.fn(async () => engine)

    const functions = await createWorkerFunctions({ engineFactory })

    expect(functions.length).toBeGreaterThan(0)
    expect(engineFactory).toHaveBeenCalledTimes(1)
  })

  it('every registered function reuses the same warm engine instance', async () => {
    const engine = { postMessage: jest.fn(), onmessage: null }
    const engineFactory = jest.fn(async () => engine)

    const capturedFactories: Array<() => unknown> = []
    const makeHandlerSpy = jest.fn((deps: { engineFactory?: () => unknown }) => {
      if (deps.engineFactory) capturedFactories.push(deps.engineFactory)
      return async () => ({})
    })

    await createWorkerFunctions({
      engineFactory,
      makeHandler: makeHandlerSpy,
    })

    expect(capturedFactories.length).toBeGreaterThan(0)
    for (const factory of capturedFactories) {
      expect(await factory()).toBe(engine)
    }
  })
})
