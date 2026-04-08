import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SignupPage from '@/app/signup/page'

const mockSignUp = jest.fn()
const mockPush = jest.fn()
const mockRefresh = jest.fn()

jest.mock('@/lib/supabase-browser', () => ({
  createClient: () => ({
    auth: { signUp: mockSignUp },
  }),
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}))

beforeEach(() => {
  jest.clearAllMocks()
})

// ---------------------------------------------------------------------------
// Test 1: renders email, password fields and submit button
// ---------------------------------------------------------------------------
it('renders email, password fields and submit button', () => {
  render(<SignupPage />)
  expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
  expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument()
})

// ---------------------------------------------------------------------------
// Test 2: calls signUp and redirects to / on success
// ---------------------------------------------------------------------------
it('calls signUp and redirects to / on success', async () => {
  // Simulate email confirmation disabled — session returned immediately
  mockSignUp.mockResolvedValue({ data: { session: { access_token: 'tok' } }, error: null })
  render(<SignupPage />)

  await userEvent.type(screen.getByLabelText(/email/i), 'new@example.com')
  await userEvent.type(screen.getByLabelText(/password/i), 'securepass')
  await userEvent.click(screen.getByRole('button', { name: /sign up/i }))

  await waitFor(() => {
    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'securepass',
    })
    expect(mockPush).toHaveBeenCalledWith('/')
  })
})

// ---------------------------------------------------------------------------
// Test 3: shows error message on failed signup
// ---------------------------------------------------------------------------
it('shows error message on failed signup', async () => {
  mockSignUp.mockResolvedValue({ error: { message: 'User already registered' } })
  render(<SignupPage />)

  await userEvent.type(screen.getByLabelText(/email/i), 'existing@example.com')
  await userEvent.type(screen.getByLabelText(/password/i), 'somepass')
  await userEvent.click(screen.getByRole('button', { name: /sign up/i }))

  await waitFor(() => {
    expect(screen.getByTestId('auth-error')).toHaveTextContent('User already registered')
  })
  expect(mockPush).not.toHaveBeenCalled()
})
