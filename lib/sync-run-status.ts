import type { SyncLog } from '@/types/database'

export type StatusTone = 'success' | 'error' | 'warn'

export interface SyncRunStatus {
  label: string
  tone: StatusTone
}

export function syncRunStatusLabel(log: SyncLog): SyncRunStatus {
  if (log.error) return { label: log.error, tone: 'error' }
  if (log.stage === 'complete') return { label: 'All stages green', tone: 'success' }
  if (log.stage === 'error') return { label: 'Sync failed', tone: 'error' }
  return { label: 'Run did not finish', tone: 'warn' }
}
