/**
 * @jest-environment node
 */

import { GET } from '@/app/api/stats/accuracy/route'
import { makeMockDb } from '@/__tests__/helpers/mock-db'

const USER = '00000000-0000-0000-0000-000000000001'

describe('GET /api/stats/accuracy', () => {
  it('returns 401 when unauthenticated', async () => {
    const { db } = makeMockDb()
    const req = new Request('http://localhost/api/stats/accuracy?days=7')
    const response = await GET(req, { db, authFn: async () => null })
    expect(response.status).toBe(401)
  })

  it('returns null accuracy when the user has no reviews in the window', async () => {
    const { db } = makeMockDb({ review_log: [] })
    const req = new Request('http://localhost/api/stats/accuracy?days=7')
    const response = await GET(req, {
      db,
      authFn: async () => ({ id: USER }),
      now: () => new Date('2026-04-20T12:00:00Z'),
    })
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body).toEqual({ accuracy: null, totalReviews: 0 })
  })

  it('computes accuracy from review_log ratings', async () => {
    const { db } = makeMockDb({
      review_log: [
        { user_id: USER, rating: 'easy', reviewed_at: '2026-04-20T09:00:00Z' },
        { user_id: USER, rating: 'good', reviewed_at: '2026-04-19T11:00:00Z' },
        { user_id: USER, rating: 'good', reviewed_at: '2026-04-18T08:00:00Z' },
        { user_id: USER, rating: 'hard', reviewed_at: '2026-04-17T08:00:00Z' },
        { user_id: USER, rating: 'again', reviewed_at: '2026-04-16T08:00:00Z' },
      ],
    })
    const req = new Request('http://localhost/api/stats/accuracy?days=7')
    const response = await GET(req, {
      db,
      authFn: async () => ({ id: USER }),
      now: () => new Date('2026-04-20T12:00:00Z'),
    })
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body).toEqual({ accuracy: 60, totalReviews: 5 })
  })

  it('excludes reviews older than the window', async () => {
    const { db } = makeMockDb({
      review_log: [
        { user_id: USER, rating: 'easy', reviewed_at: '2026-04-20T09:00:00Z' },
        { user_id: USER, rating: 'again', reviewed_at: '2026-04-10T09:00:00Z' },
      ],
    })
    const req = new Request('http://localhost/api/stats/accuracy?days=7')
    const response = await GET(req, {
      db,
      authFn: async () => ({ id: USER }),
      now: () => new Date('2026-04-20T12:00:00Z'),
    })
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body).toEqual({ accuracy: 100, totalReviews: 1 })
  })

  it('returns 100 when all reviews are good or easy', async () => {
    const { db } = makeMockDb({
      review_log: [
        { user_id: USER, rating: 'good', reviewed_at: '2026-04-20T09:00:00Z' },
        { user_id: USER, rating: 'easy', reviewed_at: '2026-04-19T09:00:00Z' },
      ],
    })
    const req = new Request('http://localhost/api/stats/accuracy?days=7')
    const response = await GET(req, {
      db,
      authFn: async () => ({ id: USER }),
      now: () => new Date('2026-04-20T12:00:00Z'),
    })
    const body = await response.json()
    expect(body).toEqual({ accuracy: 100, totalReviews: 2 })
  })

  it('returns 0 when all reviews are again or hard', async () => {
    const { db } = makeMockDb({
      review_log: [
        { user_id: USER, rating: 'again', reviewed_at: '2026-04-20T09:00:00Z' },
        { user_id: USER, rating: 'hard', reviewed_at: '2026-04-19T09:00:00Z' },
      ],
    })
    const req = new Request('http://localhost/api/stats/accuracy?days=7')
    const response = await GET(req, {
      db,
      authFn: async () => ({ id: USER }),
      now: () => new Date('2026-04-20T12:00:00Z'),
    })
    const body = await response.json()
    expect(body).toEqual({ accuracy: 0, totalReviews: 2 })
  })

  it('includes reviews exactly at the window boundary', async () => {
    const { db } = makeMockDb({
      review_log: [
        { user_id: USER, rating: 'good', reviewed_at: '2026-04-13T12:00:00Z' },
        { user_id: USER, rating: 'again', reviewed_at: '2026-04-13T11:59:59Z' },
      ],
    })
    const req = new Request('http://localhost/api/stats/accuracy?days=7')
    const response = await GET(req, {
      db,
      authFn: async () => ({ id: USER }),
      now: () => new Date('2026-04-20T12:00:00Z'),
    })
    const body = await response.json()
    expect(body).toEqual({ accuracy: 100, totalReviews: 1 })
  })

  it('returns 400 when days is above the max', async () => {
    const { db } = makeMockDb()
    const req = new Request('http://localhost/api/stats/accuracy?days=31')
    const response = await GET(req, {
      db,
      authFn: async () => ({ id: USER }),
    })
    expect(response.status).toBe(400)
  })

  it('rounds accuracy to a whole number', async () => {
    const { db } = makeMockDb({
      review_log: [
        { user_id: USER, rating: 'good', reviewed_at: '2026-04-20T09:00:00Z' },
        { user_id: USER, rating: 'good', reviewed_at: '2026-04-20T09:01:00Z' },
        { user_id: USER, rating: 'again', reviewed_at: '2026-04-20T09:02:00Z' },
      ],
    })
    const req = new Request('http://localhost/api/stats/accuracy?days=7')
    const response = await GET(req, {
      db,
      authFn: async () => ({ id: USER }),
      now: () => new Date('2026-04-20T12:00:00Z'),
    })
    const body = await response.json()
    expect(body).toEqual({ accuracy: 67, totalReviews: 3 })
  })

  it('returns 400 when days is out of range', async () => {
    const { db } = makeMockDb()
    const req = new Request('http://localhost/api/stats/accuracy?days=0')
    const response = await GET(req, {
      db,
      authFn: async () => ({ id: USER }),
    })
    expect(response.status).toBe(400)
  })

  it('returns 400 when days is not an integer', async () => {
    const { db } = makeMockDb()
    const req = new Request('http://localhost/api/stats/accuracy?days=abc')
    const response = await GET(req, {
      db,
      authFn: async () => ({ id: USER }),
    })
    expect(response.status).toBe(400)
  })

  it('defaults to 7 days when the param is omitted', async () => {
    // One review inside the default 7-day window, one outside.
    // If the default is applied, only the inside row should be counted.
    const { db } = makeMockDb({
      review_log: [
        { user_id: USER, rating: 'good', reviewed_at: '2026-04-15T09:00:00Z' },
        { user_id: USER, rating: 'good', reviewed_at: '2026-04-10T09:00:00Z' },
      ],
    })
    const req = new Request('http://localhost/api/stats/accuracy')
    const response = await GET(req, {
      db,
      authFn: async () => ({ id: USER }),
      now: () => new Date('2026-04-20T12:00:00Z'),
    })
    const body = await response.json()
    expect(body).toEqual({ accuracy: 100, totalReviews: 1 })
  })
})
