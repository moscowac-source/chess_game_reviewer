export interface SyncProgressSnapshot {
  stage: string
  games_done?: number
  games_total?: number
  cards_created?: number
  error?: string | null
}

export type PollOutcome = 'complete' | 'error' | 'timeout'

export interface PollResult {
  outcome: PollOutcome
  error?: string
}

export interface PollOptions {
  fetchFn?: (url: string) => Promise<Response>
  sleepFn?: (ms: number) => Promise<void>
  onProgress?: (snap: SyncProgressSnapshot) => void
  intervalMs?: number
  maxAttempts?: number
}

const DEFAULT_INTERVAL_MS = 1000
// 3 minutes at 1s cadence — long enough for a normal run, short enough
// that a zombie invocation gives up instead of polling forever.
const DEFAULT_MAX_ATTEMPTS = 180

export async function pollSyncUntilTerminal(
  syncId: string,
  opts: PollOptions = {},
): Promise<PollResult> {
  const fetchFn = opts.fetchFn ?? fetch
  const sleepFn = opts.sleepFn ?? ((ms) => new Promise((r) => setTimeout(r, ms)))
  const intervalMs = opts.intervalMs ?? DEFAULT_INTERVAL_MS
  const maxAttempts = opts.maxAttempts ?? DEFAULT_MAX_ATTEMPTS
  const url = `/api/sync/progress?id=${encodeURIComponent(syncId)}`

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await sleepFn(intervalMs)
    try {
      const res = await fetchFn(url)
      if (!res.ok) continue
      const data = (await res.json()) as SyncProgressSnapshot
      opts.onProgress?.(data)
      if (data.stage === 'complete') return { outcome: 'complete' }
      if (data.stage === 'error') return { outcome: 'error', error: data.error ?? 'Sync failed' }
    } catch {
      // Transient network error — keep polling.
    }
  }

  return { outcome: 'timeout' }
}
