'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

// Routes that use the shell (sidebar + header) layout
const APP_PATHS = ['/dashboard', '/review', '/deck', '/sync', '/settings', '/onboard']

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isAppRoute = APP_PATHS.some((p) => pathname.startsWith(p))

  if (!isAppRoute) {
    return <>{children}</>
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto relative z-[1]">
          {children}
        </main>
      </div>
    </div>
  )
}
