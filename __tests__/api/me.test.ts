/**
 * @jest-environment node
 */

import { GET } from '@/app/api/me/route'
import { makeMockDb } from '@/__tests__/helpers/mock-db'

const USER = '00000000-0000-0000-0000-000000000001'

function makeGetRequest() {
  return new Request('http://localhost/api/me', { method: 'GET' })
}

describe('GET /api/me', () => {
  it('returns 401 when no authenticated user', async () => {
    const { db } = makeMockDb({ users: [] })
    const response = await GET(makeGetRequest(), { db, authFn: async () => null })
    expect(response.status).toBe(401)
  })

  it('returns email, username, and name fields when set', async () => {
    const { db } = makeMockDb({
      users: [{
        id: USER,
        email: 'ada@example.com',
        chess_com_username: 'ada_plays',
        first_name: 'Ada',
        last_name: 'Lovelace',
      }],
    })

    const response = await GET(makeGetRequest(), { db, authFn: async () => ({ id: USER }) })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({
      email: 'ada@example.com',
      username: 'ada_plays',
      first_name: 'Ada',
      last_name: 'Lovelace',
    })
  })

  it('returns nulls for missing optional fields', async () => {
    const { db } = makeMockDb({
      users: [{ id: USER, email: 'a@b.com' }],
    })

    const response = await GET(makeGetRequest(), { db, authFn: async () => ({ id: USER }) })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({
      email: 'a@b.com',
      username: null,
      first_name: null,
      last_name: null,
    })
  })
})
