import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LogoutButton } from '@/components/LogoutButton'

const mockSignOut = jest.fn()
const mockPush = jest.fn()
const mockRefresh = jest.fn()

jest.mock('@/lib/supabase-browser', () => ({
  createClient: () => ({
    auth: { signOut: mockSignOut },
  }),
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}))

beforeEach(() => {
  jest.clearAllMocks()
  mockSignOut.mockResolvedValue({})
})

// ---------------------------------------------------------------------------
// Test 1: calls signOut and redirects to /login on click
// ---------------------------------------------------------------------------
it('calls signOut and redirects to /login on click', async () => {
  render(<LogoutButton />)
  await userEvent.click(screen.getByTestId('logout-button'))

  await waitFor(() => {
    expect(mockSignOut).toHaveBeenCalled()
    expect(mockPush).toHaveBeenCalledWith('/login')
  })
})
