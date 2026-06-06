'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useMe } from '@/hooks/dashboard'

function getInitial(me: {
  first_name: string | null
  last_name: string | null
  username: string | null
  email: string | null
} | null): string {
  if (me?.first_name) return me.first_name[0].toUpperCase()
  if (me?.username) return me.username[0].toUpperCase()
  if (me?.email) return me.email[0].toUpperCase()
  return '·'
}

function getLabel(me: {
  first_name: string | null
  last_name: string | null
  username: string | null
  email: string | null
} | null): string {
  if (me?.first_name) {
    return me.last_name ? `${me.first_name} ${me.last_name}` : me.first_name
  }
  if (me?.username) return me.username
  if (me?.email) return me.email
  return ''
}

export function Header({ title }: { title?: string }) {
  const router = useRouter()
  const { data: me } = useMe()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setOpen(false)
    router.push('/login')
    router.refresh()
  }

  const initial = getInitial(me)
  const label = getLabel(me)

  return (
    <header className="flex items-center justify-between px-6 py-3.5 border-b border-[var(--line)] bg-[var(--bg)] sticky top-0 z-10">
      {/* Page title or breadcrumb */}
      <div className="pl-10 md:pl-0">
        {title && (
          <span className="font-[var(--mono)] text-[11px] tracking-[0.14em] uppercase text-[var(--muted)]">
            {title}
          </span>
        )}
      </div>

      {/* User menu */}
      <div ref={menuRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          data-testid="user-avatar"
          className="flex items-center gap-2.5 cursor-pointer"
        >
          {label && (
            <span className="text-[13px] text-[var(--muted)] font-[var(--sans)] hidden sm:block">
              {label}
            </span>
          )}
          {/* Avatar circle */}
          <span
            className="w-8 h-8 rounded-full bg-[var(--ink)] text-[var(--bg)] grid place-items-center font-[var(--serif)] text-[13px] shrink-0"
            aria-hidden
          >
            {initial}
          </span>
        </button>

        {open && (
          <div
            role="menu"
            className="absolute right-0 top-[calc(100%+8px)] min-w-[180px] bg-[var(--bg)] border border-[var(--line)] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.2)] z-20"
          >
            <button
              type="button"
              role="menuitem"
              className="block w-full text-left px-3.5 py-2.5 text-[13px] font-[var(--sans)] text-[var(--ink)] hover:bg-[var(--bg-2)] transition-colors"
              onClick={() => { setOpen(false); router.push('/settings') }}
            >
              Settings
            </button>
            <button
              type="button"
              role="menuitem"
              className="block w-full text-left px-3.5 py-2.5 text-[13px] font-[var(--sans)] text-[var(--ink)] hover:bg-[var(--bg-2)] transition-colors"
              onClick={() => { setOpen(false); router.push('/sync') }}
            >
              Sync status
            </button>
            <div className="h-px bg-[var(--line)]" />
            <button
              type="button"
              role="menuitem"
              data-testid="logout-button"
              className="block w-full text-left px-3.5 py-2.5 text-[13px] font-[var(--sans)] text-[var(--ink)] hover:bg-[var(--bg-2)] transition-colors"
              onClick={handleLogout}
            >
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
