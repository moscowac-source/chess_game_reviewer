'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Nav, Page, Button, Tag, Stat, MiniBoard } from '@/components/ui'
import type { SyncLog } from '@/types/database'
import type { SessionCard, ReviewSession } from '@/lib/review-session-manager'

interface ModeCounts {
  standard: number
  recent: number
  mistakes: number
  brilliancies: number
}

interface ClassificationCounts {
  blunder: number
  mistake: number
  great: number
  brilliant: number
}

interface RecentGame {
  id: string
  played_at: string
  white: string | null
  black: string | null
  result: string | null
  url: string | null
  eco: string | null
  opponent: string | null
  outcome: 'win' | 'loss' | 'draw' | 'unknown'
  cardCount: number
}

function outcomeLabel(outcome: RecentGame['outcome']): string {
  if (outcome === 'win') return 'Win'
  if (outcome === 'loss') return 'Loss'
  if (outcome === 'draw') return 'Draw'
  return '—'
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
  const [streak, setStreak] = useState<number | null>(null)
  const [accuracy, setAccuracy] = useState<number | null>(null)
  const [breakdown, setBreakdown] = useState<ClassificationCounts | null>(null)
  const [recentGames, setRecentGames] = useState<RecentGame[]>([])

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

    fetch('/api/stats/streak')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && typeof data.streak === 'number') setStreak(data.streak)
      })
      .catch(() => {})

    fetch('/api/stats/accuracy?days=7')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && typeof data.accuracy === 'number') setAccuracy(data.accuracy)
      })
      .catch(() => {})

    fetch('/api/stats/classification')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (
          data &&
          typeof data.blunder === 'number' &&
          typeof data.mistake === 'number' &&
          typeof data.great === 'number' &&
          typeof data.brilliant === 'number'
        ) {
          setBreakdown(data)
        }
      })
      .catch(() => {})

    fetch('/api/games/recent?limit=5')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (Array.isArray(data)) setRecentGames(data as RecentGame[])
      })
      .catch(() => {})
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
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                    <Tag kind={nextCard.classification}>{nextCard.classification}</Tag>
                    {nextCard.theme && (
                      <span className="mono" style={{ color: 'var(--muted)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                        {nextCard.theme}
                      </span>
                    )}
                    {nextCard.isNew && (
                      <span className="mono" style={{ color: 'var(--muted)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                        New
                      </span>
                    )}
                  </div>
                  <div className="serif" style={{ fontSize: 20, letterSpacing: '-0.01em' }}>
                    {nextCard.classification === 'blunder' || nextCard.classification === 'mistake'
                      ? 'Find the move you missed'
                      : 'Replay your best move'}
                  </div>
                  {nextCard.note && (
                    <div style={{ marginTop: 8, fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5, fontStyle: 'italic' }}>
                      {nextCard.note}
                    </div>
                  )}
                </div>
              </button>
            </div>
          )}
        </section>

        {/* Stats strip */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 36, padding: '40px 0', borderBottom: '1px solid var(--line)' }}>
          <Stat big={dueToday ?? '—'} label="Due today" mono />
          <Stat big={newCards ?? '—'} label="New cards" mono />
          <Stat big={streak ?? '—'} label="Day streak" mono />
          <Stat big={accuracy !== null ? `${accuracy}%` : '—'} label="7-day accuracy" mono />
          <Stat big={counts ? Object.values(counts).reduce((a, b) => a + b, 0) : '—'} label="Total in deck" mono />
        </section>

        {/* Deck breakdown */}
        {breakdown && (
          <section style={{ marginTop: 48 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
              <h2 className="serif" style={{ fontSize: 28, letterSpacing: '-0.02em', margin: 0, fontWeight: 400 }}>Deck breakdown</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, border: '1px solid var(--line)' }}>
              <div data-testid="breakdown-blunder" style={{ padding: '18px 20px', borderRight: '1px solid var(--line)' }}>
                <div className="serif" style={{ fontSize: 36, letterSpacing: '-0.02em', lineHeight: 1, fontWeight: 400 }}>{breakdown.blunder}</div>
                <div className="mono" style={{ marginTop: 8, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>Blunders</div>
              </div>
              <div data-testid="breakdown-mistake" style={{ padding: '18px 20px', borderRight: '1px solid var(--line)' }}>
                <div className="serif" style={{ fontSize: 36, letterSpacing: '-0.02em', lineHeight: 1, fontWeight: 400 }}>{breakdown.mistake}</div>
                <div className="mono" style={{ marginTop: 8, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>Mistakes</div>
              </div>
              <div data-testid="breakdown-great" style={{ padding: '18px 20px', borderRight: '1px solid var(--line)' }}>
                <div className="serif" style={{ fontSize: 36, letterSpacing: '-0.02em', lineHeight: 1, fontWeight: 400 }}>{breakdown.great}</div>
                <div className="mono" style={{ marginTop: 8, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>Greats</div>
              </div>
              <div data-testid="breakdown-brilliant" style={{ padding: '18px 20px' }}>
                <div className="serif" style={{ fontSize: 36, letterSpacing: '-0.02em', lineHeight: 1, fontWeight: 400 }}>{breakdown.brilliant}</div>
                <div className="mono" style={{ marginTop: 8, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>Brilliants</div>
              </div>
            </div>
          </section>
        )}

        {/* Recent games */}
        {recentGames.length > 0 && (
          <section data-testid="recent-games" style={{ marginTop: 48 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
              <h2 className="serif" style={{ fontSize: 28, letterSpacing: '-0.02em', margin: 0, fontWeight: 400 }}>Recent games</h2>
            </div>
            <div style={{ border: '1px solid var(--line)' }}>
              {recentGames.map((g, i) => {
                const row = (
                  <>
                    <div style={{ display: 'grid', gap: 4 }}>
                      <div className="serif" style={{ fontSize: 17, letterSpacing: '-0.01em' }}>
                        vs {g.opponent ?? 'Unknown'}
                      </div>
                      <div className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                        {new Date(g.played_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="mono" style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                      {outcomeLabel(g.outcome)}
                    </div>
                    <div className="mono" style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                      {g.cardCount} {g.cardCount === 1 ? 'card' : 'cards'}
                    </div>
                    <div className="mono" style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                      {g.eco ?? ''}
                    </div>
                  </>
                )
                const rowStyle = {
                  display: 'grid',
                  gridTemplateColumns: '1fr auto auto auto',
                  alignItems: 'center',
                  gap: 20,
                  padding: '14px 18px',
                  borderBottom: i < recentGames.length - 1 ? '1px solid var(--line)' : 'none',
                  textAlign: 'left' as const,
                  color: 'inherit',
                  textDecoration: 'none',
                  background: 'var(--bg)',
                }
                return g.url ? (
                  <a
                    key={g.id}
                    data-testid={`recent-game-${g.id}`}
                    href={g.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={rowStyle}
                  >
                    {row}
                  </a>
                ) : (
                  <div
                    key={g.id}
                    data-testid={`recent-game-${g.id}`}
                    style={rowStyle}
                  >
                    {row}
                  </div>
                )
              })}
            </div>
          </section>
        )}

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
                      {c.theme && <> · {c.theme}</>}
                    </div>
                  </div>
                  <Tag kind={c.classification}>{c.classification}</Tag>
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
            <div style={{ display: 'flex', gap: 20 }}>
              <button onClick={() => router.push('/settings')} className="mono" style={{ color: 'var(--muted)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                Settings →
              </button>
              <button onClick={() => router.push('/sync')} className="mono" style={{ color: 'var(--muted)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                Sync log →
              </button>
            </div>
          </section>
        )}
      </Page>
    </>
  )
}
