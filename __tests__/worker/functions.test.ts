/**
 * @jest-environment node
 */

import { createWorkerFunctions } from '../../worker/src/functions'

describe('createWorkerFunctions', () => {
  it('returns a non-empty list of Inngest functions', async () => {
    const listeners: Array<(line: string) => void> = []
    const engine = {
      postMessage: jest.fn((cmd: string) => {
        if (cmd.startsWith('go')) {
          setTimeout(() => listeners.forEach((l) => l('bestmove e2e4')), 0)
        }
      }),
      addMessageListener: (l: (line: string) => void) => { listeners.push(l) },
      removeMessageListener: (l: (line: string) => void) => {
        const i = listeners.indexOf(l)
        if (i >= 0) listeners.splice(i, 1)
      },
    }
    const functions = await createWorkerFunctions({
      engineFactory: async () => engine,
    })

    expect(functions.length).toBeGreaterThan(0)
  })
})
