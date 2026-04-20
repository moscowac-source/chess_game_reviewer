'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Nav, Tag, Button } from '@/components/ui'
import { ReviewBoard, type Outcome } from '@/components/ReviewBoard'

interface SessionCard {
  cardId: string
  fen: string
  correctMove: string
  classification: string
  isNew: boolean
  theme: string | null
  note: string | null
  cpl: number | null
}

interface ReviewSession {
  cards: SessionCard[]
  totalDue: number
  newCardsToday: number
}

type Phase = 'board' | 'rating' | 'done'
type CardKind = 'blunder' | 'mistake' | 'brilliant' | 'great'

function classificationToKind(c: string): CardKind {
  if (c === 'blunder' || c === 'mistake' || c === 'brilliant' || c === 'great') return c as CardKind
  return 'blunder'
}

function sideToMove(fen: string): 'white' | 'black' {
  return fen.split(' ')[1] === 'b' ? 'black' : 'white'
}

// Maps outcome → 2 rating options to show the user
function getRatingOptions(outcome: Outcome): Array<{ label: string; sub: string; interval: string; submitOutcome: Outcome }> {
  switch (outcome) {
    case 'firstTry':
      return [
        { label: 'Easy',  sub: 'I knew it instantly',     interval: '+9d', submitOutcome: 'firstTry' },
        { label: 'Good',  sub: 'Correct after thought',   interval: '+3d', submitOutcome: 'afterHint' },
      ]
    case 'afterHint':
      return [
        { label: 'Good',  sub: 'Got it with a hint',      interval: '+2d', submitOutcome: 'afterHint' },
        { label: 'Hard',  sub: 'Needed more time',        interval: '+1d', submitOutcome: 'afterAttempts' },
      ]
    case 'afterAttempts':
      return [
        { label: 'Hard',  sub: 'Many attempts',           interval: '+18h', submitOutcome: 'afterAttempts' },
        { label: 'Again', sub: 'See it sooner',           interval: '+4h',  submitOutcome: 'failed' },
      ]
    case 'failed':
      return [
        { label: 'Again', sub: "I'll see it again soon",  interval: '+4h',  submitOutcome: 'failed' },
      ]
  }
}

// ── Side panel ────────────────────────────────────────────────────────────

