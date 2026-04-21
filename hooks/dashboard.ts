'use client'

import { useEffect, useState } from 'react'
import { useFetchJson, type FetchResult } from './use-fetch-json'
import type { ReviewSession, SessionCard } from '@/lib/review-session-manager'
import type { CardClassification, SyncLog } from '@/types/database'

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

function validateUserSettings(
  raw: unknown,
): {
  daily_new_limit: number
  first_name: string | null
  last_name: string | null
  chess_com_username: string | null
} | null {
  if (!isObj(raw) || typeof raw.daily_new_limit !== 'number') return null
  const { first_name, last_name, chess_com_username } = raw
  if (first_name !== null && typeof first_name !== 'string') return null
  if (last_name !== null && typeof last_name !== 'string') return null
  if (chess_com_username !== null && typeof chess_com_username !== 'string') return null
  return {
    daily_new_limit: raw.daily_new_limit,
    first_name: first_name as string | null,
    last_name: last_name as string | null,
    chess_com_username: chess_com_username as string | null,
  }
}

export interface DeckItem {
  id: string
  fen: string
  classification: string
  theme: string | null
  created_at: string
  due_date: string
  review_count: number
  stability: number
}

export interface DeckResponse {
  items: DeckItem[]
  total: number
}

function validateDeckItem(raw: unknown): DeckItem | null {
  if (!isObj(raw)) return null
  const { id, fen, classification, theme, created_at, due_date, review_count, stability } = raw
  if (typeof id !== 'string') return null
  if (typeof fen !== 'string') return null
  if (typeof classification !== 'string') return null
  if (theme !== null && typeof theme !== 'string') return null
  if (typeof created_at !== 'string') return null
  if (typeof due_date !== 'string') return null
  if (typeof review_count !== 'number') return null
  if (typeof stability !== 'number') return null
  return {
    id, fen, classification,
    theme: theme as string | null,
    created_at, due_date, review_count, stability,
  }
}

function validateDeck(raw: unknown): DeckResponse | null {
  if (!isObj(raw)) return null
  if (!Array.isArray(raw.items)) return null
  if (typeof raw.total !== 'number') return null
  const items: DeckItem[] = []
  for (const item of raw.items) {
    const v = validateDeckItem(item)
    if (!v) return null
    items.push(v)
  }
  return { items, total: raw.total }
}

export interface DeckParams {
  classification?: string
  theme?: string
  sort?: string
  limit?: number
  offset?: number
}

function buildDeckUrl(params: DeckParams): string {
  const qs = new URLSearchParams()
  if (params.classification) qs.set('classification', params.classification)
  if (params.theme) qs.set('theme', params.theme)
  if (params.sort) qs.set('sort', params.sort)
  if (params.limit !== undefined) qs.set('limit', String(params.limit))
  if (params.offset !== undefined) qs.set('offset', String(params.offset))
  const q = qs.toString()
  return q ? `/api/deck?${q}` : '/api/deck'
}

export function useDeck(params: DeckParams): FetchResult<DeckResponse> {
  return useFetchJson(buildDeckUrl(params), validateDeck)
}

export interface Me {
  email: string | null
  username: string | null
  first_name: string | null
  last_name: string | null
}

function validateMe(raw: unknown): Me | null {
  if (!isObj(raw)) return null
  const { email, username, first_name, last_name } = raw
  if (email !== null && typeof email !== 'string') return null
  if (username !== null && typeof username !== 'string') return null
  if (first_name !== null && typeof first_name !== 'string') return null
  if (last_name !== null && typeof last_name !== 'string') return null
  return {
    email: email as string | null,
    username: username as string | null,
    first_name: first_name as string | null,
    last_name: last_name as string | null,
  }
}

export function useCounts(): FetchResult<ModeCounts> {
  return useFetchJson('/api/review/counts', validateCounts)
}

export function useReviewSession(mode: string | null): FetchResult<ReviewSession> {
  const [data, setData] = useState<ReviewSession | null>(null)
  const [loading, setLoading] = useState(mode !== null)
  const [error, setError] = useState<Error | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (mode === null) {
      setData(null)
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    fetch(`/api/review/session?mode=${mode}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`Request failed (${r.status})`)
        return r.json()
      })
      .then((raw) => {
        if (cancelled) return
        const parsed = validateSession(raw)
        if (parsed === null) throw new Error('Unexpected response shape')
        setData(parsed)
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err : new Error(String(err)))
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [mode, tick])

  return { data, loading, error, refetch: () => setTick((t) => t + 1) }
}

const VALID_CLASSIFICATIONS = new Set<CardClassification>([
  'blunder', 'mistake', 'great', 'brilliant',
])

function validateSessionCard(raw: unknown): SessionCard | null {
  if (!isObj(raw)) return null
  const { cardId, fen, correctMove, classification, isNew, theme, note, cpl } = raw
  if (typeof cardId !== 'string') return null
  if (typeof fen !== 'string') return null
  if (typeof correctMove !== 'string') return null
  if (typeof classification !== 'string'
    || !VALID_CLASSIFICATIONS.has(classification as CardClassification)) return null
  if (typeof isNew !== 'boolean') return null
  if (theme !== null && typeof theme !== 'string') return null
  if (note !== null && typeof note !== 'string') return null
  if (cpl !== null && typeof cpl !== 'number') return null
  return {
    cardId, fen, correctMove,
    classification: classification as CardClassification,
    isNew,
    theme: theme as string | null,
    note: note as string | null,
    cpl: cpl as number | null,
  }
}

export function useReviewCard(cardId: string | null): FetchResult<SessionCard> {
  const [data, setData] = useState<SessionCard | null>(null)
  const [loading, setLoading] = useState(cardId !== null)
  const [error, setError] = useState<Error | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (cardId === null) {
      setData(null)
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    fetch(`/api/review/cards/${cardId}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`Request failed (${r.status})`)
        return r.json()
      })
      .then((raw) => {
        if (cancelled) return
        const parsed = validateSessionCard(raw)
        if (parsed === null) throw new Error('Unexpected response shape')
        setData(parsed)
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err : new Error(String(err)))
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [cardId, tick])

  return { data, loading, error, refetch: () => setTick((t) => t + 1) }
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

export function useUserSettings(): FetchResult<{
  daily_new_limit: number
  first_name: string | null
  last_name: string | null
  chess_com_username: string | null
}> {
  return useFetchJson('/api/user/settings', validateUserSettings)
}

export function useMe(): FetchResult<Me> {
  return useFetchJson('/api/me', validateMe)
}
