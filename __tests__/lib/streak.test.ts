import { computeStreak } from '@/lib/streak'

const utcDate = (iso: string) => new Date(iso + 'T12:00:00Z')

describe('computeStreak', () => {
  it('returns 0 when there are no reviews', () => {
    const now = utcDate('2026-04-20')
    expect(computeStreak([], now)).toBe(0)
  })

  it('returns 1 when there is a review today', () => {
    const now = utcDate('2026-04-20')
    const reviews = [utcDate('2026-04-20')]
    expect(computeStreak(reviews, now)).toBe(1)
  })

  it('returns 1 when the most recent review is yesterday (no review today yet)', () => {
    const now = utcDate('2026-04-20')
    const reviews = [utcDate('2026-04-19')]
    expect(computeStreak(reviews, now)).toBe(1)
  })

  it('returns 0 when the most recent review was 2+ days ago', () => {
    const now = utcDate('2026-04-20')
    const reviews = [utcDate('2026-04-18'), utcDate('2026-04-17')]
    expect(computeStreak(reviews, now)).toBe(0)
  })

  it('counts an unbroken 5-day run ending today', () => {
    const now = utcDate('2026-04-20')
    const reviews = [
      utcDate('2026-04-20'),
      utcDate('2026-04-19'),
      utcDate('2026-04-18'),
      utcDate('2026-04-17'),
      utcDate('2026-04-16'),
    ]
    expect(computeStreak(reviews, now)).toBe(5)
  })

  it('stops counting at the first gap', () => {
    const now = utcDate('2026-04-20')
    const reviews = [
      utcDate('2026-04-20'),
      utcDate('2026-04-19'),
      // gap: 2026-04-18 missing
      utcDate('2026-04-17'),
      utcDate('2026-04-16'),
    ]
    expect(computeStreak(reviews, now)).toBe(2)
  })

  it('de-duplicates multiple reviews on the same day', () => {
    const now = utcDate('2026-04-20')
    const reviews = [
      new Date('2026-04-20T05:00:00Z'),
      new Date('2026-04-20T15:00:00Z'),
      new Date('2026-04-20T22:00:00Z'),
    ]
    expect(computeStreak(reviews, now)).toBe(1)
  })
})
