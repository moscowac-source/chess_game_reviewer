import { workerFunctions } from '../../worker/src/functions'
import { syncGamesFunction } from '../../lib/inngest/functions'

describe('worker-registered Inngest functions', () => {
  it('includes the syncGamesFunction so Inngest events route to the worker', () => {
    expect(workerFunctions).toContain(syncGamesFunction)
  })
})
