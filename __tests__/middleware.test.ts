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

// Landing page (/) is public; logged-in users are routed through to /dashboard.
it('allows unauthenticated access to / (landing page is public)', async () => {
  mockGetUser.mockResolvedValue({ data: { user: null } })

  const req = new NextRequest('http://localhost/')
  const res = await middleware(req)

  expect(res.status).toBe(200)
})

it('redirects authenticated requests on / to /dashboard', async () => {
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } })

  const req = new NextRequest('http://localhost/')
  const res = await middleware(req)

  expect(res.status).toBe(307)
  expect(res.headers.get('location')).toContain('/dashboard')
})

it('redirects unauthenticated requests to /dashboard back to /login', async () => {
  mockGetUser.mockResolvedValue({ data: { user: null } })

  const req = new NextRequest('http://localhost/dashboard')
  const res = await middleware(req)

  expect(res.status).toBe(307)
  expect(res.headers.get('location')).toContain('/login')
})

it('passes authenticated requests to /dashboard through', async () => {
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } })

  const req = new NextRequest('http://localhost/dashboard')
  const res = await middleware(req)

  expect(res.status).toBe(200)
})

it('allows unauthenticated access to /login', async () => {
  mockGetUser.mockResolvedValue({ data: { user: null } })

  const req = new NextRequest('http://localhost/login')
  const res = await middleware(req)

  expect(res.status).not.toBe(307)
})

it('allows unauthenticated access to /signup', async () => {
  mockGetUser.mockResolvedValue({ data: { user: null } })

  const req = new NextRequest('http://localhost/signup')
  const res = await middleware(req)

  expect(res.status).not.toBe(307)
})

it('redirects authenticated requests on /login to /dashboard', async () => {
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } })

  const req = new NextRequest('http://localhost/login')
  const res = await middleware(req)

  expect(res.status).toBe(307)
  expect(res.headers.get('location')).toContain('/dashboard')
})