function SidePanel({
  card,
  phase,
  outcome,
  wrongAttempts,
  onReveal,
  onRate,
}: {
  card: SessionCard
  phase: Phase
  outcome: Outcome | null
  wrongAttempts: number
  onReveal: () => void
  onRate: (o: Outcome) => void
}) {
  const kind = classificationToKind(card.classification)
  const isPositive = card.classification === 'brilliant' || card.classification === 'great'

  return (
    <div>
      {/* Card context — always visible */}
      <div style={{ border: '1px solid var(--line)', padding: '18px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Tag kind={kind}>{card.classification}</Tag>
            {card.theme && (
              <span className="mono" style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                {card.theme}
              </span>
            )}
            {card.cpl != null && (
              <span className="mono" style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                {card.cpl > 0 ? `−${card.cpl} cp` : `${card.cpl} cp`}
              </span>
            )}
          </div>
          {card.isNew && (
            <span className="mono" style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>New</span>
          )}
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.55 }}>
          From a <b>{isPositive ? 'line you handled well' : 'game you could have played better'}</b>
          {' · '}
          {isPositive ? 'replay the move that made this work.' : 'find the move you should have played.'}
        </div>
        {card.note && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)', fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.55, fontStyle: 'italic' }}>
            {card.note}
          </div>
        )}
      </div>

      {/* Phase content */}
      {phase === 'board' && wrongAttempts === 0 && (
        <EmptyState>
          <div className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>
            Your turn
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--ink-2)' }}>
            Click the piece you want to move, then click the destination square.
          </div>
        </EmptyState>
      )}

      {phase === 'board' && wrongAttempts > 0 && (
        <EmptyState tone="hint">
          <div className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--walnut)', marginBottom: 10 }}>
            Hint · piece highlighted
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--ink-2)' }}>
            The piece that moves is highlighted. {3 - wrongAttempts} {3 - wrongAttempts === 1 ? 'attempt' : 'attempts'} left.
          </div>
          {wrongAttempts >= 2 && (
            <button onClick={onReveal} className="mono" style={{ marginTop: 14, color: 'var(--muted)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              Give up &amp; reveal →
            </button>
          )}
        </EmptyState>
      )}

      {phase === 'rating' && outcome && outcome !== 'failed' && (
        <EmptyState tone="good">
          <div className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--good)', marginBottom: 10 }}>
            ✓ Correct — {card.correctMove}
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5, marginBottom: 14 }}>
            {/* note/explanation not available yet — requires schema addition */}
            How did it feel?
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {getRatingOptions(outcome).map((o) => (
              <button
                key={o.label}
                onClick={() => onRate(o.submitOutcome)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 14px', border: '1px solid var(--line)',
                  background: 'var(--bg)', textAlign: 'left',
                  cursor: 'pointer', fontFamily: 'var(--sans)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ink)'; e.currentTarget.style.color = 'var(--bg)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg)'; e.currentTarget.style.color = 'var(--ink)' }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{o.label}</div>
                  <div className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', opacity: 0.7, marginTop: 2 }}>{o.sub}</div>
                </div>
                <span className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.7 }}>next · {o.interval}</span>
              </button>
            ))}
          </div>
        </EmptyState>
      )}

      {phase === 'rating' && outcome === 'failed' && (
        <EmptyState tone="bad">
          <div className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>
            The move was <b style={{ color: 'var(--ink)' }}>{card.correctMove}</b>
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5, marginBottom: 16 }}>
            {/* note/explanation not available yet — requires schema addition */}
            You&rsquo;ll see this position again soon.
          </div>
          <Button size="md" style={{ width: '100%' }} onClick={() => onRate('failed')}>
            I&rsquo;ll see it again soon →
          </Button>
        </EmptyState>
      )}
    </div>
  )
}

function EmptyState({ children, tone }: { children: React.ReactNode; tone?: 'good' | 'bad' | 'hint' }) {
  const BG_MAP = { good: 'rgba(79,107,74,0.06)', bad: 'rgba(166,74,63,0.06)', hint: 'rgba(212,165,116,0.1)' }
  const BORDER_MAP = { good: 'var(--good)', bad: 'var(--bad)', hint: 'var(--amber)' }
  const bg = tone ? (BG_MAP[tone] ?? 'var(--bg-2)') : 'var(--bg-2)'
  const border = tone ? (BORDER_MAP[tone] ?? 'var(--line)') : 'var(--line)'
  return (
    <div style={{ padding: '20px 22px', background: bg, border: `1px solid ${border}`, transition: 'all 200ms' }}>
      {children}
    </div>
  )
}

// ── Session summary ───────────────────────────────────────────────────────

function SessionSummary({ correct, total, go }: { correct: number; total: number; go: () => void }) {
  const pct = total ? Math.round((correct / total) * 100) : 0
  return (
    <div style={{ maxWidth: 760, margin: '40px auto', textAlign: 'center' }}>
      <div className="mono" style={{ color: 'var(--muted)', fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 18 }}>
        Session complete
      </div>
      <h1 className="serif" style={{ fontSize: 80, letterSpacing: '-0.035em', margin: 0, lineHeight: 1, fontWeight: 400 }}>
        {correct} of {total}<br />
        <em style={{ color: 'var(--walnut)' }}>{pct}% accuracy</em>
      </h1>
      <p style={{ color: 'var(--ink-2)', lineHeight: 1.55, fontSize: 17, marginTop: 28 }}>
        FSRS has rescheduled your cards. The hard ones return sooner; the rest drift further out.
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 32 }}>
        <Button size="lg" onClick={go}>Back to today →</Button>
        <Button size="lg" variant="secondary" onClick={() => window.location.href = '/deck'}>Browse deck</Button>
      </div>
    </div>
  )
}

// ── Review content (needs useSearchParams so wrapped in Suspense) ─────────

function ReviewContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const mode = searchParams.get('mode') ?? 'standard'

  const [queue, setQueue] = useState<SessionCard[]>([])
  const [index, setIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [phase, setPhase] = useState<Phase>('board')
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)

  useEffect(() => {
    fetch(`/api/review/session?mode=${mode}`)
      .then((r) => r.json())
      .then((s: ReviewSession) => { setQueue(s.cards); setLoading(false) })
  }, [mode])

  // Reset per-card state when index changes
  useEffect(() => {
    setPhase('board')
    setOutcome(null)
    setWrongAttempts(0)
  }, [index])

  const card = queue[index]
  const total = queue.length

  async function handleResult(o: Outcome) {
    setOutcome(o)
    if (o !== 'failed') setCorrectCount((c) => c + 1)
    setPhase('rating')
  }

  async function handleRate(o: Outcome) {
    if (card) {
      await fetch(`/api/review/cards/${card.cardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome: o }),
      })
    }
    if (index >= queue.length - 1) {
      setPhase('done')
    } else {
      setIndex((i) => i + 1)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
        <div className="mono" style={{ color: 'var(--muted)', fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
          Loading session…
        </div>
      </div>
    )
  }

  if (phase === 'done' || (queue.length === 0 && !loading)) {
    return (
      <>
        <Nav />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <SessionSummary correct={correctCount} total={total} go={() => router.push('/dashboard')} />
        </div>
      </>
    )
  }

  if (!card) return null

  const pct = (index / total) * 100

  return (
    <>
      <Nav />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1280, margin: '0 auto', padding: '28px 32px 60px' }}>
        {/* Session header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div>
              <div className="mono" style={{ color: 'var(--muted)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
                Daily review · {index + 1} of {total}
              </div>
              <h1 className="serif" style={{ fontSize: 40, letterSpacing: '-0.025em', margin: '6px 0 0', fontWeight: 400 }}>
                {/* theme not available yet — show classification */}
                {card.classification.charAt(0).toUpperCase() + card.classification.slice(1)} recovery
              </h1>
            </div>
            <button onClick={() => router.push('/dashboard')} className="mono" style={{ color: 'var(--muted)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              End session ×
            </button>
          </div>
          <div style={{ height: 1, background: 'var(--line)', marginTop: 16, position: 'relative' }}>
            <div style={{ height: 1, background: 'var(--ink)', width: `${pct}%`, transition: 'width 260ms' }} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 56, alignItems: 'start' }}>
          {/* Board column */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 14, height: 14, borderRadius: '50%',
                background: sideToMove(card.fen) === 'white' ? '#f8f4ea' : '#1a1a1a',
                border: '1px solid var(--ink)',
              }} />
              <div className="mono" style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
                {sideToMove(card.fen) === 'white' ? 'White' : 'Black'} to move — find the move
              </div>
            </div>

            <div style={{ width: '100%', maxWidth: 560 }}>
              <ReviewBoard
                key={card.cardId}
                fen={card.fen}
                correctMove={card.correctMove}
                onResult={handleResult}
                onWrongAttempt={setWrongAttempts}
                boardOrientation={sideToMove(card.fen)}
              />
            </div>

            {/* Attempt pips */}
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{
                  width: 26, height: 4,
                  background: i < wrongAttempts ? 'var(--bad)' : 'var(--line)',
                  transition: 'background 200ms',
                }} />
              ))}
              <span className="mono" style={{ marginLeft: 12, fontSize: 10, color: 'var(--muted)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                Attempts
              </span>
            </div>
          </div>

          {/* Side panel */}
          <aside style={{ position: 'sticky', top: 88 }}>
            <SidePanel
              card={card}
              phase={phase}
              outcome={outcome}
              wrongAttempts={wrongAttempts}
              onReveal={() => { setPhase('rating'); setOutcome('failed') }}
              onRate={handleRate}
            />
          </aside>
        </div>
      </div>
    </>
  )
}

// ── Page export ───────────────────────────────────────────────────────────

export default function ReviewPage() {
  return (
    <Suspense>
      <ReviewContent />
    </Suspense>
  )
}
