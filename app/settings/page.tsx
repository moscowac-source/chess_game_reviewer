'use client'

import { useEffect, useState } from 'react'
import { Nav, Page, Button, Field, Input } from '@/components/ui'
import { useUserSettings } from '@/hooks/dashboard'

export default function SettingsPage() {
  const settings = useUserSettings()
  const [newPerDay, setNewPerDay] = useState<number | null>(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingName, setSavingName] = useState(false)
  const [saved, setSaved] = useState(false)
  const [nameSaved, setNameSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)

  useEffect(() => {
    if (settings.data && !loaded) {
      setNewPerDay(settings.data.daily_new_limit)
      setFirstName(settings.data.first_name ?? '')
      setLastName(settings.data.last_name ?? '')
      setLoaded(true)
    }
  }, [settings.data, loaded])

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

  const handleSaveName = async () => {
    setSavingName(true)
    setNameError(null)
    setNameSaved(false)
    try {
      const res = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ first_name: firstName, last_name: lastName }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setNameError(body.error ?? `Save failed (${res.status})`)
      } else {
        setNameSaved(true)
      }
    } catch {
      setNameError('Network error — please try again.')
    }
    setSavingName(false)
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

        {!loaded ? (
          <div style={{ color: 'var(--muted)', marginTop: 48 }}>Loading…</div>
        ) : (
          <>
            <div style={{ marginTop: 48, padding: '32px 36px', border: '1px solid var(--line)', background: 'var(--bg-2)', maxWidth: 720 }}>
              <div className="mono" style={{ color: 'var(--muted)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 18 }}>
                Profile
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <Field label="First name">
                  <Input value={firstName} onChange={(e) => { setFirstName(e.target.value); setNameSaved(false) }} maxLength={60} placeholder="Optional" />
                </Field>
                <Field label="Last name">
                  <Input value={lastName} onChange={(e) => { setLastName(e.target.value); setNameSaved(false) }} maxLength={60} placeholder="Optional" />
                </Field>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 4 }}>
                <Button onClick={handleSaveName} disabled={savingName}>
                  {savingName ? 'Saving…' : 'Save name'}
                </Button>
                {nameSaved && (
                  <span className="mono" style={{ color: 'var(--good)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                    ✓ Saved
                  </span>
                )}
                {nameError && (
                  <span className="mono" style={{ color: 'var(--bad)', fontSize: 11 }}>{nameError}</span>
                )}
              </div>
            </div>

            {newPerDay !== null && (
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
            )}

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
