import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SyncStatus from '@/components/SyncStatus'

const FIXTURE_STATUS = {
  id: 'log-1',
  user_id: 'dev-user',
  mode: 'incremental' as const,
  started_at: '2024-06-15T10:00:00Z',
  completed_at: '2024-06-15T10:01:00Z',
  games_processed: 12,
  cards_created: 5,
  error: null,
}

function makeFetcher(handlers: Record<string, () => unknown>) {
  return (url: string, init?: RequestInit) => {
    const method = (init?.method ?? 'GET').toUpperCase()
    const key = `${method} ${url}`
    if (key in handlers) {
      return Promise.resolve({ ok: true, json: async () => handlers[key]() })
    }
    throw new Error(`Unexpected fetch: ${key}`)
  }
}

// ---------------------------------------------------------------------------
// Test 1: renders last sync time, game count, card count
// ---------------------------------------------------------------------------
it('renders last sync time, games processed, and cards created', async () => {
  const fetcher = makeFetcher({
    'GET /api/sync/status': () => FIXTURE_STATUS,
  })

  render(<SyncStatus fetcher={fetcher as typeof fetch} />)

  await waitFor(() => {
    expect(screen.getByTestId('sync-games')).toHaveTextContent('12')
    expect(screen.getByTestId('sync-cards')).toHaveTextContent('5')
    expect(screen.getByTestId('sync-time')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Test 2: shows error message when last sync had an error
// ---------------------------------------------------------------------------
it('shows error state when last sync failed', async () => {
  const fetcher = makeFetcher({
    'GET /api/sync/status': () => ({ ...FIXTURE_STATUS, error: 'Failed to fetch games' }),
  })

  render(<SyncStatus fetcher={fetcher as typeof fetch} />)

  await waitFor(() => {
    expect(screen.getByTestId('sync-error')).toHaveTextContent('Failed to fetch games')
  })
})

// ---------------------------------------------------------------------------
// Test 3: shows "Never synced" when status is null
// ---------------------------------------------------------------------------
it('shows never-synced state when no sync has run', async () => {
  const fetcher = makeFetcher({
    'GET /api/sync/status': () => null,
  })

  render(<SyncStatus fetcher={fetcher as typeof fetch} />)

  await waitFor(() => {
    expect(screen.getByTestId('sync-never')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Test 4: "Sync Now" button calls POST /api/sync with mode=incremental
// ---------------------------------------------------------------------------
it('Sync Now button calls POST /api/sync with mode incremental', async () => {
  const syncResponse = { gamesProcessed: 3, cardsCreated: 1, errors: [] }
  const postSpy = jest.fn().mockResolvedValue({ ok: true, json: async () => syncResponse })

  const fetcher = jest.fn().mockImplementation((url: string, init?: RequestInit) => {
    if (url === '/api/sync/status') {
      return Promise.resolve({ ok: true, json: async () => FIXTURE_STATUS })
    }
    if (url === '/api/sync' && (init?.method ?? '').toUpperCase() === 'POST') {
      return postSpy(url, init)
    }
    throw new Error(`Unexpected fetch: ${url}`)
  })

  render(<SyncStatus fetcher={fetcher as typeof fetch} />)
  await waitFor(() => screen.getByTestId('sync-now-button'))

  await userEvent.click(screen.getByTestId('sync-now-button'))

  expect(postSpy).toHaveBeenCalledWith(
    '/api/sync',
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ mode: 'incremental' }),
    })
  )
})

// ---------------------------------------------------------------------------
// Test 5: shows loading indicator while sync is running
// ---------------------------------------------------------------------------
it('shows loading indicator while sync is in progress', async () => {
  let resolveSync!: (v: unknown) => void
  const syncPromise = new Promise((res) => { resolveSync = res })

  const fetcher = jest.fn().mockImplementation((url: string, init?: RequestInit) => {
    if (url === '/api/sync/status') {
      return Promise.resolve({ ok: true, json: async () => FIXTURE_STATUS })
    }
    if (url === '/api/sync' && (init?.method ?? '').toUpperCase() === 'POST') {
      return syncPromise
    }
    throw new Error(`Unexpected fetch: ${url}`)
  })

  render(<SyncStatus fetcher={fetcher as typeof fetch} />)
  await waitFor(() => screen.getByTestId('sync-now-button'))

  await userEvent.click(screen.getByTestId('sync-now-button'))

  expect(screen.getByTestId('sync-loading')).toBeInTheDocument()

  // Clean up — resolve so no pending async work remains
  resolveSync({ ok: true, json: async () => ({ gamesProcessed: 0, cardsCreated: 0, errors: [] }) })
})

// ---------------------------------------------------------------------------
// Test 6: status refreshes after sync completes
// ---------------------------------------------------------------------------
it('refreshes status after sync completes', async () => {
  const updatedStatus = { ...FIXTURE_STATUS, games_processed: 20, cards_created: 8 }
  let statusCallCount = 0

  const fetcher = jest.fn().mockImplementation((url: string, init?: RequestInit) => {
    if (url === '/api/sync/status') {
      statusCallCount++
      const data = statusCallCount === 1 ? FIXTURE_STATUS : updatedStatus
      return Promise.resolve({ ok: true, json: async () => data })
    }
    if (url === '/api/sync' && (init?.method ?? '').toUpperCase() === 'POST') {
      return Promise.resolve({ ok: true, json: async () => ({ gamesProcessed: 8, cardsCreated: 3, errors: [] }) })
    }
    throw new Error(`Unexpected fetch: ${url}`)
  })

  render(<SyncStatus fetcher={fetcher as typeof fetch} />)
  await waitFor(() => screen.getByTestId('sync-games'))
  expect(screen.getByTestId('sync-games')).toHaveTextContent('12')

  await userEvent.click(screen.getByTestId('sync-now-button'))

  await waitFor(() => {
    expect(screen.getByTestId('sync-games')).toHaveTextContent('20')
    expect(screen.getByTestId('sync-cards')).toHaveTextContent('8')
  })
})
