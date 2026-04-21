'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Nav, Page, Button, Tag, BoardCard } from '@/components/ui'
import { useDeck, type DeckItem } from '@/hooks/dashboard'

const CLASSIFICATIONS = [
  { value: '', label: 'All' },
  { value: 'blunder', label: 'Blunder' },
  { value: 'mistake', label: 'Mistake' },
  { value: 'great', label: 'Great' },
  { value: 'brilliant', label: 'Brilliant' },
]

const THEMES = [
  { value: '', label: 'All' },
  { value: 'opening', label: 'Opening' },
  { value: 'endgame', label: 'Endgame' },
  { value: 'tactics', label: 'Tactics' },
]

const SORTS = [
  { value: 'due', label: 'Next due' },
  { value: 'reviews', label: 'Most reviewed' },
  { value: 'created', label: 'Newest' },
]

const PAGE_SIZE = 24

function formatDue(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = d.getTime() - now.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays <= 0) return 'Due now'
  if (diffDays === 1) return 'Due in 1 day'
  return `Due in ${diffDays} days`
}

type TagKind = 'blunder' | 'mistake' | 'great' | 'brilliant' | 'neutral'

function toTagKind(classification: string): TagKind {
  if (classification === 'blunder' || classification === 'mistake'
    || classification === 'great' || classification === 'brilliant') {
    return classification
  }
  return 'neutral'
}

export default function DeckPage() {
  const router = useRouter()
  const [classification, setClassification] = useState('')
  const [theme, setTheme] = useState('')
  const [sort, setSort] = useState('due')
  const [offset, setOffset] = useState(0)

  const params = useMemo(() => ({
    classification: classification || undefined,
    theme: theme || undefined,
    sort,
    limit: PAGE_SIZE,
    offset,
  }), [classification, theme, sort, offset])

  const { data, loading, error } = useDeck(params)

  const items: DeckItem[] = data?.items ?? []
  const total = data?.total ?? 0
  const hasMore = offset + PAGE_SIZE < total

  const onFilterChange = (fn: () => void) => {
    setOffset(0)
    fn()
  }

  return (
    <>
      <Nav />
      <Page wide>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'end',
          marginBottom: 28, paddingBottom: 24, borderBottom: '1px solid var(--line)',
        }}>
          <div>
            <div className="mono" style={{ color: 'var(--muted)', fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 14 }}>
              Your deck
            </div>
            <h1 className="serif" style={{ fontSize: 56, letterSpacing: '-0.03em', margin: 0, lineHeight: 1, fontWeight: 400 }}>
              Every position, filed.
            </h1>
          </div>
          <Button onClick={() => router.push('/review')}>Review due cards →</Button>
        </div>

        <div style={{
          display: 'flex', gap: 24, alignItems: 'flex-end', flexWrap: 'wrap',
          padding: '18px 24px', background: 'var(--bg-2)', border: '1px solid var(--line)',
          marginBottom: 32,
        }}>
          <FilterGroup label="Classification">
            {CLASSIFICATIONS.map((c) => (
              <FilterChip key={c.value || 'all-c'} active={classification === c.value}
                onClick={() => onFilterChange(() => setClassification(c.value))}>
                {c.label}
              </FilterChip>
            ))}
          </FilterGroup>
          <FilterGroup label="Theme">
            {THEMES.map((t) => (
              <FilterChip key={t.value || 'all-t'} active={theme === t.value}
                onClick={() => onFilterChange(() => setTheme(t.value))}>
                {t.label}
              </FilterChip>
            ))}
          </FilterGroup>
          <FilterGroup label="Sort">
            <select
              value={sort}
              onChange={(e) => onFilterChange(() => setSort(e.target.value))}
              className="mono"
              data-testid="deck-sort"
              style={{
                padding: '8px 10px', border: '1px solid var(--line)',
                background: 'var(--bg)', color: 'var(--ink)', fontSize: 12,
                textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer',
              }}
            >
              {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </FilterGroup>
          <div style={{ marginLeft: 'auto' }} className="mono">
            <span style={{ color: 'var(--muted)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              {total} {total === 1 ? 'card' : 'cards'}
            </span>
          </div>
        </div>

        {loading && items.length === 0 && (
          <div style={{ color: 'var(--muted)', marginTop: 48 }}>Loading…</div>
        )}

        {error && !loading && (
          <div style={{ color: 'var(--bad)', marginTop: 24 }}>
            Could not load deck. {error.message}
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div style={{
            border: '1px solid var(--line)', padding: '64px 40px', textAlign: 'center',
            background: 'var(--bg-2)',
          }}>
            <div className="mono" style={{ color: 'var(--muted)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 16 }}>
              Empty
            </div>
            <h2 className="serif" style={{ fontSize: 28, letterSpacing: '-0.02em', margin: '0 0 12px', fontWeight: 400 }}>
              No cards match this filter.
            </h2>
            <p style={{ color: 'var(--ink-2)', lineHeight: 1.6 }}>
              Try clearing the classification or theme filter.
            </p>
          </div>
        )}

        {items.length > 0 && (
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
              gap: 24,
            }}>
              {items.map((item) => (
                <DeckCard key={item.id} item={item} onOpen={() => router.push(`/review?cardId=${item.id}`)} />
              ))}
            </div>
            {hasMore && (
              <div style={{ textAlign: 'center', marginTop: 40 }}>
                <Button variant="secondary" onClick={() => setOffset(offset + PAGE_SIZE)}>
                  Load more
                </Button>
              </div>
            )}
          </>
        )}
      </Page>
    </>
  )
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mono" style={{ color: 'var(--muted)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{children}</div>
    </div>
  )
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mono"
      style={{
        padding: '6px 12px',
        border: '1px solid var(--line)',
        background: active ? 'var(--ink)' : 'var(--bg)',
        color: active ? 'var(--bg)' : 'var(--ink)',
        fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}

function DeckCard({ item, onOpen }: { item: DeckItem; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      data-testid={`deck-card-${item.id}`}
      style={{
        display: 'flex', flexDirection: 'column', gap: 12,
        padding: 16,
        background: 'var(--bg)', border: '1px solid var(--line)',
        textAlign: 'left', cursor: 'pointer',
        transition: 'border-color 120ms',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--ink)' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--line)' }}
    >
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <BoardCard fen={item.fen} size={180} />
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <Tag kind={toTagKind(item.classification)}>{item.classification}</Tag>
        {item.theme && <Tag>{item.theme}</Tag>}
      </div>
      <div className="mono" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, letterSpacing: '0.12em', color: 'var(--muted)', textTransform: 'uppercase' }}>
        <span>{formatDue(item.due_date)}</span>
        <span>{item.review_count} {item.review_count === 1 ? 'review' : 'reviews'}</span>
      </div>
    </button>
  )
}
