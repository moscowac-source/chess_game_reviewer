'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Nav, Page, Button, Tag, Stat, MiniBoard } from '@/components/ui'
import type { SyncLog } from '@/types/database'

interface ModeCounts {
  standard: number
  recent: number
  mistakes: number
  brilliancies: number
}

interface SessionCard {
  cardId: string
  fen: string
  correctMove: string
  classification: string
  isNew: boolean
}

interface ReviewSession {
  cards: SessionCard[]
  totalDue: number
  newCardsToday: number
}

type CardKind = 'blunder' | 'mistake' | 'brilliant' | 'great'

function classificationToKind(c: string): CardKind {
  if (c === 'blunder' || c === 'mistake' || c === 'brilliant' || c === 'great') return c as CardKind
  return 'blunder'
}

function getDayGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning.'
  if (h < 18) return 'Good afternoon.'
  return 'Good evening.'
}

export default function DashboardPage() {
  const router = useRouter()
  const [counts, setCounts] = useState<ModeCounts | null>(null)
  const [session, setSession] = useState<ReviewSession | null>(null)
  const [syncStatus, setSyncStatus] = useState<SyncLog | null | undefined>(undefined)

  useEffect(() => {
    fetch('/api/review/counts')
      .then((r) => r.json())
      .then(setCounts)

    fetch('/api/review/session?mode=standard')
      .then((r) => r.json())
      .then(setSession)

    fetch('/api/sync/status')
      .then((r) => r.json())
      .then(setSyncStatus)
  }, [])

  const dueToday = counts?.standard ?? null
  const newCards = session?.newCardsToday ?? null
  const queueCards = session?.cards.slice(0, 6) ?? []
  const nextCard = session?.cards[0] ?? null

  return (
    <>
      <Nav />
      <Page wide>
        {/* Hero */}
        <section style={{
          display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 60,
          alignItems: 'end', paddingBottom: 48, borderBottom: '1px solid var(--line)',
        }}>
          <div>
            <div className="mono" style={{ color: 'var(--muted)', fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 18 }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
            <h1 className="serif" style={{ fontSize: 72, letterSpacing: '-0.035em', margin: 0, lineHeight: 1, fontWeight: 400 }}>
              {getDayGreeting()}<br />
              {dueToday !== null
                ? <><em style={{ color: 'var(--walnut)' }}>{dueToday}</em> cards are waiting.</>
                : <span style={{ opacity: 0.3 }}>Loading…</span>
              }
            </h1>
            {newCards !== null && (
              <p style={{ color: 'var(--ink-2)', fontSize: 17, lineHeight: 1.55, maxWidth: 560, marginTop: 24 }}>
                {(dueToday ?? 0) - newCards} due for review, {newCards} new from last night&rsquo;s sync.
              </p>
            )}
            <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
              <Button size="lg" onClick={() => router.push('/review')}>Begin review →</Button>
              <Button size="lg" variant="secondary" onClick={() => router.push('/deck')}>Browse deck</Button>
            </div>
          </div>

          {/* Next up */}
          {nextCard && (
            <div>
              <div className="mono" style={{ color: 'var(--muted)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 12 }}>Next up</div>
              <button
                onClick={() => router.push('/review')}
                style={{
                  width: '100%', textAlign: 'left',
                  border: '1px solid var(--line)', background: 'var(--bg)',
                  padding: '20px 22px', display: 'grid',
                  gridTemplateColumns: 'auto 1fr', gap: 18, alignItems: 'center',
                }}
              >
                <MiniBoard fen={nextCard.fen} size={88} />
                <div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <Tag kind={classificationToKind(nextCard.classification)}>{nextCard.classification}</Tag>
                    {nextCard.isNew && (
                      <span className="mono" style={{ color: 'var(--muted)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', alignSelf: 'center' }}>
                        New
                      </span>
                    )}
                  </div>
                  <div className="serif" style={{ fontSize: 20, letterSpacing: '-0.01em' }}>
                    {nextCard.classification === 'blunder' || nextCard.classification === 'mistake'
                      ? 'Find the move you missed'
                      : 'Replay your best move'}
                  </div>
                  {/* theme/note not available yet — requires schema addition */}
                </div>
              </button>
            </div>
          )}
        </section>

        {/* Stats strip */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 36, padding: '40px 0', borderBottom: '1px solid var(--line)' }}>
          <Stat big={dueToday ?? '—'} label="Due today" mono />
          <Stat big={newCards ?? '—'} label="New cards" mono />
          <Stat big="—" label="Day streak" mono sub="Not tracked yet" />
          <Stat big="—" label="7-day accuracy" mono sub="Not tracked yet" />
          <Stat big={counts ? Object.values(counts).reduce((a, b) => a + b, 0) : '—'} label="Total in deck" mono />
        </section>

        {/* Today's queue */}
        <section style={{ marginTop: 48 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
            <h2 className="serif" style={{ fontSize: 28, letterSpacing: '-0.02em', margin: 0, fontWeight: 400 }}>Today&rsquo;s queue</h2>
            <button onClick={() => router.push('/deck')} className="mono" style={{ color: 'var(--muted)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              All cards →
            </button>
          </div>

          {queueCards.length === 0 && dueToday !== null && (
            <div style={{ padding: '40px 0', color: 'var(--muted)', textAlign: 'center' }}>
              {dueToday === 0 ? 'All caught up for today.' : 'Loading queue…'}
            </div>
          )}

          {queueCards.length > 0 && (
            <div style={{ border: '1px solid var(--line)' }}>
              {queueCards.map((c, i) => (
                <button
                  key={c.cardId}
                  onClick={() => router.push('/review')}
                  style={{
                    width: '100%', display: 'grid',
                    gridTemplateColumns: 'auto 1fr auto auto',
                    alignItems: 'center', gap: 20,
                    padding: '14px 18px',
                    borderBottom: i < queueCards.length - 1 ? '1px solid var(--line)' : 'none',
                    textAlign: 'left', background: 'var(--bg)',
                  }}
                >
                  <MiniBoard fen={c.fen} size={52} />
                  <div>
                    <div className="serif" style={{ fontSize: 17, letterSpacing: '-0.01em', marginBottom: 4 }}>
                      {c.classification === 'blunder' || c.classification === 'mistake'
                        ? 'Find the missed move'
                        : 'Replay your best move'}
                    </div>
                    <div className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                      {c.isNew ? 'New' : 'Review'} · {c.correctMove}
                    </div>
                  </div>
                  <Tag kind={classificationToKind(c.classification)}>{c.classification}</Tag>
                  <div className="mono" style={{ color: 'var(--muted)', fontSize: 11 }}>→</div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Sync status footer */}
        {syncStatus !== undefined && (
          <section style={{ marginTop: 40, padding: '20px 0', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="mono" style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.12em' }}>
              {syncStatus === null
                ? 'Never synced'
                : `Synced ${new Date(syncStatus.completed_at ?? syncStatus.started_at).toLocaleString()} · ${syncStatus.games_processed} games · ${syncStatus.cards_created} cards`
              }
            </div>
            <button onClick={() => router.push('/sync')} className="mono" style={{ color: 'var(--muted)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              Sync log →
            </button>
          </section>
        )}
      </Page>
    </>
  )
}
