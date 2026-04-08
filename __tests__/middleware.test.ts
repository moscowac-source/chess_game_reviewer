/**
 * @jest-environment node
 */
import { middleware } from '@/middleware'
import { NextRequest } from 'next/server'

const mockGetUser = jest.fn()

jest.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: { getUser: mockGetUser },
  }),
}))

beforeEach(() => {
  jest.clearAllMocks()
})

// ---------------------------------------------------------------------------
// Test 1: redirects unauthenticated request to /login
// ---------------------------------------------------------------------------
it('redirects unauthenticated requests to /login', async () => {
  mockGetUser.mockResolvedValue({ data: { user: null } })

  const req = new NextRequest('http://localhost/')
  const res = await middleware(req)

  expect(res.status).toBe(307)
  expect(res.headers.get('location')).toContain('/login')
})

// ---------------------------------------------------------------------------
// Test 2: passes authenticated requests through
// ---------------------------------------------------------------------------
it('passes authenticated requests through', async () => {
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } })

  const req = new NextRequest('http://localhost/')
  const res = await middleware(req)

  expect(res.status).toBe(200)
})

// ---------------------------------------------------------------------------
// Test 3: /login is public — no redirect
// ---------------------------------------------------------------------------
it('allows unauthenticated access to /login', async () => {
  const req = new NextRequest('http://localhost/login')
  const res = await middleware(req)

  expect(res.status).not.toBe(307)
  expect(mockGetUser).not.toHaveBeenCalled()
})

// ---------------------------------------------------------------------------
// Test 4: /signup is public — no redirect
// ---------------------------------------------------------------------------
it('allows unauthenticated access to /signup', async () => {
  const req = new NextRequest('http://localhost/signup')
  const res = await middleware(req)

  expect(res.status).not.toBe(307)
  expect(mockGetUser).not.toHaveBeenCalled()
})
