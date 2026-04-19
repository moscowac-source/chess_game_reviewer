'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Logo, Button, Field, Input } from '@/components/ui'
import { createClient } from '@/lib/supabase-browser'

const IMPORT_LOG = [
  'Contacting api.chess.com…',
  'Fetching game archives',
  'Parsing PGN games',
  'Stockfish depth 18 · batch 1 of 4',
  'Classifying moves · CPL > 200 = blunder',
  'Classifying moves · CPL 100–200 = mistake',
  'Identifying engine top choices',
  'Deduplicating positions by FEN',
  'Writing unique positions to deck',
  'Scheduling initial FSRS intervals',
  'Done.',
]

// ── Step 1: Link Chess.com account ────────────────────────────────────────

function LinkStep({ onNext }: { onNext: (username: string) => void }) {
  const [username, setUsername] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [verified, setVerified] = useState(false)
  const [verifyError, setVerifyError] = useState<string | null>(null)

  // Pre-fill from DB if already set
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      const { data: userData } = await supabase
        .from('users')
        .select('chess_com_username')
        .eq('id', data.user.id)
        .single()
      if (userData?.chess_com_username) setUsername(userData.chess_com_username)
    })
  }, [])

  async function verify() {
    if (!username.trim()) return
    setVerifying(true)
    setVerifyError(null)
    try {
      const res = await fetch(`https://api.chess.com/pub/player/${username.trim().toLowerCase()}`)
      if (res.ok) {
        // Save to DB
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase.from('users').upsert({ id: user.id, chess_com_username: username.trim() })
        }
        setVerified(true)
      } else {
        setVerifyError('Username not found on Chess.com. Check the spelling and try again.')
      }
    } catch {
      setVerifyError('Could not reach Chess.com. Check your connection.')
    }
    setVerifying(false)
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 80, alignItems: 'center' }}>
      <div>
        <div className="mono" style={{ color: 'var(--muted)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 16 }}>Step 01</div>
        <h1 className="serif" style={{ fontSize: 64, letterSpacing: '-0.03em', margin: 0, lineHeight: 1, fontWeight: 400 }}>
          Point us at<br />your <em style={{ color: 'var(--walnut)' }}>games.</em>
        </h1>
        <p style={{ color: 'var(--ink-2)', lineHeight: 1.55, marginTop: 28, fontSize: 16, maxWidth: 460 }}>
          Chess.com&rsquo;s public API returns everything we need. No password, no OAuth — just your handle.
        </p>

        <div style={{ marginTop: 40, maxWidth: 460 }}>
          <Field label="Chess.com username" hint="Case-insensitive. We'll verify it exists before moving on.">
            <div style={{ display: 'flex', gap: 8 }}>
              <Input
                value={username}
                onChange={(e) => { setUsername(e.target.value); setVerified(false) }}
                style={{ flex: 1 }}
                placeholder="your_handle"
              />
              <Button variant="secondary" onClick={verify} disabled={verifying || verified}>
                {verifying ? 'Checking…' : verified ? '✓ Verified' : 'Verify'}
              </Button>
            </div>
          </Field>

          {verifyError && (
            <div style={{ color: 'var(--bad)', fontSize: 13, marginBottom: 16 }}>{verifyError}</div>
          )}

          {verified && (
            <div style={{ border: '1px solid var(--line)', padding: '14px 16px', background: 'var(--bg-2)', marginBottom: 24 }}>
              <div className="mono" style={{ color: 'var(--good)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 6 }}>
                ✓ Account found
              </div>
              <div style={{ fontSize: 14, lineHeight: 1.5 }}>
                <b>{username}</b> verified on Chess.com.
              </div>
            </div>
          )}

          <Button size="lg" onClick={() => onNext(username)} disabled={!verified}>
            Import these games →
          </Button>
        </div>
      </div>

      {/* Right side: API preview card */}
      <div style={{ position: 'relative' }}>
        <div style={{
          padding: '40px 44px',
          background: 'var(--bg)', border: '1px solid var(--line)',
          boxShadow: '0 30px 60px -30px rgba(0,0,0,0.3)',
          transform: 'rotate(-1.2deg)',
        }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12 }}>
            api.chess.com/pub/player/{username.toLowerCase() || 'your_handle'}
          </div>
          <pre className="mono" style={{ fontSize: 11, lineHeight: 1.7, color: 'var(--ink-2)', margin: 0, whiteSpace: 'pre-wrap' }}>
{`{
  "username": "${username || 'your_handle'}",
  "status":   "premium",
  "joined":   1579500000,
  "followers": 42
}`}
          </pre>
        </div>
        <div style={{
          position: 'absolute', right: -30, bottom: -30,
          padding: '14px 18px', background: 'var(--ink)', color: 'var(--bg)',
          fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase',
        }}>
          GET 200 · 124ms
        </div>
      </div>
    </div>
  )
}

// ── Step 2: Import ────────────────────────────────────────────────────────

function ImportStep({ username, onDone }: { username: string; onDone: () => void }) {
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [logIdx, setLogIdx] = useState(0)
  const [error, setError] = useState<string | null>(null)

  async function startImport() {
    setRunning(true)
    setError(null)

    // Animate log lines while the API call is in flight
    let l = 0
    const iv = setInterval(() => {
      setProgress((p) => {
        const next = Math.min(p + Math.random() * 4 + 1, 92) // cap at 92 until API returns
        return next
      })
      if (l < IMPORT_LOG.length - 1) {
        l += 1
        setLogIdx(l)
      }
    }, 400)

    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'historical' }),
      })
      clearInterval(iv)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? `Sync failed (${res.status})`)
        setRunning(false)
        return
      }
      setProgress(100)
      setLogIdx(IMPORT_LOG.length)
      setTimeout(onDone, 800)
    } catch {
      clearInterval(iv)
      setError('Network error — please try again.')
      setRunning(false)
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60 }}>
      <div>
        <div className="mono" style={{ color: 'var(--muted)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 16 }}>Step 02</div>
        <h1 className="serif" style={{ fontSize: 56, letterSpacing: '-0.03em', margin: 0, lineHeight: 1.02, fontWeight: 400 }}>
          Pull the history.
        </h1>
        <p style={{ color: 'var(--ink-2)', lineHeight: 1.55, marginTop: 24, fontSize: 15, maxWidth: 460 }}>
          We&rsquo;ll walk back through every monthly archive Chess.com has for <b>{username}</b>.
          Stockfish runs on our servers — this may take a few minutes.
        </p>

        {error && (
          <div style={{ marginTop: 24, color: 'var(--bad)', fontSize: 13, border: '1px solid var(--bad)', padding: '12px 16px', background: 'rgba(166,74,63,0.06)' }}>
            {error}
          </div>
        )}

        <div style={{ marginTop: 40 }}>
          {!running
            ? <Button size="lg" onClick={startImport}>Begin import →</Button>
            : <Button size="lg" disabled>Importing… {Math.round(progress)}%</Button>
          }
        </div>
      </div>

      {/* Progress console */}
      <div style={{ background: 'var(--ink)', color: 'var(--bg)', padding: '32px 36px', minHeight: 420 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 28 }}>
          <span className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', opacity: 0.6, textTransform: 'uppercase' }}>sync.pipeline</span>
          <span className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', opacity: 0.6, textTransform: 'uppercase' }}>{running ? 'RUNNING' : 'IDLE'}</span>
        </div>
        <div className="serif" style={{ fontSize: 72, letterSpacing: '-0.04em', lineHeight: 1, fontWeight: 400 }}>
          {Math.round(progress)}<span style={{ fontSize: 32, opacity: 0.5 }}>%</span>
        </div>
        <div style={{ height: 1, background: 'rgba(245,242,236,0.15)', marginTop: 24 }}>
          <div style={{ height: 1, background: 'var(--amber)', width: `${progress}%`, transition: 'width 360ms' }} />
        </div>
        <div style={{ marginTop: 28, fontFamily: 'var(--mono)', fontSize: 11, lineHeight: 1.9, color: 'rgba(245,242,236,0.7)' }}>
          {IMPORT_LOG.slice(0, logIdx).map((line, i) => (
            <div key={i} style={{ opacity: 1 - (logIdx - i - 1) * 0.08 }}>
              <span style={{ opacity: 0.4 }}>{String(i + 1).padStart(2, '0')} · </span>{line}
            </div>
          ))}
          {running && logIdx < IMPORT_LOG.length && (
            <div style={{ opacity: 0.6 }}><span className="blink">▋</span></div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Step 3: Cadence ───────────────────────────────────────────────────────

function CadenceStep({ onDone }: { onDone: () => void }) {
  const [newPerDay, setNewPerDay] = useState(12)

  // TODO: persist newPerDay to users table (requires schema addition: daily_new_limit column)

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <div className="mono" style={{ color: 'var(--muted)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 16 }}>Step 03</div>
      <h1 className="serif" style={{ fontSize: 60, letterSpacing: '-0.03em', margin: 0, lineHeight: 1.02, fontWeight: 400 }}>
        Set your <em style={{ color: 'var(--walnut)' }}>cadence.</em>
      </h1>
      <p style={{ color: 'var(--ink-2)', lineHeight: 1.55, marginTop: 20, fontSize: 16 }}>
        FSRS works best with a steady trickle of new cards. We suggest 10–20 new per day.
      </p>

      <div style={{ marginTop: 48, padding: '32px 36px', border: '1px solid var(--line)', background: 'var(--bg-2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div>
            <div className="mono" style={{ color: 'var(--muted)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase' }}>New cards per day</div>
            <div className="serif" style={{ fontSize: 88, letterSpacing: '-0.04em', lineHeight: 1, marginTop: 4 }}>{newPerDay}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="mono" style={{ color: 'var(--muted)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Deck cleared in</div>
            <div className="serif" style={{ fontSize: 32, letterSpacing: '-0.02em' }}>≈ {Math.ceil(300 / newPerDay)} days</div>
          </div>
        </div>
        <input
          type="range" min="4" max="30" step="1" value={newPerDay}
          onChange={(e) => setNewPerDay(parseInt(e.target.value, 10))}
          style={{ width: '100%', marginTop: 24, accentColor: 'var(--ink)' }}
        />
        <div className="mono" style={{ color: 'var(--muted)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          <span>4 · light</span><span>12 · recommended</span><span>30 · firehose</span>
        </div>
      </div>

      <div style={{ marginTop: 28, display: 'flex', gap: 12, alignItems: 'center' }}>
        <Button size="lg" onClick={onDone}>Enter the deck →</Button>
        <Button size="lg" variant="secondary" onClick={onDone}>Skip for now</Button>
        <span className="mono" style={{ color: 'var(--muted)', fontSize: 10, letterSpacing: '0.12em' }}>
          Cadence saving requires a schema update (coming soon)
        </span>
      </div>
    </div>
  )
}

// ── Onboarding shell ──────────────────────────────────────────────────────

const STEPS = ['Link account', 'Import', 'Cadence']

export default function OnboardPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [username, setUsername] = useState('')

  return (
    <div style={{ minHeight: '100vh', position: 'relative', zIndex: 1 }}>
      <header style={{ display: 'flex', alignItems: 'center', padding: '22px 40px', borderBottom: '1px solid var(--line)' }}>
        <Logo size={20} />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 40, alignItems: 'center' }}>
          {STEPS.map((s, i) => (
            <div key={s} className="mono" style={{
              display: 'flex', alignItems: 'center', gap: 10,
              color: i <= step ? 'var(--ink)' : 'var(--muted)',
              fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase',
            }}>
              <span style={{
                width: 22, height: 22, borderRadius: '50%',
                display: 'grid', placeItems: 'center',
                border: '1px solid currentColor', fontSize: 10,
                background: i < step ? 'var(--ink)' : 'transparent',
                color: i < step ? 'var(--bg)' : 'inherit',
              }}>
                {i < step ? '✓' : i + 1}
              </span>
              {s}
            </div>
          ))}
        </div>
      </header>

      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '72px 40px' }}>
        {step === 0 && (
          <LinkStep onNext={(u) => { setUsername(u); setStep(1) }} />
        )}
        {step === 1 && (
          <ImportStep username={username} onDone={() => setStep(2)} />
        )}
        {step === 2 && (
          <CadenceStep onDone={() => router.push('/dashboard')} />
        )}
      </div>
    </div>
  )
}
