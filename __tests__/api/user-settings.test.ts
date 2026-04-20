/**
 * @jest-environment node
 */

import { PATCH } from '@/app/api/user/settings/route'

const USER = '00000000-0000-0000-0000-000000000001'

type Row = Record<string, unknown>

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/user/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// Mock DB: records the update call made against the users table for the
// current user, and returns no error.
function makeMockDb() {
  const updates: Array<{ filterCol: string; filterVal: unknown; values: Row }> = []
  const db = {
    from: (table: string) => {
      if (table !== 'users') throw new Error(`unexpected table: ${table}`)
      return {
        update: (values: Row) => ({
          eq: (col: string, val: unknown) => {
            updates.push({ filterCol: col, filterVal: val, values })
            return Promise.resolve({ data: null, error: null })
          },
        }),
      }
    },
  }
  return { db, updates }
}

describe('PATCH /api/user/settings', () => {
  it('returns 401 when no authenticated user', async () => {
    const { db } = makeMockDb()

    const response = await PATCH(makeRequest({ daily_new_limit: 12 }), {
      db: db as never,
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
    const { db, updates } = makeMockDb()

    const response = await PATCH(makeRequest(body), {
      db: db as never,
      authFn: async () => ({ id: USER }),
    })

    expect(response.status).toBe(400)
    expect(updates).toHaveLength(0)
  })

  it('updates the current user row and returns 200 on valid input', async () => {
    const { db, updates } = makeMockDb()

    const response = await PATCH(makeRequest({ daily_new_limit: 15 }), {
      db: db as never,
      authFn: async () => ({ id: USER }),
    })

    expect(response.status).toBe(200)
    expect(updates).toHaveLength(1)
    expect(updates[0]).toEqual({
      filterCol: 'id',
      filterVal: USER,
      values: { daily_new_limit: 15 },
    })
  })
})
