'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Nav, Page, Button, Stat } from '@/components/ui'
import { useSyncStatus, useSyncHistory } from '@/hooks/dashboard'
import { pollSyncUntilTerminal } from '@/lib/poll-sync-progress'
import { syncRunStatusLabel, type StatusTone } from '@/lib/sync-run-status'
import type { SyncLog } from '@/types/database'

const TONE_DOT: Record<StatusTone, string> = {
  success: 'var(--good)',
  error: 'var(--amber)',
  warn: 'var(--amber)',
  info: 'var(--muted)',
}

const TONE_TEXT: Record<StatusTone, string> = {
  success: 'var(--muted)',
  error: 'var(--ink-2)',
  warn: 'var(--ink-2)',
  info: 'var(--ink-2)',
}

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

    const result = await pollSyncUntilTerminal(sync_id, {
      onProgress: (snap) => {
        setProgressStage(snap.stage ?? 'queued')
        setProgressDone(snap.games_done ?? 0)
        setProgressTotal(snap.games_total ?? 0)
      },
    })
    if (result.outcome === 'error') {
      setSyncError(result.error ?? 'Sync failed')
    } else if (result.outcome === 'timeout') {
      setSyncError('Sync is taking longer than expected — check back on this page in a minute.')
    }

    statusFetch.refetch()
    historyFetch.refetch()
    setSyncing(false)
    setProgressStage(null)
  }

  const lastRun = status
    ? new Date(status.completed_at ?? status.started_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : '—'
  const lastRunDate = status
    ? new Date(status.completed_at ?? status.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null

  const lastStatus = status ? syncRunStatusLabel(status) : null
  const heroHeadline = status === undefined
    ? 'Loading…'
    : status === null
      ? 'Never synced.'
      : lastStatus!.tone === 'success'
        ? 'Everything in order.'
        : lastStatus!.tone === 'info'
          ? 'Sync in progress.'
          : lastStatus!.tone === 'warn'
            ? 'Last run did not finish.'
            : 'Last run stopped with an error.'
  const heroSubtitle = status
    ? lastStatus!.tone === 'success'
      ? `Last run succeeded ${lastRunDate} at ${lastRun}. Nightly job scheduled for 02:14 UTC.`
      : lastStatus!.tone === 'info'
        ? `Started ${lastRunDate} at ${lastRun}. Stockfish analysis runs ~30-40s per game — check back in a few minutes.`
        : `Last run on ${lastRunDate} at ${lastRun} — ${lastStatus!.label}.`
    : 'Run a historical import from the onboarding page first.'
  const lastStatusStat = lastStatus
    ? lastStatus.tone === 'success' ? 'OK'
      : lastStatus.tone === 'info' ? 'Running'
      : lastStatus.tone === 'warn' ? 'Stuck'
      : 'Error'
    : '—'

  const lastSuccessful = history.find((h) => syncRunStatusLabel(h).tone === 'success')
  const lastSuccessfulLabel = lastSuccessful
    ? new Date(lastSuccessful.completed_at ?? lastSuccessful.started_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
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
              {heroHeadline}
            </h1>
            <p style={{ color: 'var(--ink-2)', lineHeight: 1.55, marginTop: 20, fontSize: 16, maxWidth: 540 }}>
              {heroSubtitle}
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
          <Stat big={lastStatusStat} label="Last run status" mono />
          <Stat big={lastSuccessfulLabel} label="Last successful run" mono />
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

            {history.map((log, i) => {
              const status = syncRunStatusLabel(log)
              return (
                <Link key={log.id} href={`/sync/${log.id}`} style={{
                  display: 'grid', gridTemplateColumns: '200px 120px 1fr 100px 100px', gap: 20,
                  padding: '14px 20px', alignItems: 'center',
                  borderBottom: i < history.length - 1 ? '1px solid var(--line)' : 'none',
                  background: 'var(--bg)', color: 'inherit', textDecoration: 'none',
                }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      background: TONE_DOT[status.tone],
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
                  <span style={{ fontSize: 13, color: TONE_TEXT[status.tone] }}>
                    {status.label}
                  </span>
                  <span className="serif" style={{ fontSize: 20, letterSpacing: '-0.02em' }}>{log.games_processed}</span>
                  <span className="serif" style={{ fontSize: 20, letterSpacing: '-0.02em' }}>{log.cards_created}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </Page>
    </>
  )
}
