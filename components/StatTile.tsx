import type { ReactNode } from 'react'

export interface StatTileProps {
  label: string
  value: ReactNode
  loading: boolean
  error: Error | null
  onRetry: () => void
  mono?: boolean
}

export function StatTile({ label, value, loading, error, onRetry, mono }: StatTileProps) {
  const bigStyle = {
    fontFamily: mono ? 'var(--mono)' : 'var(--serif)',
    fontSize: mono ? 32 : 44,
    letterSpacing: '-0.02em',
    lineHeight: 1,
  } as const

  let body: ReactNode
  if (loading) {
    body = <span data-testid={`stat-${label}-loading`} style={{ ...bigStyle, opacity: 0.3 }}>…</span>
  } else if (error) {
    body = (
      <button
        type="button"
        data-testid={`stat-${label}-error`}
        onClick={onRetry}
        className="mono"
        style={{
          fontSize: 11,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--bad)',
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          textAlign: 'left',
          lineHeight: 1.2,
        }}
      >
        Couldn&rsquo;t load — retry
      </button>
    )
  } else {
    body = (
      <div data-testid={`stat-${label}-value`} style={bigStyle}>
        {value ?? '—'}
      </div>
    )
  }

  return (
    <div>
      {body}
      <div className="mono" style={{ color: 'var(--muted)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 10 }}>
        {label}
      </div>
    </div>
  )
}
