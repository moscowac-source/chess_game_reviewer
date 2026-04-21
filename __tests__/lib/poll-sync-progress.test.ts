/**
 * @jest-environment node
 */

import { pollSyncUntilTerminal } from '@/lib/poll-sync-progress'

function jsonResponse(body: unknown): Response {
  return { ok: true, json: async () => body } as Response
}

describe('pollSyncUntilTerminal', () => {
  it("resolves to 'complete' when the server reports stage=complete", async () => {
    const stages = ['queued', 'fetching', 'analyzing', 'complete']
    let call = 0
    const fetchFn = jest.fn(async () => jsonResponse({ stage: stages[call++] }))

    const result = await pollSyncUntilTerminal('sync-1', {
      fetchFn,
      sleepFn: async () => {},
      maxAttempts: 10,
    })

    expect(result.outcome).toBe('complete')
    expect(fetchFn).toHaveBeenCalledTimes(4)
  })

  it("resolves to 'error' and surfaces the server message", async () => {
    const fetchFn = jest.fn(async () =>
      jsonResponse({ stage: 'error', error: 'Chess.com 404' }),
    )

    const result = await pollSyncUntilTerminal('sync-2', {
      fetchFn,
      sleepFn: async () => {},
      maxAttempts: 5,
    })

    expect(result.outcome).toBe('error')
    expect(result.error).toBe('Chess.com 404')
  })

  it("gives up with outcome='timeout' after maxAttempts when stage never becomes terminal", async () => {
    const fetchFn = jest.fn(async () => jsonResponse({ stage: 'analyzing' }))

    const result = await pollSyncUntilTerminal('sync-3', {
      fetchFn,
      sleepFn: async () => {},
      maxAttempts: 5,
    })

    expect(result.outcome).toBe('timeout')
    expect(fetchFn).toHaveBeenCalledTimes(5)
  })

  it('ignores transient fetch errors and keeps polling', async () => {
    const responses = [
      () => { throw new Error('network') },
      () => jsonResponse({ ok: false } as unknown as Response),
      () => jsonResponse({ stage: 'complete' }),
    ]
    let call = 0
    const fetchFn = jest.fn(async () => {
      const next = responses[call++]
      const out = next()
      if (out instanceof Error) throw out
      return out as Response
    })

    const result = await pollSyncUntilTerminal('sync-4', {
      fetchFn,
      sleepFn: async () => {},
      maxAttempts: 10,
    })

    expect(result.outcome).toBe('complete')
  })

  it('emits onProgress for every successful poll', async () => {
    const stages = ['fetching', 'analyzing', 'complete']
    let call = 0
    const fetchFn = jest.fn(async () =>
      jsonResponse({ stage: stages[call++], games_done: call, games_total: 3 }),
    )
    const onProgress = jest.fn()

    await pollSyncUntilTerminal('sync-5', {
      fetchFn,
      sleepFn: async () => {},
      maxAttempts: 10,
      onProgress,
    })

    expect(onProgress).toHaveBeenCalledTimes(3)
    expect(onProgress).toHaveBeenNthCalledWith(1, expect.objectContaining({ stage: 'fetching' }))
    expect(onProgress).toHaveBeenNthCalledWith(3, expect.objectContaining({ stage: 'complete' }))
  })
})
