import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { getSessionUser } from '@/lib/supabase-server'

interface RecentDeps {
  db?: SupabaseClient
  authFn?: () => Promise<{ id: string } | null>
}

interface GameRow {
  id: string
  played_at: string
  white: string | null
  black: string | null
  result: string | null
  url: string | null
  eco: string | null
}

const DEFAULT_LIMIT = 5
const MAX_LIMIT = 10

export async function GET(req: Request, deps: RecentDeps = {}) {
  const db = deps.db ?? supabase
  const authFn = deps.authFn ?? getSessionUser

  const user = await authFn()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const rawLimit = searchParams.get('limit')
  let limit = DEFAULT_LIMIT
  if (rawLimit !== null) {
    if (!/^-?\d+$/.test(rawLimit)) {
      return NextResponse.json({ error: 'Invalid limit' }, { status: 400 })
    }
    const parsed = parseInt(rawLimit, 10)
    if (parsed < 1 || parsed > MAX_LIMIT) {
      return NextResponse.json({ error: 'Invalid limit' }, { status: 400 })
    }
    limit = parsed
  }

  const { data: games, error: gamesError } = (await db
    .from('games')
    .select('id, played_at, white, black, result, url, eco')
    .eq('user_id', user.id)
    .order('played_at', { ascending: false })
    .limit(limit)) as { data: GameRow[] | null; error: { message: string } | null }

  if (gamesError) {
    return NextResponse.json({ error: gamesError.message }, { status: 500 })
  }

  const gameList = games ?? []
  if (gameList.length === 0) return NextResponse.json([])

  const { data: stateRows, error: stateError } = await db
    .from('card_state')
    .select('card_id')
    .eq('user_id', user.id)

  if (stateError) {
    return NextResponse.json({ error: stateError.message }, { status: 500 })
  }

  const userCardIds = (stateRows ?? []).map((r: { card_id: string }) => r.card_id)

  const countByGame = new Map<string, number>()
  for (const g of gameList) countByGame.set(g.id, 0)

  if (userCardIds.length > 0) {
    const { data: cardRows, error: cardsError } = await db
      .from('cards')
      .select('id, game_id')
      .in('id', userCardIds)

    if (cardsError) {
      return NextResponse.json({ error: cardsError.message }, { status: 500 })
    }

    for (const row of (cardRows ?? []) as { id: string; game_id: string | null }[]) {
      if (row.game_id && countByGame.has(row.game_id)) {
        countByGame.set(row.game_id, (countByGame.get(row.game_id) ?? 0) + 1)
      }
    }
  }

  return NextResponse.json(
    gameList.map((g) => ({ ...g, cardCount: countByGame.get(g.id) ?? 0 })),
  )
}
