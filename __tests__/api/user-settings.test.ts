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
  it("returns the current user's settings including name and chess.com fields", async () => {
    const { db } = makeMockDb({
      users: [{
        id: USER,
        daily_new_limit: 15,
        first_name: 'Ada',
        last_name: 'Lovelace',
        chess_com_username: 'ada_plays',
      }],
    })

    const response = await GET(makeGetRequest(), { db, authFn: async () => ({ id: USER }) })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({
      daily_new_limit: 15,
      first_name: 'Ada',
      last_name: 'Lovelace',
      chess_com_username: 'ada_plays',
    })
  })

  it('defaults daily_new_limit to 10 and other fields to null when no row exists', async () => {
    const { db } = makeMockDb({ users: [] })

    const response = await GET(makeGetRequest(), { db, authFn: async () => ({ id: USER }) })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({
      daily_new_limit: 10,
      first_name: null,
      last_name: null,
      chess_com_username: null,
    })
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

  it('returns 400 when body has no updatable fields', async () => {
    const { db, updated } = makeMockDb({ users: [{ id: USER, daily_new_limit: 10 }] })

    const response = await PATCH(makeRequest({}), {
      db,
      authFn: async () => ({ id: USER }),
    })

    expect(response.status).toBe(400)
    expect(updated.users ?? []).toHaveLength(0)
  })

  it('returns 400 when first_name is too long', async () => {
    const { db, updated } = makeMockDb({ users: [{ id: USER }] })

    const response = await PATCH(makeRequest({ first_name: 'A'.repeat(61) }), {
      db,
      authFn: async () => ({ id: USER }),
    })

    expect(response.status).toBe(400)
    expect(updated.users ?? []).toHaveLength(0)
  })

  it('updates daily_new_limit only when that is the only field', async () => {
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

  it('updates first_name and last_name, trimming whitespace', async () => {
    const { db, updated } = makeMockDb({ users: [{ id: USER }] })

    const response = await PATCH(makeRequest({ first_name: '  Ada  ', last_name: 'Lovelace' }), {
      db,
      authFn: async () => ({ id: USER }),
    })

    expect(response.status).toBe(200)
    expect(updated.users).toEqual([
      {
        values: { first_name: 'Ada', last_name: 'Lovelace' },
        filters: [{ op: 'eq', col: 'id', val: USER }],
      },
    ])
  })

  it('clears a name when passed an empty string or null', async () => {
    const { db, updated } = makeMockDb({ users: [{ id: USER, first_name: 'Ada' }] })

    const response = await PATCH(makeRequest({ first_name: '', last_name: null }), {
      db,
      authFn: async () => ({ id: USER }),
    })

    expect(response.status).toBe(200)
    expect(updated.users).toEqual([
      {
        values: { first_name: null, last_name: null },
        filters: [{ op: 'eq', col: 'id', val: USER }],
      },
    ])
  })

  it('allows updating all three fields at once', async () => {
    const { db, updated } = makeMockDb({ users: [{ id: USER, daily_new_limit: 10 }] })

    const response = await PATCH(
      makeRequest({ daily_new_limit: 20, first_name: 'Ada', last_name: 'Lovelace' }),
      { db, authFn: async () => ({ id: USER }) },
    )

    expect(response.status).toBe(200)
    expect(updated.users).toEqual([
      {
        values: { daily_new_limit: 20, first_name: 'Ada', last_name: 'Lovelace' },
        filters: [{ op: 'eq', col: 'id', val: USER }],
      },
    ])
  })

  describe('chess_com_username', () => {
    it('updates chess_com_username, trimming whitespace', async () => {
      const { db, updated } = makeMockDb({ users: [{ id: USER }] })

      const response = await PATCH(makeRequest({ chess_com_username: '  ada_plays  ' }), {
        db,
        authFn: async () => ({ id: USER }),
      })

      expect(response.status).toBe(200)
      expect(updated.users).toEqual([
        {
          values: { chess_com_username: 'ada_plays' },
          filters: [{ op: 'eq', col: 'id', val: USER }],
        },
      ])
    })

    it('returns 400 when chess_com_username is an empty string', async () => {
      const { db, updated } = makeMockDb({ users: [{ id: USER }] })

      const response = await PATCH(makeRequest({ chess_com_username: '' }), {
        db,
        authFn: async () => ({ id: USER }),
      })

      expect(response.status).toBe(400)
      expect(updated.users ?? []).toHaveLength(0)
    })

    it('returns 400 when chess_com_username is whitespace-only', async () => {
      const { db, updated } = makeMockDb({ users: [{ id: USER }] })

      const response = await PATCH(makeRequest({ chess_com_username: '   ' }), {
        db,
        authFn: async () => ({ id: USER }),
      })

      expect(response.status).toBe(400)
      expect(updated.users ?? []).toHaveLength(0)
    })

    it('returns 400 when chess_com_username is too long', async () => {
      const { db, updated } = makeMockDb({ users: [{ id: USER }] })

      const response = await PATCH(makeRequest({ chess_com_username: 'a'.repeat(51) }), {
        db,
        authFn: async () => ({ id: USER }),
      })

      expect(response.status).toBe(400)
      expect(updated.users ?? []).toHaveLength(0)
    })

    it('returns 400 when chess_com_username is not a string', async () => {
      const { db, updated } = makeMockDb({ users: [{ id: USER }] })

      const response = await PATCH(makeRequest({ chess_com_username: 123 }), {
        db,
        authFn: async () => ({ id: USER }),
      })

      expect(response.status).toBe(400)
      expect(updated.users ?? []).toHaveLength(0)
    })

    it('returns 401 when updating chess_com_username without auth', async () => {
      const { db } = makeMockDb({ users: [{ id: USER }] })

      const response = await PATCH(makeRequest({ chess_com_username: 'ada_plays' }), {
        db,
        authFn: async () => null,
      })

      expect(response.status).toBe(401)
    })
  })
})
