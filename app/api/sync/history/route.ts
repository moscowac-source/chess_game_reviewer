import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSessionUser } from '@/lib/supabase-server'

export async function GET() {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('sync_log')
    .select('*')
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })
    .limit(7)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}
