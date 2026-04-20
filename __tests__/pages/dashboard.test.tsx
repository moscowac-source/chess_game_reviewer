import { render, screen, waitFor } from '@testing-library/react'
import DashboardPage from '@/app/dashboard/page'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard',
}))

interface FetchMocks {
  counts?: Record<string, number>
  session?: { cards: unknown[]; totalDue: number; newCardsToday: number }
  syncStatus?: unknown
  streak?: { streak: number }
  accuracy?: { accuracy: number | null; totalReviews: number }
  classification?: { blunder: number; mistake: number; great: number; brilliant: number }
}

function mockFetches(mocks: FetchMocks) {
  global.fetch = jest.fn().mockImplementation((url: string) => {
    const ok = (data: unknown) => Promise.resolve({ ok: true, json: async () => data })
    if (url === '/api/review/counts') return ok(mocks.counts ?? { standard: 0, recent: 0, mistakes: 0, brilliancies: 0 })
    if (url.startsWith('/api/review/session')) return ok(mocks.session ?? { cards: [], totalDue: 0, newCardsToday: 0 })
    if (url === '/api/sync/status') return ok(mocks.syncStatus ?? null)
    if (url === '/api/stats/streak') return ok(mocks.streak ?? { streak: 0 })
    if (url.startsWith('/api/stats/accuracy')) return ok(mocks.accuracy ?? { accuracy: null, totalReviews: 0 })
    if (url === '/api/stats/classification') return ok(mocks.classification ?? { blunder: 0, mistake: 0, great: 0, brilliant: 0 })
    throw new Error(`Unexpected fetch: ${url}`)
  })
}

beforeEach(() => {
  jest.restoreAllMocks()
})

describe('Dashboard — Deck breakdown', () => {
  it('renders a deck breakdown tile for each classification with counts from the API', async () => {
    mockFetches({
      classification: { blunder: 12, mistake: 8, great: 4, brilliant: 2 },
    })
    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByTestId('breakdown-blunder')).toHaveTextContent('12')
      expect(screen.getByTestId('breakdown-mistake')).toHaveTextContent('8')
      expect(screen.getByTestId('breakdown-great')).toHaveTextContent('4')
      expect(screen.getByTestId('breakdown-brilliant')).toHaveTextContent('2')
    })
  })

  it('shows zero values when the user has no cards', async () => {
    mockFetches({
      classification: { blunder: 0, mistake: 0, great: 0, brilliant: 0 },
    })
    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByTestId('breakdown-blunder')).toHaveTextContent('0')
      expect(screen.getByTestId('breakdown-mistake')).toHaveTextContent('0')
      expect(screen.getByTestId('breakdown-great')).toHaveTextContent('0')
      expect(screen.getByTestId('breakdown-brilliant')).toHaveTextContent('0')
    })
  })
})
