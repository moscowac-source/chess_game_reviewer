/**
 * @jest-environment node
 */

import { getSessionUserWithUsername } from '@/lib/supabase-server'
import { makeMockDb } from '@/__tests__/helpers/mock-db'

const USER_ID = '00000000-0000-0000-0000-000000000001'

describe('getSessionUserWithUsername', () => {
  it('returns null when no authenticated user', async () => {
    const { db } = makeMockDb({ users: [{ id: USER_ID, chess_com_username: 'alice' }] })

    const result = await getSessionUserWithUsername(db, async () => null)

    expect(result).toBeNull()
  })

  it("returns the user with their chess_com_username when a profile row exists", async () => {
    const { db } = makeMockDb({ users: [{ id: USER_ID, chess_com_username: 'alice' }] })

    const result = await getSessionUserWithUsername(db, async () => ({ id: USER_ID }))

    expect(result).toEqual({ id: USER_ID, chess_com_username: 'alice' })
  })

  it('returns the user with chess_com_username=null when the profile row is missing', async () => {
    const { db } = makeMockDb({ users: [] })

    const result = await getSessionUserWithUsername(db, async () => ({ id: USER_ID }))

    expect(result).toEqual({ id: USER_ID, chess_com_username: null })
  })
})
