import type { SyncLog } from '@/types/database'

export type StatusTone = 'success' | 'error' | 'warn' | 'info'

export interface SyncRunStatus {
  label: string
  tone: StatusTone
}

// Generous threshold: real Stockfish analysis is ~30-40s/game, so a 16-game
// run can legitimately take 10+ minutes. Only flag as stuck after this.
export const RUNNING_GRACE_MS = 30 * 60 * 1000

export function syncRunStatusLabel(log: SyncLog, now: number = Date.now()): SyncRunStatus {
  if (log.error) return { label: log.error, tone: 'error' }
  if (log.stage === 'complete') return { label: 'All stages green', tone: 'success' }
  if (log.stage === 'error') return { label: 'Sync failed', tone: 'error' }

  const age = now - new Date(log.started_at).getTime()
  if (age < RUNNING_GRACE_MS) {
    return { label: 'Still running…', tone: 'info' }
  }
  return { label: 'Run did not finish', tone: 'warn' }
}
