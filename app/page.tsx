'use client'

import { useRouter } from 'next/navigation'
import { Logo, Button, LargeBoard } from '@/components/ui'

const HERO_FEN = 'r1bq1rk1/pp3ppp/2n1pn2/2bp4/3P4/2NBPN2/PP3PPP/R1BQ1RK1 w - - 0 8'

export default function LandingPage() {
  const router = useRouter()

  return (
    <div style={{ minHeight: '100vh', position: 'relative', zIndex: 1 }}>
      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center',
        padding: '22px 40px', borderBottom: '1px solid var(--line)',
        position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 5,
      }}>
        <Logo size={22} />
        <nav style={{ marginLeft: 40, display: 'flex', gap: 28 }}>
          {['How it works', 'The method', 'Pricing'].map((l) => (
            <span key={l} className="mono" style={{ color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.14em', cursor: 'default' }}>{l}</span>
          ))}
        </nav>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
          <Button variant="ghost" size="sm" onClick={() => router.push('/login')}>Sign in</Button>
          <Button size="sm" onClick={() => router.push('/signup')}>Begin →</Button>
        </div>
      </header>

      {/* Hero */}
      <section style={{ maxWidth: 1280, margin: '0 auto', padding: '80px 40px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.05fr 1fr', gap: 80, alignItems: 'center' }}>
          <div>
            <div className="mono" style={{ color: 'var(--muted)', fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 28 }}>
              Volume I · A trainer for working players
            </div>
            <h1 className="serif" style={{
              fontSize: 'clamp(48px, 6.4vw, 92px)',
              lineHeight: 0.98, letterSpacing: '-0.035em',
              margin: 0, fontWeight: 400,
            }}>
              The chess trainer<br />
              that knows<br />
              <em style={{ fontStyle: 'italic', color: 'var(--walnut)' }}>your</em> games.
            </h1>
            <p style={{ fontSize: 19, lineHeight: 1.55, color: 'var(--ink-2)', maxWidth: 520, marginTop: 32 }}>
              Public tactics trainers drill you on positions you&rsquo;ll never see.
              Pattern imports every game you play on Chess.com, runs Stockfish
              over each move, and turns your blunders and brilliancies into a
              spaced&#8209;repetition deck — drilled by making the move on a real board.
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 36 }}>
              <Button size="lg" onClick={() => router.push('/signup')}>Link your account →</Button>
              <Button size="lg" variant="secondary" onClick={() => router.push('/review')}>Try a position</Button>
            </div>
            <div className="mono" style={{ color: 'var(--muted)', fontSize: 11, letterSpacing: '0.12em', marginTop: 28 }}>
              Works with Chess.com · Free during beta · No credit card
            </div>
          </div>

          {/* Hero board */}
          <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
            <div style={{ position: 'relative' }}>
              <div className="mono" style={{
                position: 'absolute', left: -24, top: -24,
                fontSize: 10, letterSpacing: '0.14em', color: 'var(--muted)', textTransform: 'uppercase',
              }}>
                Position 317 / 412
              </div>
              <LargeBoard fen={HERO_FEN} size={480} />
              <div style={{
                position: 'absolute', right: -220, top: 60, width: 200,
                padding: '18px 20px',
                background: 'var(--bg)', border: '1px solid var(--line)',
                boxShadow: '0 20px 40px -24px rgba(0,0,0,0.25)',
              }}>
                <div className="mono" style={{ color: 'var(--bad)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 6 }}>
                  Blunder · +3.1 → −2.4
                </div>
                <div className="serif" style={{ fontSize: 20, letterSpacing: '-0.01em', marginBottom: 8 }}>
                  You played <em>Bxh7+</em>
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5 }}>
                  Greek gift, but the knight on f6 covers g5. The quiet move was{' '}
                  <span className="mono" style={{ background: 'var(--bg-2)', padding: '1px 5px' }}>Rfe1</span>.
                </div>
              </div>
              <div style={{
                position: 'absolute', right: -170, bottom: 40, width: 150,
                padding: '14px 16px',
                background: 'var(--ink)', color: 'var(--bg)',
              }}>
                <div className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.6, marginBottom: 4 }}>FSRS</div>
                <div className="serif" style={{ fontSize: 16 }}>Next review<br />in 6 days</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section style={{ borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', margin: '80px 0 0' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '40px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 40 }}>
          {[
            { n: '1,287', l: 'Games analyzed per member (avg)' },
            { n: '412', l: 'Unique positions surfaced' },
            { n: '8–10×', l: 'Review threshold before retirement' },
            { n: '22.3', l: 'Elo gain over 60 days (pilot)' },
          ].map(({ n, l }) => (
            <div key={l}>
              <div className="mono" style={{ fontSize: 32, letterSpacing: '-0.02em', lineHeight: 1 }}>{n}</div>
              <div className="mono" style={{ color: 'var(--muted)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 10 }}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Method */}
      <section style={{ maxWidth: 1280, margin: '120px auto', padding: '0 40px' }}>
        <div className="mono" style={{ color: 'var(--muted)', fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 40 }}>
          The method · in three parts
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 64 }}>
          {[
            { n: 'I',   t: 'Import everything.',  b: 'Every game from every archive — bullet, blitz, rapid, daily. Historical on day one. Incremental every night.' },
            { n: 'II',  t: 'Analyze locally.',    b: 'Stockfish runs server-side over every ply. Centipawn loss classifies mistakes; engine top-choice finds the moves you almost missed.' },
            { n: 'III', t: 'Drill the position.', b: 'No self-rating. You play the move on the board; we grade it. Three attempts, one hint, then FSRS schedules the next review.' },
          ].map((it) => (
            <div key={it.n}>
              <div className="serif" style={{ fontSize: 80, lineHeight: 1, fontStyle: 'italic', color: 'var(--walnut)', marginBottom: 16 }}>{it.n}</div>
              <h3 className="serif" style={{ fontSize: 28, margin: '0 0 12px', letterSpacing: '-0.02em', fontWeight: 400 }}>{it.t}</h3>
              <p style={{ color: 'var(--ink-2)', lineHeight: 1.6, fontSize: 15 }}>{it.b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <section style={{ borderTop: '1px solid var(--line)', padding: '32px 40px', maxWidth: 1280, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="mono" style={{ color: 'var(--muted)', fontSize: 11, letterSpacing: '0.14em' }}>PATTERN · EST. 2026 · FOR STUDENTS OF THE GAME</div>
        <div className="mono" style={{ color: 'var(--muted)', fontSize: 11, letterSpacing: '0.14em' }}>v1.0 · web</div>
      </section>
    </div>
  )
}
