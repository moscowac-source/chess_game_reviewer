/**
 * @jest-environment node
 */

import { NextResponse } from 'next/server'
import { withAuthedRoute } from '@/lib/with-authed-route'
import { makeMockDb } from '@/__tests__/helpers/mock-db'

const USER_ID = '00000000-0000-0000-0000-000000000001'

describe('withAuthedRoute', () => {
  it('returns 401 with { error: "Unauthorized" } when authFn resolves null', async () => {
    const handler = jest.fn()
    const route = withAuthedRoute(handler)
    const { db } = makeMockDb()

    const response = await route(new Request('http://localhost/test'), {
      db,
      authFn: async () => null,
    })

    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body).toEqual({ error: 'Unauthorized' })
    expect(handler).not.toHaveBeenCalled()
  })

  it('passes { req, db, user, deps } to the handler on success', async () => {
    const { db } = makeMockDb()
    let received: { req: Request; db: unknown; user: unknown; deps: unknown } | null = null

    const route = withAuthedRoute(async (ctx) => {
      received = ctx
      return NextResponse.json({ ok: true })
    })

    const req = new Request('http://localhost/test')
    const response = await route(req, {
      db,
      authFn: async () => ({ id: USER_ID }),
    })

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual({ ok: true })
    expect(received!.req).toBe(req)
    expect(received!.db).toBe(db)
    expect(received!.user).toEqual({ id: USER_ID })
  })

  it('forwards extra deps through the ctx.deps field', async () => {
    type ExtraDeps = {
      db?: import('@supabase/supabase-js').SupabaseClient
      authFn?: () => Promise<{ id: string } | null>
      extra: string
    }

    const { db } = makeMockDb()
    let seenExtra: string | undefined

    const route = withAuthedRoute<ExtraDeps>(async ({ deps }) => {
      seenExtra = deps.extra
      return NextResponse.json({ ok: true })
    })

    await route(new Request('http://localhost/test'), {
      db,
      authFn: async () => ({ id: USER_ID }),
      extra: 'hello',
    })

    expect(seenExtra).toBe('hello')
  })

  it('catches thrown errors from the handler and returns 500 with the error message', async () => {
    const route = withAuthedRoute(async () => {
      throw new Error('something broke')
    })
    const { db } = makeMockDb()

    const response = await route(new Request('http://localhost/test'), {
      db,
      authFn: async () => ({ id: USER_ID }),
    })

    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body).toEqual({ error: 'something broke' })
  })

  it('catches non-Error throws and returns a generic 500', async () => {
    const route = withAuthedRoute(async () => {
      throw 'not an Error object'
    })
    const { db } = makeMockDb()

    const response = await route(new Request('http://localhost/test'), {
      db,
      authFn: async () => ({ id: USER_ID }),
    })

    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body).toEqual({ error: 'Internal error' })
  })
})
