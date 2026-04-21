/**
 * @jest-environment node
 */

import { GET, PATCH } from '@/app/api/user/settings/route'
import { makeMockDb } from '@/__tests__/helpers/mock-db'

const USER = '00000000-0000-0000-0000-000000000001'

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/user/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeGetRequest() {
  return new Request('http://localhost/api/user/settings', { method: 'GET' })
}

describe('GET /api/user/settings', () => {
  it('returns the current user\'s daily_new_limit', async () => {
    const { db } = makeMockDb({ users: [{ id: USER, daily_new_limit: 15 }] })

    const response = await GET(makeGetRequest(), { db, authFn: async () => ({ id: USER }) })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ daily_new_limit: 15 })
  })

  it('defaults to 10 when no row exists for the user', async () => {
    const { db } = makeMockDb({ users: [] })

    const response = await GET(makeGetRequest(), { db, authFn: async () => ({ id: USER }) })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ daily_new_limit: 10 })
  })
})

describe('PATCH /api/user/settings', () => {
  it('returns 401 when no authenticated user', async () => {
    const { db } = makeMockDb({ users: [{ id: USER, daily_new_limit: 10 }] })

    const response = await PATCH(makeRequest({ daily_new_limit: 12 }), {
      db,
      authFn: async () => null,
    })

    expect(response.status).toBe(401)
  })

  it.each([
    ['below the minimum', { daily_new_limit: 3 }],
    ['above the maximum', { daily_new_limit: 31 }],
    ['not an integer', { daily_new_limit: 10.5 }],
    ['missing', {}],
    ['non-numeric', { daily_new_limit: 'twelve' }],
  ])('returns 400 and does not update when daily_new_limit is %s', async (_label, body) => {
    const { db, updated } = makeMockDb({ users: [{ id: USER, daily_new_limit: 10 }] })

    const response = await PATCH(makeRequest(body), {
      db,
      authFn: async () => ({ id: USER }),
    })

    expect(response.status).toBe(400)
    expect(updated.users ?? []).toHaveLength(0)
  })

  it('updates the current user row and returns 200 on valid input', async () => {
    const { db, updated } = makeMockDb({ users: [{ id: USER, daily_new_limit: 10 }] })

    const response = await PATCH(makeRequest({ daily_new_limit: 15 }), {
      db,
      authFn: async () => ({ id: USER }),
    })

    expect(response.status).toBe(200)
    expect(updated.users).toEqual([
      {
        values: { daily_new_limit: 15 },
        filters: [{ op: 'eq', col: 'id', val: USER }],
      },
    ])
  })
})
