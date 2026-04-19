'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Logo, Button, Field, Input, Divider } from '@/components/ui'
import { createClient } from '@/lib/supabase-browser'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [confirmationSent, setConfirmationSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.signUp({ email, password })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    const userId = data.user?.id
    if (userId) {
      await supabase.from('users').upsert({ id: userId, email, chess_com_username: null })
    }

    if (data.session) {
      router.push('/onboard')
      router.refresh()
      return
    }

    setConfirmationSent(true)
    setLoading(false)
  }

  if (confirmationSent) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 480, textAlign: 'center', padding: '0 24px' }}>
          <Logo size={20} />
          <h1 className="serif" style={{ fontSize: 48, letterSpacing: '-0.03em', margin: '32px 0 16px', fontWeight: 400 }}>
            Check your email.
          </h1>
          <p style={{ color: 'var(--ink-2)', lineHeight: 1.55 }}>
            We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account, then sign in.
          </p>
          <div style={{ marginTop: 32 }}>
            <Button onClick={() => router.push('/login')}>Go to sign in →</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1fr 1fr', position: 'relative', zIndex: 1 }}>
      {/* Left: form */}
      <div style={{ padding: '40px 60px', display: 'flex', flexDirection: 'column' }}>
        <button onClick={() => router.push('/')} style={{ display: 'inline-flex', alignSelf: 'flex-start' }}>
          <Logo size={20} />
        </button>

        <div style={{ margin: 'auto 0', maxWidth: 420 }}>
          <div className="mono" style={{ color: 'var(--muted)', fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 20 }}>
            New student
          </div>
          <h1 className="serif" style={{ fontSize: 52, letterSpacing: '-0.03em', margin: '0 0 12px', fontWeight: 400, lineHeight: 1.02 }}>
            Start your deck.
          </h1>
          <p style={{ color: 'var(--ink-2)', lineHeight: 1.55, marginBottom: 36 }}>
            Email and a password. You&rsquo;ll link Chess.com in the next step.
          </p>

          <form onSubmit={handleSubmit}>
            <Field label="Email">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                required
              />
            </Field>
            <Field label="Password">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="at least 8 characters"
                required
              />
            </Field>
            {error && (
              <div data-testid="auth-error" style={{ color: 'var(--bad)', fontSize: 13, marginBottom: 16 }}>{error}</div>
            )}
            <Button type="submit" size="lg" style={{ width: '100%', marginTop: 8 }} disabled={loading}>
              {loading ? 'Creating account…' : 'Create account →'}
            </Button>
          </form>

          <Divider label="or" />

          <button
            onClick={() => router.push('/login')}
            className="mono"
            style={{ color: 'var(--muted)', fontSize: 12, letterSpacing: '0.08em' }}
          >
            I already have an account →
          </button>
        </div>

        <div className="mono" style={{ color: 'var(--muted)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          Your review data is private. Not sold, not shared.
        </div>
      </div>

      {/* Right: visual */}
      <div style={{
        background: 'var(--ink)', color: 'var(--bg)',
        padding: '40px 60px', display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between', position: 'relative', overflow: 'hidden',
      }}>
        <div className="mono" style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', opacity: 0.55 }}>
          A note from the notebook
        </div>
        <div>
          <div className="serif" style={{ fontSize: 52, letterSpacing: '-0.03em', lineHeight: 1.05, fontStyle: 'italic', marginBottom: 32 }}>
            &ldquo;The mistakes you repeat<br />are the lessons you owe<br />yourself.&rdquo;
          </div>
          <div className="mono" style={{ fontSize: 11, letterSpacing: '0.14em', opacity: 0.55 }}>
            — UNSIGNED MARGINALIA, OPENING JOURNAL
          </div>
        </div>
        <div style={{ opacity: 0.18, position: 'absolute', right: -80, bottom: -80 }}>
          <svg width="400" height="400" viewBox="0 0 8 8">
            {Array.from({ length: 8 }).map((_, r) =>
              Array.from({ length: 8 }).map((__, c) =>
                (r + c) % 2 === 0
                  ? <rect key={`${r}-${c}`} x={c} y={r} width="1" height="1" fill="var(--bg)" />
                  : null
              )
            )}
          </svg>
        </div>
      </div>
    </div>
  )
}
