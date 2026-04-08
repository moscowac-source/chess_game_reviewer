import { render, screen, waitFor } from '@testing-library/react'
import HomePage from '@/app/page'

// Mock next/navigation (used by Link internally in tests)
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))

function mockCountsFetch(counts: Record<string, number>) {
  global.fetch = jest.fn().mockImplementation((url: string) => {
    if (url === '/api/review/counts') {
      return Promise.resolve({ ok: true, json: async () => counts })
    }
    if (url === '/api/sync/status') {
      return Promise.resolve({ ok: true, json: async () => null })
    }
    throw new Error(`Unexpected fetch: ${url}`)
  })
}

beforeEach(() => {
  jest.restoreAllMocks()
})

describe('Home Page — Mode Selection', () => {
  // -------------------------------------------------------------------------
  // Test 1: all four modes are rendered
  // -------------------------------------------------------------------------
  it('renders all four mode cards', async () => {
    mockCountsFetch({ standard: 5, recent: 2, mistakes: 3, brilliancies: 1 })
    render(<HomePage />)

    await waitFor(() => {
      expect(screen.getByTestId('mode-standard')).toBeInTheDocument()
      expect(screen.getByTestId('mode-recent')).toBeInTheDocument()
      expect(screen.getByTestId('mode-mistakes')).toBeInTheDocument()
      expect(screen.getByTestId('mode-brilliancies')).toBeInTheDocument()
    })
  })

  // -------------------------------------------------------------------------
  // Test 2: each mode card shows the due-card count
  // -------------------------------------------------------------------------
  it('shows the due-card count on each mode card', async () => {
    mockCountsFetch({ standard: 7, recent: 3, mistakes: 4, brilliancies: 0 })
    render(<HomePage />)

    await waitFor(() => {
      expect(screen.getByTestId('mode-standard')).toHaveTextContent('7')
      expect(screen.getByTestId('mode-recent')).toHaveTextContent('3')
      expect(screen.getByTestId('mode-mistakes')).toHaveTextContent('4')
      expect(screen.getByTestId('mode-brilliancies')).toHaveTextContent('0')
    })
  })

  // -------------------------------------------------------------------------
  // Test 3: each mode card links to /review?mode=X
  // -------------------------------------------------------------------------
  it('each mode card links to the correct review URL', async () => {
    mockCountsFetch({ standard: 1, recent: 1, mistakes: 1, brilliancies: 1 })
    render(<HomePage />)

    await waitFor(() => {
      const standardLink = screen.getByTestId('mode-standard').closest('a')
      const recentLink   = screen.getByTestId('mode-recent').closest('a')
      const mistakesLink = screen.getByTestId('mode-mistakes').closest('a')
      const brillianciesLink = screen.getByTestId('mode-brilliancies').closest('a')

      expect(standardLink).toHaveAttribute('href', '/review?mode=standard')
      expect(recentLink).toHaveAttribute('href', '/review?mode=recent')
      expect(mistakesLink).toHaveAttribute('href', '/review?mode=mistakes')
      expect(brillianciesLink).toHaveAttribute('href', '/review?mode=brilliancies')
    })
  })
})
