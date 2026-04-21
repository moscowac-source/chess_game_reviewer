'use client'

import { useState } from 'react'
import { Nav, Page, Button, Stat } from '@/components/ui'
import { useSyncStatus, useSyncHistory } from '@/hooks/dashboard'
import type { SyncLog } from '@/types/database'

export default function SyncPage() {
  const statusFetch = useSyncStatus()
  const historyFetch = useSyncHistory()
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [progressStage, setProgressStage] = useState<string | null>(null)
  const [progressDone, setProgressDone] = useState(0)
  const [progressTotal, setProgressTotal] = useState(0)

  const status: SyncLog | null | undefined = statusFetch.loading
    ? undefined
    : statusFetch.data?.log ?? null
  const history: SyncLog[] = historyFetch.data ?? []

  async function handleSyncNow() {
    setSyncing(true)
    setSyncError(null)
    setProgressStage('queued')
    setProgressDone(0)
    setProgressTotal(0)

    const res = await fetch('/api/sync/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'incremental' }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setSyncError(body.error ?? `Sync failed (${res.status})`)
      setSyncing(false)
      setProgressStage(null)
      return
    }
    const { sync_id } = await res.json()

    // Poll progress until terminal
    let terminal: 'complete' | 'error' | null = null
    while (terminal === null) {
      await new Promise((r) => setTimeout(r, 1000))
      try {
        const pr = await fetch(`/api/sync/progress?id=${encodeURIComponent(sync_id)}`)
        if (!pr.ok) continue
        const data = await pr.json()
        setProgressStage(data.stage ?? 'queued')
        setProgressDone(data.games_done ?? 0)
        setProgressTotal(data.games_total ?? 0)
        if (data.stage === 'complete') terminal = 'complete'
        else if (data.stage === 'error') {
          terminal = 'error'
          setSyncError(data.error ?? 'Sync failed')
        }
      } catch {
        // keep polling
      }
    }

    statusFetch.refetch()
    historyFetch.refetch()
    setSyncing(false)
    setProgressStage(null)
  }

  const lastRun = status
    ? new Date(status.completed_at ?? status.started_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : '—'

  return (
    <>
      <Nav />
      <Page wide>
        {/* Header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60,
          alignItems: 'end', paddingBottom: 28, borderBottom: '1px solid var(--line)',
        }}>
          <div>
            <div className="mono" style={{ color: 'var(--muted)', fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 14 }}>
              Sync pipeline · Chess.com → Parser → Stockfish → Cards
            </div>
            <h1 className="serif" style={{ fontSize: 56, letterSpacing: '-0.03em', margin: 0, lineHeight: 1, fontWeight: 400 }}>
              {status === null ? 'Never synced.' : status ? 'Everything in order.' : 'Loading…'}
            </h1>
            <p style={{ color: 'var(--ink-2)', lineHeight: 1.55, marginTop: 20, fontSize: 16, maxWidth: 540 }}>
              {status
                ? `Last run succeeded ${new Date(status.completed_at ?? status.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${lastRun}. Nightly job scheduled for 02:14 UTC.`
                : 'Run a historical import from the onboarding page first.'}
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12 }}>
            <Button size="lg" onClick={handleSyncNow} disabled={syncing}>
              {syncing ? 'Syncing…' : 'Sync now →'}
            </Button>
            {syncing && progressStage && (
              <div className="mono" style={{ color: 'var(--ink-2)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                {progressStage}
                {progressTotal > 0 && ` · ${progressDone} / ${progressTotal} games`}
              </div>
            )}
            {syncError && (
              <div style={{ color: 'var(--bad)', fontSize: 13 }}>{syncError}</div>
            )}
            <div className="mono" style={{ color: 'var(--muted)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              Incremental · pulls new games only
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 36, padding: '40px 0', borderBottom: '1px solid var(--line)' }}>
          <Stat big={status?.games_processed ?? '—'} label="Games imported (last run)" mono />
          <Stat big={status?.cards_created ?? '—'} label="Cards created (last run)" mono />
          <Stat big={status?.error ? 'Partial' : status ? 'OK' : '—'} label="Last run status" mono />
          <Stat big={lastRun} label="Last successful run" mono />
        </div>

        {/* Pipeline diagram */}
        <div style={{ marginTop: 48 }}>
          <div className="mono" style={{ color: 'var(--muted)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 24 }}>
            The pipeline
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0 }}>
            {[
              { t: 'Fetch',   s: 'Chess.com archive API',    d: 'Monthly PGN archives, throttled 1 req/s' },
              { t: 'Parse',   s: 'PGN → FEN ply-by-ply',     d: 'Normalized game records via chess.js' },
              { t: 'Analyze', s: 'Stockfish WASM · d15',      d: 'CPL per move, best-move detection' },
              { t: 'Write',   s: 'Dedupe by FEN → FSRS init', d: 'One card per unique position' },
            ].map((p, i, arr) => (
              <div key={p.t} style={{
                padding: '24px',
                border: '1px solid var(--line)',
                borderRight: i < arr.length - 1 ? 'none' : '1px solid var(--line)',
                background: 'var(--bg)',
              }}>
                <div className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>
                  Stage {i + 1}
                </div>
                <div className="serif" style={{ fontSize: 22, letterSpacing: '-0.02em', marginBottom: 6 }}>{p.t}</div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--walnut)', marginBottom: 8 }}>{p.s}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5 }}>{p.d}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Sync history */}
        <div style={{ marginTop: 56 }}>
          <div className="mono" style={{ color: 'var(--muted)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 16 }}>
            Sync history · last {history.length} runs
          </div>
          <div style={{ border: '1px solid var(--line)' }}>
            {/* Header row */}
            <div style={{
              display: 'grid', gridTemplateColumns: '200px 120px 1fr 100px 100px', gap: 20,
              padding: '12px 20px', background: 'var(--bg-2)', borderBottom: '1px solid var(--line)',
            }}>
              {['When', 'Mode', 'Note', 'Games', 'Cards'].map((h) => (
                <span key={h} className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>{h}</span>
              ))}
            </div>

            {history.length === 0 && (
              <div style={{ padding: '28px 20px', color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 12 }}>
                No sync history yet.
              </div>
            )}

            {history.map((log, i) => (
              <div key={log.id} style={{
                display: 'grid', gridTemplateColumns: '200px 120px 1fr 100px 100px', gap: 20,
                padding: '14px 20px', alignItems: 'center',
                borderBottom: i < history.length - 1 ? '1px solid var(--line)' : 'none',
                background: 'var(--bg)',
              }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: log.error ? 'var(--amber)' : 'var(--good)',
                  }} />
                  <span className="mono" style={{ fontSize: 12 }}>
                    {new Date(log.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {' · '}
                    {new Date(log.started_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <span className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                  {log.mode}
                </span>
                <span style={{ fontSize: 13, color: log.error ? 'var(--ink-2)' : 'var(--muted)' }}>
                  {log.error ?? 'All stages green'}
                </span>
                <span className="serif" style={{ fontSize: 20, letterSpacing: '-0.02em' }}>{log.games_processed}</span>
                <span className="serif" style={{ fontSize: 20, letterSpacing: '-0.02em' }}>{log.cards_created}</span>
              </div>
            ))}
          </div>
        </div>
      </Page>
    </>
  )
}
