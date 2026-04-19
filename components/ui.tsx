'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { CSSProperties, ReactNode, InputHTMLAttributes } from 'react'

// ── FEN utilities (no chess.js dependency needed for rendering) ────────────

function parseFENRows(fen: string): (string | null)[][] {
  const [placement] = fen.split(' ')
  return placement.split('/').map((row) => {
    const squares: (string | null)[] = []
    for (const ch of row) {
      if (/\d/.test(ch)) {
        squares.push(...Array(parseInt(ch, 10)).fill(null))
      } else {
        squares.push(ch)
      }
    }
    return squares
  })
}

const PIECE_GLYPHS: Record<string, string> = {
  K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙',
  k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟︎',
}

// ── Logo ──────────────────────────────────────────────────────────────────

export function Logo({ size = 20 }: { size?: number }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
        <rect x="3" y="3" width="9" height="9" fill="currentColor" />
        <rect x="12" y="12" width="9" height="9" fill="currentColor" />
        <rect x="12" y="3" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <rect x="3" y="12" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <span className="serif" style={{ fontSize: 18, letterSpacing: '-0.02em' }}>Pattern</span>
    </div>
  )
}

// ── Nav ───────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Today' },
  { path: '/review', label: 'Review' },
  { path: '/deck', label: 'Deck' },
  { path: '/sync', label: 'Sync' },
]

export function Nav() {
  const pathname = usePathname()

  return (
    <header style={{
      display: 'flex', alignItems: 'center', gap: 28,
      padding: '18px 32px',
      borderBottom: '1px solid var(--line)',
      position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 10,
    }}>
      <Link href="/dashboard" style={{ display: 'flex' }}><Logo /></Link>
      <nav style={{ display: 'flex', gap: 24 }}>
        {NAV_ITEMS.map(({ path, label }) => (
          <Link
            key={path}
            href={path}
            className="mono"
            style={{
              color: pathname.startsWith(path) ? 'var(--ink)' : 'var(--muted)',
              borderBottom: pathname.startsWith(path) ? '1px solid var(--ink)' : '1px solid transparent',
              paddingBottom: 2,
              textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.12em',
            }}
          >
            {label}
          </Link>
        ))}
      </nav>
      <div style={{ marginLeft: 'auto' }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: 'var(--ink)', color: 'var(--bg)',
          display: 'grid', placeItems: 'center',
          fontFamily: 'var(--serif)', fontSize: 13,
        }}>
          C
        </div>
      </div>
    </header>
  )
}

// ── Button ────────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'amber'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps {
  children: ReactNode
  onClick?: () => void
  variant?: ButtonVariant
  size?: ButtonSize
  style?: CSSProperties
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}

const BTN_SIZES: Record<ButtonSize, CSSProperties> = {
  sm: { padding: '8px 14px', fontSize: 13 },
  md: { padding: '12px 20px', fontSize: 14 },
  lg: { padding: '16px 28px', fontSize: 15 },
}

const BTN_VARIANTS: Record<ButtonVariant, CSSProperties> = {
  primary:   { background: 'var(--ink)',   color: 'var(--bg)',  border: '1px solid var(--ink)' },
  secondary: { background: 'transparent',  color: 'var(--ink)', border: '1px solid var(--line)' },
  ghost:     { background: 'transparent',  color: 'var(--ink)', border: '1px solid transparent' },
  amber:     { background: 'var(--amber)', color: 'var(--ink)', border: '1px solid var(--amber)' },
}

export function Button({ children, onClick, variant = 'primary', size = 'md', style, disabled, type }: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        fontFamily: 'var(--sans)', fontWeight: 500,
        borderRadius: 'var(--radius)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 160ms ease',
        ...BTN_SIZES[size],
        ...BTN_VARIANTS[variant],
        ...(style ?? {}),
      }}
    >
      {children}
    </button>
  )
}

// ── Tag ───────────────────────────────────────────────────────────────────

type TagKind = 'blunder' | 'mistake' | 'brilliant' | 'great' | 'neutral'

const TAG_COLORS: Record<TagKind, { bg: string; fg: string }> = {
  blunder:   { bg: 'rgba(166,74,63,0.12)',  fg: 'var(--bad)' },
  mistake:   { bg: 'rgba(166,74,63,0.08)',  fg: '#8a5b4a' },
  brilliant: { bg: 'rgba(79,107,74,0.15)',  fg: 'var(--good)' },
  great:     { bg: 'rgba(79,107,74,0.10)',  fg: 'var(--good)' },
  neutral:   { bg: 'var(--line-2)',          fg: 'var(--muted)' },
}

export function Tag({ children, kind }: { children: ReactNode; kind?: TagKind }) {
  const c = TAG_COLORS[kind ?? 'neutral']
  return (
    <span
      className="mono"
      style={{
        background: c.bg, color: c.fg,
        padding: '3px 8px',
        textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.14em',
        borderRadius: 2,
      }}
    >
      {children}
    </span>
  )
}

// ── Divider ───────────────────────────────────────────────────────────────

