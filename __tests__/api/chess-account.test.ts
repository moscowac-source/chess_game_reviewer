/**
 * @jest-environment node
 */

import { PUT } from '@/app/api/chess-account/route'
import type { PlayerCheck } from '@/app/api/chess-account/route'
import { makeMockDb } from '@/__tests__/helpers/mock-db'

const USER = '00000000-0000-0000-0000-000000000001'

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/chess-account', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const found = async (): Promise<PlayerCheck> => 'found'

describe('PUT /api/chess-account', () => {
  it('returns 401 when there is no authenticated user', async () => {
    const { db } = makeMockDb({ users: [{ id: USER }] })

    const response = await PUT(makeRequest({ username: 'hikaru' }), {
      db,
      authFn: async () => null,
      checkPlayer: found,
    })

    expect(response.status).toBe(401)
  })

  it.each([
    ['empty', { username: '   ' }],
    ['missing', {}],
    ['illegal characters', { username: 'bad name!' }],
    ['wrong type', { username: 123 }],
  ])('rejects an invalid username (%s) with 400 and writes nothing', async (_label, body) => {
    const { db, updated } = makeMockDb({ users: [{ id: USER }] })

    const response = await PUT(makeRequest(body), {
      db,
      authFn: async () => ({ id: USER }),
      checkPlayer: found,
    })

    expect(response.status).toBe(400)
    expect(updated.users ?? []).toHaveLength(0)
  })

  it('returns 404 and writes nothing when the player is not found on Chess.com', async () => {
    const { db, updated } = makeMockDb({ users: [{ id: USER }] })

    const response = await PUT(makeRequest({ username: 'definitely-not-real' }), {
      db,
      authFn: async () => ({ id: USER }),
      checkPlayer: async () => 'not_found',
    })

    expect(response.status).toBe(404)
    expect(updated.users ?? []).toHaveLength(0)
  })

  it('returns 502 when Chess.com cannot be reached to verify', async () => {
    const { db, updated } = makeMockDb({ users: [{ id: USER }] })

    const response = await PUT(makeRequest({ username: 'hikaru' }), {
      db,
      authFn: async () => ({ id: USER }),
      checkPlayer: async () => 'unreachable',
    })

    expect(response.status).toBe(502)
    expect(updated.users ?? []).toHaveLength(0)
  })

  it('saves the username on the user row and echoes it back on success', async () => {
    const { db, updated } = makeMockDb({ users: [{ id: USER, chess_com_username: null }] })

    const response = await PUT(makeRequest({ username: '  Hikaru  ' }), {
      db,
      authFn: async () => ({ id: USER }),
      checkPlayer: found,
    })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ ok: true, username: 'Hikaru' })

    const write = updated.users?.[0]
    expect(write?.values).toEqual({ chess_com_username: 'Hikaru' })
    expect(write?.filters).toEqual([{ op: 'eq', col: 'id', val: USER }])
  })

  it('returns 400 on malformed JSON', async () => {
    const { db } = makeMockDb({ users: [{ id: USER }] })
    const badReq = new Request('http://localhost/api/chess-account', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: '{not json',
    })

    const response = await PUT(badReq, {
      db,
      authFn: async () => ({ id: USER }),
      checkPlayer: found,
    })

    expect(response.status).toBe(400)
  })
})
