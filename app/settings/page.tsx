'use client'

import { useEffect, useState } from 'react'
import { Nav, Page, Button, Field, Input } from '@/components/ui'
import { useUserSettings } from '@/hooks/dashboard'
import { useChessComVerify } from '@/hooks/use-chess-com-verify'

export default function SettingsPage() {
  const settings = useUserSettings()
  const [newPerDay, setNewPerDay] = useState<number | null>(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [chessComUsername, setChessComUsername] = useState('')
  const [initialChessComUsername, setInitialChessComUsername] = useState('')
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
      setChessComUsername(settings.data.chess_com_username ?? '')
      setInitialChessComUsername(settings.data.chess_com_username ?? '')
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

            <div style={{ marginTop: 48, padding: '32px 36px', border: '1px solid var(--line)', background: 'var(--bg-2)', maxWidth: 720 }}>
              <div className="mono" style={{ color: 'var(--muted)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 18 }}>
                Connected accounts
              </div>

              <ChessComProviderRow
                initialUsername={initialChessComUsername}
                username={chessComUsername}
                setUsername={setChessComUsername}
                onSaved={(saved) => setInitialChessComUsername(saved)}
              />

              <LichessProviderRow />
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

function ProviderRow({
  label,
  children,
  disabled,
}: {
  label: string
  children: React.ReactNode
  disabled?: boolean
}) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '160px 1fr', gap: 24,
      padding: '20px 0', borderTop: '1px solid var(--line)',
      opacity: disabled ? 0.5 : 1,
    }}>
      <div className="mono" style={{
        color: 'var(--ink)', fontSize: 12, letterSpacing: '0.06em',
        textTransform: 'uppercase', alignSelf: 'center',
      }}>
        {label}
      </div>
      <div>{children}</div>
    </div>
  )
}

interface ChessComProviderRowProps {
  initialUsername: string
  username: string
  setUsername: (v: string) => void
  onSaved: (saved: string) => void
}

function ChessComProviderRow({ initialUsername, username, setUsername, onSaved }: ChessComProviderRowProps) {
  const { verify, verifying, verified, error: verifyError, reset } = useChessComVerify()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const trimmed = username.trim()
  const dirty = trimmed !== initialUsername.trim()
  const canSave = verified && dirty && !saving

  async function handleVerify() {
    setSaved(false)
    setSaveError(null)
    await verify(username)
  }

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    setSaveError(null)
    setSaved(false)
    try {
      const res = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chess_com_username: trimmed }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setSaveError(body.error ?? `Save failed (${res.status})`)
      } else {
        setSaved(true)
        onSaved(trimmed)
      }
    } catch {
      setSaveError('Network error — please try again.')
    }
    setSaving(false)
  }

  return (
    <ProviderRow label="Chess.com">
      <Field label="Username" hint="Case-insensitive. Verify it exists on Chess.com before saving.">
        <div style={{ display: 'flex', gap: 8 }}>
          <Input
            value={username}
            onChange={(e) => {
              setUsername(e.target.value)
              reset()
              setSaved(false)
              setSaveError(null)
            }}
            style={{ flex: 1 }}
            placeholder="your_handle"
            maxLength={50}
          />
          <Button variant="secondary" onClick={handleVerify} disabled={verifying || verified || !trimmed}>
            {verifying ? 'Checking…' : verified ? '✓ Verified' : 'Verify'}
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </Field>
      <div style={{ marginTop: 4, minHeight: 16, display: 'flex', gap: 14, alignItems: 'center' }}>
        {verifyError && (
          <span className="mono" style={{ color: 'var(--bad)', fontSize: 11 }}>{verifyError}</span>
        )}
        {saveError && (
          <span className="mono" style={{ color: 'var(--bad)', fontSize: 11 }}>{saveError}</span>
        )}
        {saved && (
          <span className="mono" style={{ color: 'var(--good)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            ✓ Saved
          </span>
        )}
      </div>
    </ProviderRow>
  )
}

function LichessProviderRow() {
  return (
    <ProviderRow label="Lichess" disabled>
      <Field label="Username" hint="Coming soon.">
        <div style={{ display: 'flex', gap: 8 }}>
          <Input value="" disabled placeholder="Not yet supported" style={{ flex: 1 }} />
          <Button variant="secondary" disabled>Verify</Button>
          <Button disabled>Save</Button>
        </div>
      </Field>
    </ProviderRow>
  )
}