export function Divider({ label }: { label?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0' }}>
      <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
      {label && (
        <span className="mono" style={{ color: 'var(--muted)', textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.14em' }}>
          {label}
        </span>
      )}
      <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
    </div>
  )
}

// ── Field + Input ─────────────────────────────────────────────────────────

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label style={{ display: 'block', marginBottom: 18 }}>
      <div className="mono" style={{ color: 'var(--muted)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>
        {label}
      </div>
      {children}
      {hint && <div className="mono" style={{ color: 'var(--muted)', fontSize: 11, marginTop: 6 }}>{hint}</div>}
    </label>
  )
}

export function Input({ style, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        width: '100%', background: 'var(--bg)', border: '1px solid var(--line)',
        padding: '12px 14px', fontSize: 14,
        borderRadius: 'var(--radius)', outline: 'none',
        transition: 'border-color 120ms',
        ...(style ?? {}),
      }}
      onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--ink)'; props.onFocus?.(e) }}
      onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--line)'; props.onBlur?.(e) }}
    />
  )
}

// ── Stat ──────────────────────────────────────────────────────────────────

export function Stat({ big, label, mono, sub }: { big: ReactNode; label: string; mono?: boolean; sub?: string }) {
  return (
    <div>
      <div style={{ fontFamily: mono ? 'var(--mono)' : 'var(--serif)', fontSize: mono ? 32 : 44, letterSpacing: '-0.02em', lineHeight: 1 }}>
        {big}
      </div>
      <div className="mono" style={{ color: 'var(--muted)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 10 }}>
        {label}
      </div>
      {sub && <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────

export function Page({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <main style={{
      position: 'relative', zIndex: 1,
      maxWidth: wide ? 1280 : 1120,
      margin: '0 auto',
      padding: '40px 32px 80px',
    }}>
      {children}
    </main>
  )
}

// ── MiniBoard (48px thumbnail) ────────────────────────────────────────────

export function MiniBoard({ fen, size = 48 }: { fen: string; size?: number }) {
  const rows = parseFENRows(fen)
  return (
    <div style={{
      width: size, height: size,
      display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gridTemplateRows: 'repeat(8, 1fr)',
      border: '1px solid var(--line)', flexShrink: 0,
    }}>
      {rows.flatMap((row, r) =>
        row.map((piece, c) => {
          const light = (r + c) % 2 === 0
          return (
            <div
              key={`${r}-${c}`}
              style={{
                background: light ? 'var(--sq-light)' : 'var(--sq-dark)',
                display: 'grid', placeItems: 'center',
                fontSize: size / 11, lineHeight: 1,
                color: piece && piece === piece.toUpperCase() ? '#f8f4ea' : '#1a1a1a',
                textShadow: piece && piece === piece.toUpperCase() ? '0 1px 0 rgba(0,0,0,0.35), 0 0 1px #000' : 'none',
              }}
            >
              {piece ? PIECE_GLYPHS[piece] ?? '' : ''}
            </div>
          )
        })
      )}
    </div>
  )
}

// ── BoardCard (200px for deck view) ──────────────────────────────────────

export function BoardCard({ fen, size = 200 }: { fen: string; size?: number }) {
  const rows = parseFENRows(fen)
  return (
    <div style={{
      width: size, height: size,
      display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gridTemplateRows: 'repeat(8, 1fr)',
      border: '1px solid var(--line)',
    }}>
      {rows.flatMap((row, r) =>
        row.map((piece, c) => {
          const light = (r + c) % 2 === 0
          return (
            <div
              key={`${r}-${c}`}
              style={{
                background: light ? 'var(--sq-light)' : 'var(--sq-dark)',
                display: 'grid', placeItems: 'center',
                fontSize: size / 9.5, lineHeight: 1,
                color: piece && piece === piece.toUpperCase() ? '#f8f4ea' : '#1a1a1a',
                textShadow: piece && piece === piece.toUpperCase() ? '0 1px 0 rgba(0,0,0,0.35), 0 0 1px #000' : 'none',
              }}
            >
              {piece ? PIECE_GLYPHS[piece] ?? '' : ''}
            </div>
          )
        })
      )}
    </div>
  )
}

// ── LargeBoard (decorative, landing page hero) ────────────────────────────

export function LargeBoard({ fen, size = 480 }: { fen: string; size?: number }) {
  const rows = parseFENRows(fen)
  const sqSize = size / 8
  return (
    <div style={{
      width: size, height: size,
      display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gridTemplateRows: 'repeat(8, 1fr)',
      boxShadow: '0 30px 60px -30px rgba(26,26,26,0.35), 0 2px 0 rgba(26,26,26,0.04) inset',
      border: '1px solid var(--line)',
    }}>
      {rows.flatMap((row, r) =>
        row.map((piece, c) => {
          const light = (r + c) % 2 === 0
          return (
            <div
              key={`${r}-${c}`}
              style={{
                background: light ? 'var(--sq-light)' : 'var(--sq-dark)',
                display: 'grid', placeItems: 'center',
                fontSize: sqSize * 0.72, lineHeight: 1,
                color: piece && piece === piece.toUpperCase() ? '#f8f4ea' : '#1a1a1a',
                textShadow: piece && piece === piece.toUpperCase() ? '0 1px 0 rgba(0,0,0,0.35), 0 0 1px #000' : 'none',
              }}
            >
              {piece ? PIECE_GLYPHS[piece] ?? '' : ''}
            </div>
          )
        })
      )}
    </div>
  )
}
