import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchGames } from './chess-com/client'
import { parseGame, parsePgnHeaders, type PgnHeaders } from './game-parser'
import { analyzeGame, type UciEngine } from './stockfish-analyzer'
import { generateCards } from './card-generator'

export interface SyncResult {
  gamesProcessed: number
  cardsCreated: number
  errors: string[]
}

export type SyncProgressStage = 'queued' | 'fetching' | 'analyzing' | 'complete' | 'error'

export interface SyncProgress {
  stage: SyncProgressStage
  gamesProcessed: number
  gamesTotal: number
  cardsCreated: number
}

export interface SyncLogger {
  logStart(mode: 'historical' | 'incremental'): Promise<string>
  logComplete(id: string, result: SyncResult): Promise<void>
}

export interface SyncOptions {
  username: string
  userId: string
  db: SupabaseClient
  gamesFetcher?: (username: string, mode: 'historical' | 'incremental') => Promise<string[]>
  engineFactory?: () => UciEngine
  syncLogger?: SyncLogger
  onProgress?: (progress: SyncProgress) => Promise<void> | void
}

async function ensureGameRow(
  db: SupabaseClient,
  userId: string,
  pgn: string,
  headers: PgnHeaders,
): Promise<string | null> {
  if (headers.url) {
    const { data: existing } = await db
      .from('games')
      .select('id')
      .eq('user_id', userId)
      .eq('url', headers.url)
      .maybeSingle()
    if (existing?.id) return existing.id
  }

  const { data: inserted, error } = await db
    .from('games')
    .insert({
      user_id: userId,
      pgn,
      source: 'chess.com',
      played_at: headers.playedAt ?? new Date().toISOString(),
      white: headers.white,
      black: headers.black,
      result: headers.result,
      url: headers.url,
      eco: headers.eco,
    })
    .select('id')
    .single()

  if (error) throw error
  return inserted?.id ?? null
}

export async function runSync(
  mode: 'historical' | 'incremental',
  options: SyncOptions,
): Promise<SyncResult> {
  const { username, userId, db, gamesFetcher, engineFactory, syncLogger, onProgress } = options

  const logId = await syncLogger?.logStart(mode)

  const fetcher = gamesFetcher ?? ((u, m) => fetchGames(u, m))
  await onProgress?.({ stage: 'fetching', gamesProcessed: 0, gamesTotal: 0, cardsCreated: 0 })
  const pgns = await fetcher(username, mode)

  let gamesProcessed = 0
  let cardsCreated = 0
  const errors: string[] = []

  await onProgress?.({
    stage: 'analyzing',
    gamesProcessed: 0,
    gamesTotal: pgns.length,
    cardsCreated: 0,
  })

  for (const pgn of pgns) {
    try {
      const headers = parsePgnHeaders(pgn)
      const positions = parseGame(pgn)
      const gameId = await ensureGameRow(db, userId, pgn, headers)
      const analyses = await analyzeGame(positions, engineFactory)
      const result = await generateCards(analyses, db, gameId)
      gamesProcessed++
      cardsCreated += result.created
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err))
    }

    await onProgress?.({
      stage: 'analyzing',
      gamesProcessed,
      gamesTotal: pgns.length,
      cardsCreated,
    })
  }

  const syncResult = { gamesProcessed, cardsCreated, errors }

  if (logId) {
    await syncLogger?.logComplete(logId, syncResult)
  }

  await onProgress?.({
    stage: errors.length > 0 && gamesProcessed === 0 ? 'error' : 'complete',
    gamesProcessed,
    gamesTotal: pgns.length,
    cardsCreated,
  })

  return syncResult
}
