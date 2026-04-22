import { createWorkerFunctions } from '../../worker/src/functions'

describe('createWorkerFunctions', () => {
  it('returns a non-empty list of Inngest functions', async () => {
    const engine = { postMessage: jest.fn(), onmessage: null }
    const functions = await createWorkerFunctions({
      engineFactory: async () => engine,
    })

    expect(functions.length).toBeGreaterThan(0)
  })
})
