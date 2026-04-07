import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchGames } from './chess-com/client'
import { parseGame } from './game-parser'
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
  db: SupabaseClient
  gamesFetcher?: (username: string, mode: 'historical' | 'incremental') => Promise<string[]>
  engineFactory?: () => UciEngine
  syncLogger?: SyncLogger
}

export async function runSync(
  mode: 'historical' | 'incremental',
  options: SyncOptions,
): Promise<SyncResult> {
  const { username, db, gamesFetcher, engineFactory, syncLogger } = options

  const logId = await syncLogger?.logStart(mode)

  const fetcher = gamesFetcher ?? ((u, m) => fetchGames(u, m))
  const pgns = await fetcher(username, mode)

  let gamesProcessed = 0
  let cardsCreated = 0
  const errors: string[] = []

  for (const pgn of pgns) {
    try {
      const positions = parseGame(pgn)
      const analyses = await analyzeGame(positions, engineFactory)
      const result = await generateCards(analyses, db)
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
