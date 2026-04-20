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
  const { username, userId, db, gamesFetcher, engineFactory, syncLogger } = options

  const logId = await syncLogger?.logStart(mode)

  const fetcher = gamesFetcher ?? ((u, m) => fetchGames(u, m))
  const pgns = await fetcher(username, mode)

  let gamesProcessed = 0
  let cardsCreated = 0
  const errors: string[] = []

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
  }

  const syncResult = { gamesProcessed, cardsCreated, errors }

  if (logId) {
    await syncLogger?.logComplete(logId, syncResult)
  }

  return syncResult
}
