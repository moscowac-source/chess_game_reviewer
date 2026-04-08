'use client'

import { useEffect, useState } from 'react'
import { SyncLog } from '@/types/database'

interface SyncStatusProps {
  fetcher?: typeof fetch
}

export default function SyncStatus({ fetcher = fetch }: SyncStatusProps) {
  const [status, setStatus] = useState<SyncLog | null | undefined>(undefined)
  const [syncing, setSyncing] = useState(false)

  async function fetchStatus() {
    const res = await fetcher('/api/sync/status')
    const data = await res.json()
    setStatus(data)
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  async function handleSyncNow() {
    setSyncing(true)
    await fetcher('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'incremental' }),
    })
    await fetchStatus()
    setSyncing(false)
  }

  if (status === undefined) return null

  return (
    <div data-testid="sync-status">
      {status === null ? (
        <span data-testid="sync-never">Never synced</span>
      ) : (
        <div>
          <span data-testid="sync-time">{new Date(status.completed_at ?? status.started_at).toLocaleString()}</span>
          <span data-testid="sync-games">{status.games_processed} games</span>
          <span data-testid="sync-cards">{status.cards_created} cards</span>
          {status.error && (
            <span data-testid="sync-error">{status.error}</span>
          )}
        </div>
      )}
      <button
        data-testid="sync-now-button"
        onClick={handleSyncNow}
        disabled={syncing}
      >
        {syncing ? <span data-testid="sync-loading">Syncing…</span> : 'Sync Now'}
      </button>
    </div>
  )
}
