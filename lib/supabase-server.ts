import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}

/** Returns the authenticated user from the session cookie, or null. */
export async function getSessionUser(): Promise<{ id: string } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user ? { id: user.id } : null
}

/** Returns the authenticated user plus their chess_com_username, or null. */
export async function getSessionUserWithUsername(
  db: Awaited<ReturnType<typeof createClient>>
): Promise<{ id: string; chess_com_username: string | null } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await db
    .from('users')
    .select('chess_com_username')
    .eq('id', user.id)
    .single()

  return { id: user.id, chess_com_username: data?.chess_com_username ?? null }
}
