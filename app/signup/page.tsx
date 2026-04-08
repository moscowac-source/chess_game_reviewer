'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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

    // If a session exists, email confirmation is disabled — go straight to the app
    if (data.session) {
      router.push('/')
      router.refresh()
      return
    }

    // Otherwise Supabase sent a confirmation email — show a message
    setConfirmationSent(true)
    setLoading(false)
  }

  if (confirmationSent) {
    return (
      <main>
        <h1>Chess Improver</h1>
        <h2>Check your email</h2>
        <p>We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account, then <Link href="/login">log in</Link>.</p>
      </main>
    )
  }

  return (
    <main>
      <h1>Chess Improver</h1>
      <h2>Sign up</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p data-testid="auth-error">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? 'Signing up…' : 'Sign up'}
        </button>
      </form>
      <p>
        Already have an account? <Link href="/login">Log in</Link>
      </p>
    </main>
  )
}
