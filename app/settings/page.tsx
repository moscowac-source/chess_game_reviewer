'use client'

import { useEffect, useState } from 'react'
import { Nav, Page, Button } from '@/components/ui'
import { createClient } from '@/lib/supabase-browser'

export default function SettingsPage() {
  const [newPerDay, setNewPerDay] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      const { data: row } = await supabase
        .from('users')
        .select('daily_new_limit')
        .eq('id', data.user.id)
        .single()
      setNewPerDay(row?.daily_new_limit ?? 10)
    })
  }, [])

  const handleSave = async () => {
    if (newPerDay === null) return
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ daily_new_limit: newPerDay }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? `Save failed (${res.status})`)
      } else {
        setSaved(true)
      }
    } catch {
      setError('Network error — please try again.')
    }
    setSaving(false)
  }

  return (
    <>
      <Nav />
      <Page>
        <div className="mono" style={{ color: 'var(--muted)', fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 18 }}>
          Settings
        </div>
        <h1 className="serif" style={{ fontSize: 56, letterSpacing: '-0.03em', margin: 0, lineHeight: 1.02, fontWeight: 400 }}>
          Your <em style={{ color: 'var(--walnut)' }}>cadence.</em>
        </h1>
        <p style={{ color: 'var(--ink-2)', lineHeight: 1.55, marginTop: 20, fontSize: 16, maxWidth: 560 }}>
          Adjust how many new cards FSRS introduces each day. Changes apply to tomorrow&rsquo;s session.
        </p>

        {newPerDay === null ? (
          <div style={{ color: 'var(--muted)', marginTop: 48 }}>Loading…</div>
        ) : (
          <>
            <div style={{ marginTop: 48, padding: '32px 36px', border: '1px solid var(--line)', background: 'var(--bg-2)', maxWidth: 720 }}>
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
                onChange={(e) => { setNewPerDay(parseInt(e.target.value, 10)); setSaved(false) }}
                style={{ width: '100%', marginTop: 24, accentColor: 'var(--ink)' }}
              />
              <div className="mono" style={{ color: 'var(--muted)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <span>4 · light</span><span>12 · recommended</span><span>30 · firehose</span>
              </div>
            </div>

            <div style={{ marginTop: 28, display: 'flex', gap: 12, alignItems: 'center' }}>
              <Button size="lg" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
              {saved && (
                <span className="mono" style={{ color: 'var(--good)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                  ✓ Saved
                </span>
              )}
              {error && (
                <span className="mono" style={{ color: 'var(--bad)', fontSize: 11 }}>{error}</span>
              )}
            </div>
          </>
        )}
      </Page>
    </>
  )
}
