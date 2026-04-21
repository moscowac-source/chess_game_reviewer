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

/**
 * Fine-grained audit step. `step` is a short kebab-case identifier so the UI
 * can filter/group without parsing free-form strings.
 */
export type SyncStep =
  | 'fetch-archives-start'
  | 'fetch-archives-end'
  | 'sync-start'
  | 'sync-end'
  | 'fetch'
  | 'parse-headers'
  | 'parse-positions'
  | 'ensure-game-row'
  | 'analyze'
  | 'generate-cards'

export type SyncStepStatus = 'ok' | 'error' | 'skipped'

export interface SyncStepEvent {
  step: SyncStep
  status: SyncStepStatus
  gameUrl?: string | null
  gameIndex?: number | null
  durationMs?: number | null
  error?: string | null
  errorCode?: string | null
  details?: Record<string, unknown> | null
}

/**
 * Writes one audit row per call. Failures should NOT be swallowed — if the
 * logger itself can't persist a row, surface the error to the caller so the
 * sync fails loudly rather than silently losing observability.
 */
export type StepLogger = (event: SyncStepEvent) => Promise<void>

export interface SyncOptions {
  username: string
  userId: string
  db: SupabaseClient
  gamesFetcher?: (username: string, mode: 'historical' | 'incremental') => Promise<string[]>
  engineFactory?: () => UciEngine
  syncLogger?: SyncLogger
  onProgress?: (progress: SyncProgress) => Promise<void> | void
  stepLogger?: StepLogger
}

/**
 * Serialize an unknown thrown value into `{ message, code, details }` so
 * sync_step_log rows carry structured info that's actually useful when
 * debugging — not a `[object Object]` blob. Supabase surfaces DB errors as
 * plain objects (`{ message, code, details, hint }`) rather than `Error`
 * instances, which is why this split exists.
 */
export interface FormattedError {
  message: string
  code: string | null
  details: Record<string, unknown> | null
}

export function formatErrorStructured(err: unknown): FormattedError {
  if (err instanceof Error) {
    return { message: err.message, code: null, details: null }
  }
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>
    const message =
      typeof e.message === 'string' && e.message.length > 0
        ? e.message
        : safeStringify(err)
    const code = typeof e.code === 'string' ? e.code : null
    const details: Record<string, unknown> = {}
    for (const key of ['details', 'hint', 'status', 'statusText']) {
      if (e[key] !== undefined) details[key] = e[key]
    }
    return {
      message,
      code,
      details: Object.keys(details).length > 0 ? details : null,
    }
  }
  return { message: String(err), code: null, details: null }
}

/** Legacy one-line form — preserved so sync_log.error keeps the same shape. */
function formatError(err: unknown): string {
  const { message, code, details } = formatErrorStructured(err)
  const parts = [message]
  if (code) parts.push(`code=${code}`)
  if (details?.details) parts.push(`details=${String(details.details)}`)
  if (details?.hint) parts.push(`hint=${String(details.hint)}`)
  return parts.join(' · ')
}

function safeStringify(v: unknown): string {
  try { return JSON.stringify(v) } catch { return '[unserialisable]' }
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

/**
 * Runs `fn`, emits exactly one step-log row describing the outcome, and
 * returns the value (or rethrows the original error). Timing is measured in
 * whole milliseconds.
 */
async function runStep<T>(
  stepLogger: StepLogger | undefined,
  meta: { step: SyncStep; gameUrl?: string | null; gameIndex?: number | null; detailsOnOk?: Record<string, unknown> },
  fn: () => Promise<T> | T,
): Promise<T> {
  const start = Date.now()
  try {
    const value = await fn()
    if (stepLogger) {
      await stepLogger({
        step: meta.step,
        status: 'ok',
        gameUrl: meta.gameUrl ?? null,
        gameIndex: meta.gameIndex ?? null,
        durationMs: Date.now() - start,
        details: meta.detailsOnOk ?? null,
      })
    }
    return value
  } catch (err) {
    if (stepLogger) {
      const { message, code, details } = formatErrorStructured(err)
      await stepLogger({
        step: meta.step,
        status: 'error',
        gameUrl: meta.gameUrl ?? null,
        gameIndex: meta.gameIndex ?? null,
        durationMs: Date.now() - start,
        error: message,
        errorCode: code,
        details,
      })
    }
    throw err
  }
}

export async function runSync(
  mode: 'historical' | 'incremental',
  options: SyncOptions,
): Promise<SyncResult> {
  const { username, userId, db, gamesFetcher, engineFactory, syncLogger, onProgress, stepLogger } = options

  const logId = await syncLogger?.logStart(mode)

  if (stepLogger) {
    await stepLogger({ step: 'sync-start', status: 'ok', details: { mode, username, userId } })
  }

  const fetcher = gamesFetcher ?? ((u, m) => fetchGames(u, m))
  await onProgress?.({ stage: 'fetching', gamesProcessed: 0, gamesTotal: 0, cardsCreated: 0 })

  if (stepLogger) {
    await stepLogger({ step: 'fetch-archives-start', status: 'ok', details: { mode } })
  }

  let pgns: string[]
  try {
    pgns = await fetcher(username, mode)
  } catch (err) {
    if (stepLogger) {
      const { message, code, details } = formatErrorStructured(err)
      await stepLogger({
        step: 'fetch-archives-end',
        status: 'error',
        error: message,
        errorCode: code,
        details,
      })
    }
    throw err
  }

  if (stepLogger) {
    await stepLogger({
      step: 'fetch-archives-end',
      status: 'ok',
      details: { count: pgns.length },
    })
  }

  let gamesProcessed = 0
  let cardsCreated = 0
  const errors: string[] = []

  await onProgress?.({
    stage: 'analyzing',
    gamesProcessed: 0,
    gamesTotal: pgns.length,
    cardsCreated: 0,
  })

  for (let gameIndex = 0; gameIndex < pgns.length; gameIndex++) {
    const pgn = pgns[gameIndex]
    let gameUrl: string | null = null
    try {
      const headers = await runStep(
        stepLogger,
        { step: 'parse-headers', gameIndex },
        () => parsePgnHeaders(pgn),
      )
      gameUrl = headers.url ?? null

      const positions = await runStep(
        stepLogger,
        { step: 'parse-positions', gameUrl, gameIndex },
        () => parseGame(pgn),
      )

      const gameId = await runStep(
        stepLogger,
        { step: 'ensure-game-row', gameUrl, gameIndex },
        () => ensureGameRow(db, userId, pgn, headers),
      )

      const analyses = await runStep(
        stepLogger,
        {
          step: 'analyze',
          gameUrl,
          gameIndex,
          detailsOnOk: { positions: positions.length },
        },
        () => analyzeGame(positions, engineFactory),
      )

      const result = await runStep(
        stepLogger,
        { step: 'generate-cards', gameUrl, gameIndex },
        () => generateCards(analyses, db, gameId),
      )

      gamesProcessed++
      cardsCreated += result.created
    } catch (err) {
      errors.push(formatError(err))
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

  if (stepLogger) {
    await stepLogger({
      step: 'sync-end',
      status: errors.length > 0 && gamesProcessed === 0 ? 'error' : 'ok',
      details: {
        gamesProcessed,
        cardsCreated,
        gamesTotal: pgns.length,
        errorCount: errors.length,
      },
    })
  }

  await onProgress?.({
    stage: errors.length > 0 && gamesProcessed === 0 ? 'error' : 'complete',
    gamesProcessed,
    gamesTotal: pgns.length,
    cardsCreated,
  })

  return syncResult
}
