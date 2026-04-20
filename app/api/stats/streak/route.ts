import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { getSessionUser } from '@/lib/supabase-server'
import { computeStreak } from '@/lib/streak'

interface StreakDeps {
  db?: SupabaseClient
  authFn?: () => Promise<{ id: string } | null>
  now?: () => Date
}

export async function GET(_req: Request, deps: StreakDeps = {}) {
  const db = deps.db ?? supabase
  const authFn = deps.authFn ?? getSessionUser
  const now = deps.now ?? (() => new Date())

  const user = await authFn()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await db
    .from('review_log')
    .select('reviewed_at')
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const dates = (data ?? []).map((row: { reviewed_at: string }) => new Date(row.reviewed_at))
  const streak = computeStreak(dates, now())

  return NextResponse.json({ streak })
}
