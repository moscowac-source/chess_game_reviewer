'use client'

import { useFetchJson, type FetchResult } from './use-fetch-json'
import type { ReviewSession } from '@/lib/review-session-manager'
import type { SyncLog } from '@/types/database'

export interface ModeCounts {
  standard: number
  recent: number
  mistakes: number
  brilliancies: number
}

export interface ClassificationCounts {
  blunder: number
  mistake: number
  great: number
  brilliant: number
}

export interface RecentGame {
  id: string
  played_at: string
  white: string | null
  black: string | null
  result: string | null
  url: string | null
  eco: string | null
  opponent: string | null
  outcome: 'win' | 'loss' | 'draw' | 'unknown'
  cardCount: number
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null

function validateCounts(raw: unknown): ModeCounts | null {
  if (!isObj(raw)) return null
  const { standard, recent, mistakes, brilliancies } = raw
  if (
    typeof standard !== 'number' ||
    typeof recent !== 'number' ||
    typeof mistakes !== 'number' ||
    typeof brilliancies !== 'number'
  ) return null
  return { standard, recent, mistakes, brilliancies }
}

function validateSession(raw: unknown): ReviewSession | null {
  if (!isObj(raw)) return null
  if (!Array.isArray(raw.cards)) return null
  if (typeof raw.totalDue !== 'number') return null
  if (typeof raw.newCardsToday !== 'number') return null
  return raw as unknown as ReviewSession
}

function validateStreak(raw: unknown): { streak: number } | null {
  if (!isObj(raw) || typeof raw.streak !== 'number') return null
  return { streak: raw.streak }
}

function validateAccuracy(
  raw: unknown,
): { accuracy: number | null; totalReviews: number } | null {
  if (!isObj(raw)) return null
  const { accuracy, totalReviews } = raw
  if (accuracy !== null && typeof accuracy !== 'number') return null
  if (typeof totalReviews !== 'number') return null
  return { accuracy: accuracy as number | null, totalReviews }
}

function validateClassification(raw: unknown): ClassificationCounts | null {
  if (!isObj(raw)) return null
  const { blunder, mistake, great, brilliant } = raw
  if (
    typeof blunder !== 'number' ||
    typeof mistake !== 'number' ||
    typeof great !== 'number' ||
    typeof brilliant !== 'number'
  ) return null
  return { blunder, mistake, great, brilliant }
}

function validateRecentGames(raw: unknown): RecentGame[] | null {
  if (!Array.isArray(raw)) return null
  return raw as RecentGame[]
}

function validateSyncStatus(raw: unknown): { log: SyncLog | null } | null {
  if (raw === null) return { log: null }
  if (!isObj(raw)) return null
  return { log: raw as unknown as SyncLog }
}

function validateSyncHistory(raw: unknown): SyncLog[] | null {
  if (!Array.isArray(raw)) return null
  return raw as SyncLog[]
}

function validateUserSettings(raw: unknown): { daily_new_limit: number } | null {
  if (!isObj(raw) || typeof raw.daily_new_limit !== 'number') return null
  return { daily_new_limit: raw.daily_new_limit }
}

export function useCounts(): FetchResult<ModeCounts> {
  return useFetchJson('/api/review/counts', validateCounts)
}

export function useReviewSession(mode: string): FetchResult<ReviewSession> {
  return useFetchJson(`/api/review/session?mode=${mode}`, validateSession)
}

export function useStreak(): FetchResult<{ streak: number }> {
  return useFetchJson('/api/stats/streak', validateStreak)
}

export function useAccuracy(
  days: number,
): FetchResult<{ accuracy: number | null; totalReviews: number }> {
  return useFetchJson(`/api/stats/accuracy?days=${days}`, validateAccuracy)
}

export function useClassification(): FetchResult<ClassificationCounts> {
  return useFetchJson('/api/stats/classification', validateClassification)
}

export function useRecentGames(limit: number): FetchResult<RecentGame[]> {
  return useFetchJson(`/api/games/recent?limit=${limit}`, validateRecentGames)
}

export function useSyncStatus(): FetchResult<{ log: SyncLog | null }> {
  return useFetchJson('/api/sync/status', validateSyncStatus)
}

export function useSyncHistory(): FetchResult<SyncLog[]> {
  return useFetchJson('/api/sync/history', validateSyncHistory)
}

export function useUserSettings(): FetchResult<{ daily_new_limit: number }> {
  return useFetchJson('/api/user/settings', validateUserSettings)
}
