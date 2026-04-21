'use client'

import { Nav, Page, Button } from './ui'

export function DashboardCrashed() {
  return (
    <>
      <Nav />
      <Page>
        <div data-testid="dashboard-crashed" style={{ padding: '80px 0', textAlign: 'center' }}>
          <div className="mono" style={{ color: 'var(--muted)', fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 18 }}>
            Something went wrong
          </div>
          <h1 className="serif" style={{ fontSize: 44, letterSpacing: '-0.025em', margin: 0, fontWeight: 400 }}>
            The dashboard couldn&rsquo;t render.
          </h1>
          <p style={{ color: 'var(--ink-2)', fontSize: 16, lineHeight: 1.55, maxWidth: 480, margin: '20px auto 32px' }}>
            Reloading usually fixes it. If the problem keeps happening, the sync or stats endpoints may be returning unexpected data.
          </p>
          <Button size="lg" onClick={() => window.location.reload()}>Reload dashboard</Button>
        </div>
      </Page>
    </>
  )
}
