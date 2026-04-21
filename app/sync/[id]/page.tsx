'use client'

import { use } from 'react'
import Link from 'next/link'
import { Nav, Page } from '@/components/ui'
import { useFetchJson } from '@/hooks/use-fetch-json'
import type { SyncLog } from '@/types/database'

interface SyncStepRow {
  id: string
  game_url: string | null
  game_index: number | null
  step: string
  status: 'ok' | 'error' | 'skipped'
  duration_ms: number | null
  error: string | null
  error_code: string | null
  details: Record<string, unknown> | null
  created_at: string
}

interface SyncDetail {
  sync: SyncLog
  steps: SyncStepRow[]
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null

function validateDetail(raw: unknown): SyncDetail | null {
  if (!isObj(raw)) return null
  const { sync, steps } = raw
  if (!isObj(sync) || !Array.isArray(steps)) return null
  return { sync: sync as unknown as SyncLog, steps: steps as SyncStepRow[] }
}

function statusColor(status: SyncStepRow['status']): string {
  if (status === 'error') return 'var(--bad)'
  if (status === 'skipped') return 'var(--muted)'
  return 'var(--good)'
}

export default function SyncDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data, loading, error } = useFetchJson<SyncDetail>(
    `/api/sync/${id}/steps`,
    validateDetail,
  )

  return (
    <>
      <Nav />
      <Page wide>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 28 }}>
          <div>
            <div className="mono" style={{ color: 'var(--muted)', fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 10 }}>
              Sync run · step-by-step audit
            </div>
            <h1 className="serif" style={{ fontSize: 40, letterSpacing: '-0.03em', margin: 0, lineHeight: 1.1, fontWeight: 400 }}>
              {data ? new Date(data.sync.started_at).toLocaleString() : 'Loading…'}
            </h1>
          </div>
          <Link href="/sync" className="mono" style={{ fontSize: 12, color: 'var(--ink-2)' }}>
            ← Back to sync
          </Link>
        </div>

        {loading && (
          <div className="mono" style={{ color: 'var(--muted)', fontSize: 12 }}>Loading steps…</div>
        )}
        {error && (
          <div style={{ color: 'var(--bad)', fontSize: 13 }}>Failed to load: {error.message}</div>
        )}

        {data && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 28, padding: '20px 0 32px' }}>
              <Kv label="Mode" value={data.sync.mode} />
              <Kv label="Games" value={`${data.sync.games_processed} / ${data.sync.games_total}`} />
              <Kv label="Cards created" value={String(data.sync.cards_created)} />
              <Kv label="Stage" value={data.sync.stage ?? '—'} />
            </div>

            <div style={{ border: '1px solid var(--line)' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '48px 80px 1fr 150px 80px 80px 2fr',
                gap: 16, padding: '12px 16px', background: 'var(--bg-2)',
                borderBottom: '1px solid var(--line)',
              }}>
                {['#', 'Game', 'Step', 'Status', 'Dur (ms)', 'Code', 'Error / details'].map((h) => (
                  <span key={h} className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                    {h}
                  </span>
                ))}
              </div>

              {data.steps.length === 0 && (
                <div style={{ padding: '24px 16px', color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 12 }}>
                  No step rows recorded for this run.
                </div>
              )}

              {data.steps.map((s, i) => (
                <div key={s.id} style={{
                  display: 'grid',
                  gridTemplateColumns: '48px 80px 1fr 150px 80px 80px 2fr',
                  gap: 16, padding: '10px 16px', alignItems: 'center',
                  borderBottom: i < data.steps.length - 1 ? '1px solid var(--line)' : 'none',
                  fontFamily: 'var(--mono)', fontSize: 12,
                }}>
                  <span style={{ color: 'var(--muted)' }}>{s.game_index ?? '—'}</span>
                  <span style={{ color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis' }} title={s.game_url ?? ''}>
                    {s.game_url ? shortUrl(s.game_url) : '—'}
                  </span>
                  <span>{s.step}</span>
                  <span style={{ color: statusColor(s.status), textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: 11 }}>
                    ● {s.status}
                  </span>
                  <span style={{ color: 'var(--ink-2)' }}>{s.duration_ms ?? '—'}</span>
                  <span style={{ color: 'var(--ink-2)' }}>{s.error_code ?? '—'}</span>
                  <span style={{ color: s.error ? 'var(--bad)' : 'var(--muted)', wordBreak: 'break-word' }}>
                    {s.error ?? (s.details ? JSON.stringify(s.details) : '')}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </Page>
    </>
  )
}

function Kv({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>
        {label}
      </div>
      <div className="serif" style={{ fontSize: 20, letterSpacing: '-0.02em' }}>{value}</div>
    </div>
  )
}

function shortUrl(url: string): string {
  try {
    const u = new URL(url)
    const path = u.pathname.replace(/^\/+/, '')
    return path.length > 20 ? '…' + path.slice(-18) : path
  } catch {
    return url.slice(-20)
  }
}
