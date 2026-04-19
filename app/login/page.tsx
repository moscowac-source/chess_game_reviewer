'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Logo, Button, Field, Input, Divider } from '@/components/ui'
import { createClient } from '@/lib/supabase-browser'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
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
            Returning
          </div>
          <h1 className="serif" style={{ fontSize: 52, letterSpacing: '-0.03em', margin: '0 0 12px', fontWeight: 400, lineHeight: 1.02 }}>
            Welcome back.
          </h1>
          <p style={{ color: 'var(--ink-2)', lineHeight: 1.55, marginBottom: 36 }}>
            Pick up where you left off.
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
                placeholder="your password"
                required
              />
            </Field>
            {error && (
              <div data-testid="auth-error" style={{ color: 'var(--bad)', fontSize: 13, marginBottom: 16 }}>{error}</div>
            )}
            <Button type="submit" size="lg" style={{ width: '100%', marginTop: 8 }} disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in →'}
            </Button>
          </form>

          <Divider label="or" />

          <button
            onClick={() => router.push('/signup')}
            className="mono"
            style={{ color: 'var(--muted)', fontSize: 12, letterSpacing: '0.08em' }}
          >
            Create a new account →
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
