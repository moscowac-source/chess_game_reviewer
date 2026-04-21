import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSessionUser } from '@/lib/supabase-server'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: Request, ctx: Ctx) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await ctx.params

  // Verify the sync_log row belongs to this user — RLS will also enforce this,
  // but a 404 here keeps error messages honest for non-owners.
  const { data: parent } = await supabase
    .from('sync_log')
    .select('id, user_id, mode, started_at, completed_at, error, games_processed, cards_created, games_total, stage')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!parent) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: steps, error } = await supabase
    .from('sync_step_log')
    .select('id, game_url, game_index, step, status, duration_ms, error, error_code, details, created_at')
    .eq('sync_log_id', id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ sync: parent, steps: steps ?? [] })
}
