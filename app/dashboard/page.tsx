'use client'

import { useRouter } from 'next/navigation'
import { Nav, Page, Button, Tag, MiniBoard } from '@/components/ui'
import { StatTile } from '@/components/StatTile'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { DashboardCrashed } from '@/components/DashboardCrashed'
import {
  useCounts,
  useReviewSession,
  useStreak,
  useAccuracy,
  useClassification,
  useRecentGames,
  useSyncStatus,
  type RecentGame,
} from '@/hooks/dashboard'

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
  return (
    <ErrorBoundary fallback={<DashboardCrashed />}>
      <DashboardContent />
    </ErrorBoundary>
  )
}

function DashboardContent() {
  const router = useRouter()
  const counts = useCounts()
  const session = useReviewSession('standard')
  const streak = useStreak()
  const accuracy = useAccuracy(7)
  const breakdown = useClassification()
  const recentGamesResult = useRecentGames(5)
  const syncStatusResult = useSyncStatus()

  const dueToday = counts.data?.standard ?? null
  const newCards = session.data?.newCardsToday ?? null
  const queueCards = session.data?.cards.slice(0, 6) ?? []
  const nextCard = session.data?.cards[0] ?? null
  const recentGames = recentGamesResult.data ?? []
  const syncLog = syncStatusResult.data?.log ?? null
  const syncStatusLoaded = !syncStatusResult.loading && syncStatusResult.data !== null

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
          <StatTile
            label="Due today"
            value={dueToday}
            loading={counts.loading}
            error={counts.error}
            onRetry={counts.refetch}
            mono
          />
          <StatTile
            label="New cards"
            value={newCards}
            loading={session.loading}
            error={session.error}
            onRetry={session.refetch}
            mono
          />
          <StatTile
            label="Day streak"
            value={streak.data?.streak}
            loading={streak.loading}
            error={streak.error}
            onRetry={streak.refetch}
            mono
          />
          <StatTile
            label="7-day accuracy"
            value={accuracy.data?.accuracy != null ? `${accuracy.data.accuracy}%` : null}
            loading={accuracy.loading}
            error={accuracy.error}
            onRetry={accuracy.refetch}
            mono
          />
          <StatTile
            label="Total in deck"
            value={counts.data ? Object.values(counts.data).reduce((a, b) => a + b, 0) : null}
            loading={counts.loading}
            error={counts.error}
            onRetry={counts.refetch}
            mono
          />
        </section>

        {/* Deck breakdown */}
        {breakdown.data && (
          <section style={{ marginTop: 48 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
              <h2 className="serif" style={{ fontSize: 28, letterSpacing: '-0.02em', margin: 0, fontWeight: 400 }}>Deck breakdown</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, border: '1px solid var(--line)' }}>
              <div data-testid="breakdown-blunder" style={{ padding: '18px 20px', borderRight: '1px solid var(--line)' }}>
                <div className="serif" style={{ fontSize: 36, letterSpacing: '-0.02em', lineHeight: 1, fontWeight: 400 }}>{breakdown.data.blunder}</div>
                <div className="mono" style={{ marginTop: 8, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>Blunders</div>
              </div>
              <div data-testid="breakdown-mistake" style={{ padding: '18px 20px', borderRight: '1px solid var(--line)' }}>
                <div className="serif" style={{ fontSize: 36, letterSpacing: '-0.02em', lineHeight: 1, fontWeight: 400 }}>{breakdown.data.mistake}</div>
                <div className="mono" style={{ marginTop: 8, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>Mistakes</div>
              </div>
              <div data-testid="breakdown-great" style={{ padding: '18px 20px', borderRight: '1px solid var(--line)' }}>
                <div className="serif" style={{ fontSize: 36, letterSpacing: '-0.02em', lineHeight: 1, fontWeight: 400 }}>{breakdown.data.great}</div>
                <div className="mono" style={{ marginTop: 8, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>Greats</div>
              </div>
              <div data-testid="breakdown-brilliant" style={{ padding: '18px 20px' }}>
                <div className="serif" style={{ fontSize: 36, letterSpacing: '-0.02em', lineHeight: 1, fontWeight: 400 }}>{breakdown.data.brilliant}</div>
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
        {syncStatusLoaded && (
          <section style={{ marginTop: 40, padding: '20px 0', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="mono" style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.12em' }}>
              {syncLog === null
                ? 'Never synced'
                : `Synced ${new Date(syncLog.completed_at ?? syncLog.started_at).toLocaleString()} · ${syncLog.games_processed} games · ${syncLog.cards_created} cards`
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
