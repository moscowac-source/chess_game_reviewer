import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginPage from '@/app/login/page'

const mockSignIn = jest.fn()
const mockPush = jest.fn()
const mockRefresh = jest.fn()

jest.mock('@/lib/supabase-browser', () => ({
  createClient: () => ({
    auth: { signInWithPassword: mockSignIn },
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
  render(<LoginPage />)
  expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
  expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument()
})

// ---------------------------------------------------------------------------
// Test 2: calls signInWithPassword and redirects to / on success
// ---------------------------------------------------------------------------
it('calls signInWithPassword and redirects to / on success', async () => {
  mockSignIn.mockResolvedValue({ error: null })
  render(<LoginPage />)

  await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com')
  await userEvent.type(screen.getByLabelText(/password/i), 'password123')
  await userEvent.click(screen.getByRole('button', { name: /log in/i }))

  await waitFor(() => {
    expect(mockSignIn).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    })
    expect(mockPush).toHaveBeenCalledWith('/')
  })
})

// ---------------------------------------------------------------------------
// Test 3: shows error message on failed login
// ---------------------------------------------------------------------------
it('shows error message on failed login', async () => {
  mockSignIn.mockResolvedValue({ error: { message: 'Invalid login credentials' } })
  render(<LoginPage />)

  await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com')
  await userEvent.type(screen.getByLabelText(/password/i), 'wrongpass')
  await userEvent.click(screen.getByRole('button', { name: /log in/i }))

  await waitFor(() => {
    expect(screen.getByTestId('auth-error')).toHaveTextContent('Invalid login credentials')
  })
  expect(mockPush).not.toHaveBeenCalled()
})
