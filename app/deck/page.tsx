'use client'

import { Nav, Page, Button } from '@/components/ui'
import { useRouter } from 'next/navigation'

export default function DeckPage() {
  const router = useRouter()

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

        {/* Placeholder — deck browser not yet implemented */}
        <div style={{
          border: '1px solid var(--line)', padding: '80px 40px', textAlign: 'center',
          background: 'var(--bg-2)', marginTop: 32,
        }}>
          <div className="mono" style={{ color: 'var(--muted)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 20 }}>
            Coming soon
          </div>
          <h2 className="serif" style={{ fontSize: 36, letterSpacing: '-0.02em', margin: '0 0 16px', fontWeight: 400 }}>
            Deck browser needs a new API.
          </h2>
          <p style={{ color: 'var(--ink-2)', lineHeight: 1.6, maxWidth: 520, margin: '0 auto 32px' }}>
            This view requires a <code className="mono" style={{ background: 'var(--bg)', padding: '2px 6px', fontSize: 12 }}>GET /api/deck</code> route
            that joins <code className="mono" style={{ background: 'var(--bg)', padding: '2px 6px', fontSize: 12 }}>card_state</code> with <code className="mono" style={{ background: 'var(--bg)', padding: '2px 6px', fontSize: 12 }}>cards</code> for the authenticated user,
            and returns FEN, classification, due date, and review count for each card. See the callout list in the implementation plan.
          </p>
          <Button variant="secondary" onClick={() => router.push('/review')}>
            Go to review instead →
          </Button>
        </div>
      </Page>
    </>
  )
}
