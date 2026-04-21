/**
 * @jest-environment node
 */

import { makeMockDb } from './mock-db'

const USER = 'user-1'

describe('makeMockDb — read path', () => {
  it('returns seeded rows for a plain select', async () => {
    const { db } = makeMockDb({
      cards: [
        { id: 'c1', classification: 'blunder' },
        { id: 'c2', classification: 'mistake' },
      ],
    })
    const { data } = await db.from('cards').select('*')
    expect(data).toEqual([
      { id: 'c1', classification: 'blunder' },
      { id: 'c2', classification: 'mistake' },
    ])
  })

  it('filters with .eq', async () => {
    const { db } = makeMockDb({
      cards: [
        { id: 'c1', classification: 'blunder' },
        { id: 'c2', classification: 'mistake' },
      ],
    })
    const { data } = await db.from('cards').select('*').eq('classification', 'blunder')
    expect(data).toEqual([{ id: 'c1', classification: 'blunder' }])
  })

  it('filters with .in', async () => {
    const { db } = makeMockDb({
      cards: [
        { id: 'c1' },
        { id: 'c2' },
        { id: 'c3' },
      ],
    })
    const { data } = await db.from('cards').select('*').in('id', ['c1', 'c3'])
    expect(data).toHaveLength(2)
    expect(data.map((r) => r.id)).toEqual(['c1', 'c3'])
  })

  it('filters with .gte on ISO timestamps', async () => {
    const { db } = makeMockDb({
      review_log: [
        { id: 'r1', user_id: USER, reviewed_at: '2026-04-20T00:00:00Z' },
        { id: 'r2', user_id: USER, reviewed_at: '2026-04-10T00:00:00Z' },
      ],
    })
    const { data } = await db
      .from('review_log')
      .select('*')
      .eq('user_id', USER)
      .gte('reviewed_at', '2026-04-15T00:00:00Z')
    expect(data).toEqual([{ id: 'r1', user_id: USER, reviewed_at: '2026-04-20T00:00:00Z' }])
  })

  it('filters with .lte', async () => {
    const { db } = makeMockDb({
      cards: [
        { id: 'c1', cpl: 50 },
        { id: 'c2', cpl: 300 },
      ],
    })
    const { data } = await db.from('cards').select('*').lte('cpl', 100)
    expect(data).toEqual([{ id: 'c1', cpl: 50 }])
  })

  it('orders rows ascending and descending', async () => {
    const { db } = makeMockDb({
      games: [
        { id: 'g1', played_at: '2026-01-01' },
        { id: 'g2', played_at: '2026-03-01' },
        { id: 'g3', played_at: '2026-02-01' },
      ],
    })
    const asc = await db.from('games').select('*').order('played_at', { ascending: true })
    expect(asc.data.map((r) => r.id)).toEqual(['g1', 'g3', 'g2'])
    const desc = await db.from('games').select('*').order('played_at', { ascending: false })
    expect(desc.data.map((r) => r.id)).toEqual(['g2', 'g3', 'g1'])
  })

  it('limits rows', async () => {
    const { db } = makeMockDb({
      games: [
        { id: 'g1' }, { id: 'g2' }, { id: 'g3' }, { id: 'g4' },
      ],
    })
    const { data } = await db.from('games').select('*').limit(2)
    expect(data).toHaveLength(2)
  })

  it('chains .eq → .order → .limit', async () => {
    const { db } = makeMockDb({
      games: [
        { id: 'g1', user_id: USER, played_at: '2026-01-01' },
        { id: 'g2', user_id: USER, played_at: '2026-03-01' },
        { id: 'g3', user_id: 'other', played_at: '2026-02-01' },
      ],
    })
    const { data } = await db
      .from('games')
      .select('*')
      .eq('user_id', USER)
      .order('played_at', { ascending: false })
      .limit(1)
    expect(data).toEqual([{ id: 'g2', user_id: USER, played_at: '2026-03-01' }])
  })

  it('.single returns the first row or null', async () => {
    const { db } = makeMockDb({
      users: [{ id: USER, chess_com_username: 'alice' }],
    })
    const hit = await db.from('users').select('*').eq('id', USER).single()
    expect(hit.data).toEqual({ id: USER, chess_com_username: 'alice' })
    const miss = await db.from('users').select('*').eq('id', 'nobody').single()
    expect(miss.data).toBeNull()
  })

  it('.maybeSingle returns the first row or null', async () => {
    const { db } = makeMockDb({ games: [] })
    const { data } = await db.from('games').select('*').eq('url', 'x').maybeSingle()
    expect(data).toBeNull()
  })

  it('returns empty data for unseeded tables', async () => {
    const { db } = makeMockDb()
    const { data } = await db.from('cards').select('*')
    expect(data).toEqual([])
  })
})

