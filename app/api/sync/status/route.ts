import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { getSessionUser } from '@/lib/supabase-server'

interface StatusDeps {
  db?: SupabaseClient
  authFn?: () => Promise<{ id: string } | null>
}

export async function GET(_req: Request, deps: StatusDeps = {}) {
  const db = deps.db ?? supabase
  const authFn = deps.authFn ?? getSessionUser

  const user = await authFn()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await db
    .from('sync_log')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const entry = data && data.length > 0 ? data[0] : null
  return NextResponse.json(entry)
}
