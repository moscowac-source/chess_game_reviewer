import { render, screen, waitFor } from '@testing-library/react'
import DashboardPage from '@/app/dashboard/page'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard',
}))

interface RecentGame {
  id: string
  played_at: string
  white: string | null
  black: string | null
  result: string | null
  url: string | null
  eco: string | null
  opponent: string | null
  outcome: 'win' | 'loss' | 'draw' | 'unknown'
  cardCount: number
}

interface FetchMocks {
  counts?: Record<string, number>
  session?: { cards: unknown[]; totalDue: number; newCardsToday: number }
  syncStatus?: unknown
  streak?: { streak: number }
  accuracy?: { accuracy: number | null; totalReviews: number }
  classification?: { blunder: number; mistake: number; great: number; brilliant: number }
  recentGames?: RecentGame[]
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
    if (url.startsWith('/api/games/recent')) return ok(mocks.recentGames ?? [])
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

describe('Dashboard — Recent games panel', () => {
  const SAMPLE_GAMES: RecentGame[] = [
    {
      id: 'g1',
      played_at: '2024-03-14T18:45:12.000Z',
      white: 'alice',
      black: 'bob',
      result: '1-0',
      url: 'https://www.chess.com/game/live/1',
      eco: 'C50',
      opponent: 'bob',
      outcome: 'win',
      cardCount: 3,
    },
    {
      id: 'g2',
      played_at: '2024-03-13T09:00:00.000Z',
      white: 'eve',
      black: 'alice',
      result: '1-0',
      url: 'https://www.chess.com/game/live/2',
      eco: 'B12',
      opponent: 'eve',
      outcome: 'loss',
      cardCount: 2,
    },
    {
      id: 'g3',
      played_at: '2024-03-12T19:20:00.000Z',
      white: 'alice',
      black: 'zach',
      result: '1/2-1/2',
      url: 'https://www.chess.com/game/live/3',
      eco: 'E60',
      opponent: 'zach',
      outcome: 'draw',
      cardCount: 0,
    },
  ]

  it('renders one row per recent game with opponent, outcome, card count, and eco', async () => {
    mockFetches({ recentGames: SAMPLE_GAMES })
    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByTestId('recent-games')).toBeInTheDocument()
    })

    expect(screen.getAllByTestId(/^recent-game-/)).toHaveLength(3)
    expect(screen.getByTestId('recent-game-g1')).toHaveTextContent('bob')
    expect(screen.getByTestId('recent-game-g1')).toHaveTextContent(/win/i)
    expect(screen.getByTestId('recent-game-g1')).toHaveTextContent('3')
    expect(screen.getByTestId('recent-game-g1')).toHaveTextContent('C50')

    expect(screen.getByTestId('recent-game-g2')).toHaveTextContent('eve')
    expect(screen.getByTestId('recent-game-g2')).toHaveTextContent(/loss/i)

    expect(screen.getByTestId('recent-game-g3')).toHaveTextContent(/draw/i)
  })

  it('each row links out to the chess.com url when present', async () => {
    mockFetches({ recentGames: SAMPLE_GAMES })
    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByTestId('recent-game-g1')).toBeInTheDocument()
    })

    const row = screen.getByTestId('recent-game-g1')
    expect(row.tagName).toBe('A')
    expect(row.getAttribute('href')).toBe('https://www.chess.com/game/live/1')
    expect(row.getAttribute('target')).toBe('_blank')
    expect(row.getAttribute('rel')).toContain('noopener')
  })

  it('hides the entire panel when there are no recent games', async () => {
    mockFetches({ recentGames: [] })
    render(<DashboardPage />)

    // Wait for the classification fetch (which is always made) to complete,
    // so we can be sure the dashboard has settled before asserting absence.
    await waitFor(() => {
      expect(screen.getByTestId('breakdown-blunder')).toBeInTheDocument()
    })

    expect(screen.queryByTestId('recent-games')).not.toBeInTheDocument()
  })
})