describe('makeMockDb — write path', () => {
  it('captures inserts and auto-generates ids when absent', async () => {
    const { db, inserted } = makeMockDb({ sync_log: [] })
    const { data } = await db.from('sync_log').insert({ mode: 'incremental' }).select('*').single()
    expect(data).toMatchObject({ mode: 'incremental' })
    expect(typeof data?.id).toBe('string')
    expect(inserted.sync_log).toHaveLength(1)
    expect(inserted.sync_log[0]).toMatchObject({ mode: 'incremental' })
  })

  it('keeps caller-supplied ids on insert', async () => {
    const { db, inserted } = makeMockDb({ cards: [] })
    await db.from('cards').insert([{ id: 'c1', fen: 'foo' }])
    expect(inserted.cards[0]).toEqual({ id: 'c1', fen: 'foo' })
  })

  it('makes inserted rows readable via subsequent queries', async () => {
    const { db } = makeMockDb({ cards: [] })
    await db.from('cards').insert([{ id: 'c1', fen: 'abc' }])
    const { data } = await db.from('cards').select('*').eq('id', 'c1')
    expect(data).toEqual([{ id: 'c1', fen: 'abc' }])
  })

  it('awaiting an insert without .select() resolves to the stored rows', async () => {
    const { db } = makeMockDb({ review_log: [] })
    const { data, error } = await db.from('review_log').insert([{ rating: 'easy' }])
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })

  it('captures updates with their filters and mutates matching rows', async () => {
    const { db, updated } = makeMockDb({
      users: [{ id: USER, daily_new_limit: 10 }],
    })
    await db.from('users').update({ daily_new_limit: 15 }).eq('id', USER)
    expect(updated.users).toEqual([
      { values: { daily_new_limit: 15 }, filters: [{ op: 'eq', col: 'id', val: USER }] },
    ])
    const { data } = await db.from('users').select('*').eq('id', USER).single()
    expect(data).toMatchObject({ daily_new_limit: 15 })
  })

  it('update .match(obj) adds eq filters for each key', async () => {
    const { db, updated } = makeMockDb({
      card_state: [{ card_id: 'c1', user_id: USER, review_count: 0 }],
    })
    await db.from('card_state').update({ review_count: 1 }).match({ card_id: 'c1', user_id: USER })
    expect(updated.card_state[0].filters).toEqual([
      { op: 'eq', col: 'card_id', val: 'c1' },
      { op: 'eq', col: 'user_id', val: USER },
    ])
  })

  it('captures deletes', async () => {
    const { db, deleted } = makeMockDb({
      cards: [{ id: 'c1' }, { id: 'c2' }],
    })
    await db.from('cards').delete().eq('id', 'c1')
    expect(deleted.cards).toEqual([{ filters: [{ op: 'eq', col: 'id', val: 'c1' }] }])
    const { data } = await db.from('cards').select('*')
    expect(data).toEqual([{ id: 'c2' }])
  })
})

describe('makeMockDb — isolation', () => {
  it('does not mutate the seed array passed in', async () => {
    const originalCards = [{ id: 'c1' }]
    const { db } = makeMockDb({ cards: originalCards })
    await db.from('cards').insert([{ id: 'c2' }])
    expect(originalCards).toEqual([{ id: 'c1' }])
  })
})
