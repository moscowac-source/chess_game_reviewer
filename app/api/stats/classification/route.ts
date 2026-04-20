import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { getSessionUser } from '@/lib/supabase-server'

interface ClassificationDeps {
  db?: SupabaseClient
  authFn?: () => Promise<{ id: string } | null>
}

export async function GET(_req: Request, deps: ClassificationDeps = {}) {
  const db = deps.db ?? supabase
  const authFn = deps.authFn ?? getSessionUser

  const user = await authFn()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const counts = { blunder: 0, mistake: 0, great: 0, brilliant: 0 }

  const { data: stateRows, error: stateError } = await db
    .from('card_state')
    .select('card_id')
    .eq('user_id', user.id)

  if (stateError) {
    return NextResponse.json({ error: stateError.message }, { status: 500 })
  }

  const cardIds = (stateRows ?? []).map((r: { card_id: string }) => r.card_id)
  if (cardIds.length === 0) {
    return NextResponse.json(counts)
  }

  const { data: cardRows, error: cardError } = await db
    .from('cards')
    .select('classification')
    .in('id', cardIds)

  if (cardError) {
    return NextResponse.json({ error: cardError.message }, { status: 500 })
  }

  for (const row of (cardRows ?? []) as { classification: string }[]) {
    if (row.classification in counts) {
      counts[row.classification as keyof typeof counts] += 1
    }
  }

  return NextResponse.json(counts)
}
