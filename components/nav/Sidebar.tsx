'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Logo } from '@/components/ui'

const NAV_ITEMS = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        <rect x="1" y="1" width="6" height="6" fill="currentColor" rx="1" />
        <rect x="9" y="1" width="6" height="6" fill="currentColor" rx="1" />
        <rect x="1" y="9" width="6" height="6" fill="currentColor" rx="1" />
        <rect x="9" y="9" width="6" height="6" stroke="currentColor" strokeWidth="1.5" rx="1" />
      </svg>
    ),
  },
  {
    path: '/review',
    label: 'Puzzles',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        <rect x="1" y="1" width="6.5" height="6.5" fill="currentColor" rx="0.5" />
        <rect x="8.5" y="1" width="6.5" height="6.5" stroke="currentColor" strokeWidth="1.5" rx="0.5" />
        <rect x="1" y="8.5" width="6.5" height="6.5" stroke="currentColor" strokeWidth="1.5" rx="0.5" />
        <rect x="8.5" y="8.5" width="6.5" height="6.5" fill="currentColor" rx="0.5" />
      </svg>
    ),
  },
  {
    path: '/deck',
    label: 'Game Library',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        <rect x="2" y="4" width="12" height="9" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <path d="M5 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" stroke="currentColor" strokeWidth="1.5" />
        <path d="M5 8.5h6M5 11h4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      </svg>
    ),
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Mobile toggle button */}
      <button
        type="button"
        className="fixed top-4 left-4 z-50 md:hidden flex items-center justify-center w-9 h-9 border border-[var(--line)] bg-[var(--bg)] text-[var(--ink)]"
        onClick={() => setMobileOpen((v) => !v)}
        aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
      >
        {mobileOpen ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path d="M1 3h12M1 7h12M1 11h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        )}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={[
          'fixed top-0 left-0 h-full z-40 flex flex-col',
          'w-56 border-r border-[var(--line)] bg-[var(--bg)]',
          'transition-transform duration-200 ease-in-out',
          // Desktop: always visible
          'md:translate-x-0 md:static md:flex',
          // Mobile: slide in/out
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        ].join(' ')}
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b border-[var(--line)]">
          <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
            <Logo size={18} />
          </Link>
        </div>

        {/* Nav links */}
        <nav className="flex-1 py-4 px-3 flex flex-col gap-0.5" aria-label="Main navigation">
          {NAV_ITEMS.map(({ path, label, icon }) => {
            const active = pathname.startsWith(path)
            return (
              <Link
                key={path}
                href={path}
                onClick={() => setMobileOpen(false)}
                className={[
                  'flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius)]',
                  'font-[var(--sans)] text-[13px] font-medium',
                  'transition-colors duration-100',
                  active
                    ? 'bg-[var(--ink)] text-[var(--bg)]'
                    : 'text-[var(--ink-2)] hover:bg-[var(--bg-2)] hover:text-[var(--ink)]',
                ].join(' ')}
                aria-current={active ? 'page' : undefined}
              >
                <span className={active ? 'opacity-100' : 'opacity-60'}>{icon}</span>
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Bottom label */}
        <div className="px-5 py-4 border-t border-[var(--line)]">
          <span
            className="font-[var(--mono)] text-[10px] tracking-widest uppercase text-[var(--muted)]"
          >
            Pattern · v1.0
          </span>
        </div>
      </aside>
    </>
  )
}
