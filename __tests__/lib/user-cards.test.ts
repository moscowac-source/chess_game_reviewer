/**
 * @jest-environment node
 */

import { getUserCards } from '@/lib/user-cards'
import { makeMockDb } from '@/__tests__/helpers/mock-db'

const USER = '00000000-0000-0000-0000-000000000001'
const OTHER = '00000000-0000-0000-0000-000000000002'

describe('getUserCards', () => {
  it('returns an empty array when the user has no card_state rows', async () => {
    const { db } = makeMockDb({ card_state: [], cards: [] })
    const rows = await getUserCards(db, USER)
    expect(rows).toEqual([])
  })

  it('returns the cards joined via card_state for the given user', async () => {
    const { db } = makeMockDb({
      card_state: [
        { card_id: 'c1', user_id: USER },
        { card_id: 'c2', user_id: USER },
      ],
      cards: [
        { id: 'c1', classification: 'blunder' },
        { id: 'c2', classification: 'great' },
        { id: 'c3', classification: 'mistake' },
      ],
    })
    const rows = await getUserCards<{ id: string; classification: string }>(db, USER, {
      select: 'id, classification',
    })
    expect(rows.map((r) => r.id).sort()).toEqual(['c1', 'c2'])
  })

  it("does not return cards owned by other users", async () => {
    const { db } = makeMockDb({
      card_state: [
        { card_id: 'c1', user_id: USER },
        { card_id: 'c2', user_id: OTHER },
      ],
      cards: [
        { id: 'c1', classification: 'blunder' },
        { id: 'c2', classification: 'great' },
      ],
    })
    const rows = await getUserCards<{ id: string }>(db, USER)
    expect(rows.map((r) => r.id)).toEqual(['c1'])
  })

  it('defaults the select to id when no option is provided', async () => {
    const { db } = makeMockDb({
      card_state: [{ card_id: 'c1', user_id: USER }],
      cards: [{ id: 'c1', classification: 'blunder', game_id: 'g1' }],
    })
    const rows = await getUserCards<{ id: string }>(db, USER)
    expect(rows).toEqual([{ id: 'c1', classification: 'blunder', game_id: 'g1' }])
  })
})
