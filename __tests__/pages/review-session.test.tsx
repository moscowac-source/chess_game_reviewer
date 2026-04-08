import { render, screen, waitFor, act } from '@testing-library/react'
import ReviewPage from '@/app/review/page'
import type { ReviewOutcome } from '@/lib/fsrs-engine'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const CARD_A = {
  cardId: 'card-aaaa',
  fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
  correctMove: 'e5',
  classification: 'blunder',
  isNew: false,
}

const CARD_B = {
  cardId: 'card-bbbb',
  fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2',
  correctMove: 'Nf3',
  classification: 'mistake',
  isNew: true,
}

function makeSession(cards: typeof CARD_A[]) {
  return { cards, totalDue: cards.length, newCardsToday: 0 }
}

// ── Mock ReviewBoard ──────────────────────────────────────────────────────────

let capturedOnResult: ((outcome: ReviewOutcome) => void) | null = null
let capturedFen: string | null = null

jest.mock('@/components/ReviewBoard', () => ({
  ReviewBoard: ({ fen, onResult }: { fen: string; correctMove: string; onResult: (o: ReviewOutcome) => void }) => {
    capturedOnResult = onResult
    capturedFen = fen
    return <div data-testid="review-board" data-fen={fen} />
  },
}))

// ── Mock fetch ────────────────────────────────────────────────────────────────

function mockFetch(sessionCards: typeof CARD_A[]) {
  const mock = jest.fn().mockImplementation((url: string, init?: RequestInit) => {
    if (url === '/api/review/session') {
      return Promise.resolve({
        ok: true,
        json: async () => makeSession(sessionCards),
      })
    }
    if (typeof url === 'string' && url.startsWith('/api/review/cards/') && init?.method === 'PATCH') {
      return Promise.resolve({ ok: true, json: async () => ({ success: true }) })
    }
    throw new Error(`Unexpected fetch: ${url}`)
  })
  global.fetch = mock
  return mock
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  capturedOnResult = null
  capturedFen = null
  jest.restoreAllMocks()
})

describe('Review Session Page', () => {
  it('loads and displays the first card from the session queue', async () => {
    mockFetch([CARD_A, CARD_B])
    render(<ReviewPage />)

    await waitFor(() => {
      expect(screen.getByTestId('review-board')).toBeInTheDocument()
    })

    expect(capturedFen).toBe(CARD_A.fen)
  })

  it('calls PATCH with the card id and outcome, then advances to the next card', async () => {
    const fetchMock = mockFetch([CARD_A, CARD_B])

    render(<ReviewPage />)
    await waitFor(() => screen.getByTestId('review-board'))

    await act(async () => {
      capturedOnResult!('firstTry')
    })

    // PATCH was called for CARD_A
    const patchCall = (fetchMock as jest.Mock).mock.calls.find(
      ([url, init]: [string, RequestInit]) =>
        url === `/api/review/cards/${CARD_A.cardId}` && init.method === 'PATCH',
    )
    expect(patchCall).toBeDefined()
    expect(JSON.parse(patchCall[1].body as string)).toEqual({ outcome: 'firstTry' })

    // Board now shows CARD_B
    await waitFor(() => {
      expect(capturedFen).toBe(CARD_B.fen)
    })
  })

  it('updates the progress counter after each card is resolved', async () => {
    mockFetch([CARD_A, CARD_B])
    render(<ReviewPage />)
    await waitFor(() => screen.getByTestId('review-board'))

    expect(screen.getByTestId('progress')).toHaveTextContent('2 remaining')

    await act(async () => {
      capturedOnResult!('firstTry')
    })

    await waitFor(() => {
      expect(screen.getByTestId('progress')).toHaveTextContent('1 remaining')
    })
  })

  it('shows the completion state when the queue is empty', async () => {
    mockFetch([CARD_A])
    render(<ReviewPage />)
    await waitFor(() => screen.getByTestId('review-board'))

    await act(async () => {
      capturedOnResult!('failed')
    })

    await waitFor(() => {
      expect(screen.getByTestId('completion')).toBeInTheDocument()
      expect(screen.queryByTestId('review-board')).not.toBeInTheDocument()
    })
  })

  it('shows the completion state immediately when the session returns an empty queue', async () => {
    mockFetch([])
    render(<ReviewPage />)

    await waitFor(() => {
      expect(screen.getByTestId('completion')).toBeInTheDocument()
    })
  })

  it('resumes from the correct position after a partial session (page fetches server state on mount)', async () => {
    // Simulate CARD_A already reviewed — server returns only CARD_B as remaining
    mockFetch([CARD_B])
    render(<ReviewPage />)

    await waitFor(() => screen.getByTestId('review-board'))

    // Page starts at CARD_B, not CARD_A — server state drives position, not client cache
    expect(capturedFen).toBe(CARD_B.fen)
    expect(screen.getByTestId('progress')).toHaveTextContent('1 remaining')
  })
})
