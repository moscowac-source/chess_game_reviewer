import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { getSessionUser } from '@/lib/supabase-server'

interface AccuracyDeps {
  db?: SupabaseClient
  authFn?: () => Promise<{ id: string } | null>
  now?: () => Date
}

const DAY_MS = 24 * 60 * 60 * 1000

export async function GET(req: Request, deps: AccuracyDeps = {}) {
  const db = deps.db ?? supabase
  const authFn = deps.authFn ?? getSessionUser
  const now = deps.now ?? (() => new Date())

  const user = await authFn()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const daysParam = url.searchParams.get('days')
  let days = 7
  if (daysParam !== null) {
    const parsed = Number(daysParam)
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 30) {
      return NextResponse.json({ error: 'Invalid days parameter' }, { status: 400 })
    }
    days = parsed
  }

  const cutoff = new Date(now().getTime() - days * DAY_MS).toISOString()

  const { data, error } = await db
    .from('review_log')
    .select('rating, reviewed_at')
    .eq('user_id', user.id)
    .gte('reviewed_at', cutoff)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = (data ?? []) as { rating: string }[]
  const totalReviews = rows.length
  if (totalReviews === 0) {
    return NextResponse.json({ accuracy: null, totalReviews: 0 })
  }

  const correct = rows.filter((r) => r.rating === 'good' || r.rating === 'easy').length
  const accuracy = Math.round((correct / totalReviews) * 100)

  return NextResponse.json({ accuracy, totalReviews })
}
