import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SignupPage from '@/app/signup/page'

const mockSignUp = jest.fn()
const mockUpsert = jest.fn().mockResolvedValue({ error: null })
const mockPush = jest.fn()
const mockRefresh = jest.fn()

jest.mock('@/lib/supabase-browser', () => ({
  createClient: () => ({
    auth: { signUp: mockSignUp },
    from: () => ({ upsert: mockUpsert }),
  }),
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}))

beforeEach(() => {
  jest.clearAllMocks()
  mockUpsert.mockResolvedValue({ error: null })
})

it('renders email, password fields and submit button', () => {
  render(<SignupPage />)
  expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
  expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
})

it('calls signUp and redirects to /onboard on success when a session is returned', async () => {
  mockSignUp.mockResolvedValue({
    data: { user: { id: 'user-123' }, session: { access_token: 'tok' } },
    error: null,
  })
  render(<SignupPage />)

  await userEvent.type(screen.getByLabelText(/email/i), 'new@example.com')
  await userEvent.type(screen.getByLabelText(/password/i), 'securepass')
  await userEvent.click(screen.getByRole('button', { name: /create account/i }))

  await waitFor(() => {
    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'securepass',
    })
    expect(mockPush).toHaveBeenCalledWith('/onboard')
  })
})

it('shows error message on failed signup', async () => {
  mockSignUp.mockResolvedValue({ data: { user: null, session: null }, error: { message: 'User already registered' } })
  render(<SignupPage />)

  await userEvent.type(screen.getByLabelText(/email/i), 'existing@example.com')
  await userEvent.type(screen.getByLabelText(/password/i), 'somepass')
  await userEvent.click(screen.getByRole('button', { name: /create account/i }))

  await waitFor(() => {
    expect(screen.getByTestId('auth-error')).toHaveTextContent('User already registered')
  })
  expect(mockPush).not.toHaveBeenCalled()
})
