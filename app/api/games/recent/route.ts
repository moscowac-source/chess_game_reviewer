import { NextResponse } from 'next/server'
import { withAuthedRoute } from '@/lib/with-authed-route'
import { apiError } from '@/lib/api-response'
import { getUserCards } from '@/lib/user-cards'

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

type Outcome = 'win' | 'loss' | 'draw' | 'unknown'

function deriveOpponentAndOutcome(
  white: string | null,
  black: string | null,
  result: string | null,
  username: string | null,
): { opponent: string | null; outcome: Outcome } {
  if (result === '1/2-1/2') {
    // Still try to identify opponent
    const u = username?.toLowerCase() ?? null
    if (u && white && white.toLowerCase() === u) return { opponent: black, outcome: 'draw' }
    if (u && black && black.toLowerCase() === u) return { opponent: white, outcome: 'draw' }
    return { opponent: null, outcome: 'draw' }
  }
  const u = username?.toLowerCase() ?? null
  let userSide: 'white' | 'black' | null = null
  if (u && white && white.toLowerCase() === u) userSide = 'white'
  else if (u && black && black.toLowerCase() === u) userSide = 'black'

  if (!userSide) return { opponent: null, outcome: 'unknown' }

  const opponent = userSide === 'white' ? black : white
  if (result === '1-0') return { opponent, outcome: userSide === 'white' ? 'win' : 'loss' }
  if (result === '0-1') return { opponent, outcome: userSide === 'black' ? 'win' : 'loss' }
  return { opponent, outcome: 'unknown' }
}

export const GET = withAuthedRoute(async ({ req, db, user }) => {
  const { searchParams } = new URL(req.url)
  const rawLimit = searchParams.get('limit')
  let limit = DEFAULT_LIMIT
  if (rawLimit !== null) {
    if (!/^-?\d+$/.test(rawLimit)) {
      return apiError(400, 'Invalid limit')
    }
    const parsed = parseInt(rawLimit, 10)
    if (parsed < 1 || parsed > MAX_LIMIT) {
      return apiError(400, 'Invalid limit')
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
    return apiError(500, gamesError.message)
  }

  const gameList = games ?? []
  if (gameList.length === 0) return NextResponse.json([])

  const { data: userRow } = await db
    .from('users')
    .select('chess_com_username')
    .eq('id', user.id)
    .single()
  const username = (userRow as { chess_com_username: string | null } | null)?.chess_com_username ?? null

  const countByGame = new Map<string, number>()
  for (const g of gameList) countByGame.set(g.id, 0)

  let cardRows: { id: string; game_id: string | null }[]
  try {
    cardRows = await getUserCards<{ id: string; game_id: string | null }>(db, user.id, {
      select: 'id, game_id',
    })
  } catch (err) {
    return apiError(500, err instanceof Error ? err.message : 'Failed to load cards')
  }

  for (const row of cardRows) {
    if (row.game_id && countByGame.has(row.game_id)) {
      countByGame.set(row.game_id, (countByGame.get(row.game_id) ?? 0) + 1)
    }
  }

  return NextResponse.json(
    gameList.map((g) => {
      const { opponent, outcome } = deriveOpponentAndOutcome(g.white, g.black, g.result, username)
      return { ...g, cardCount: countByGame.get(g.id) ?? 0, opponent, outcome }
    }),
  )
})
