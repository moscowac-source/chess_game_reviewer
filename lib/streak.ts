function toUtcDayStart(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

const DAY_MS = 24 * 60 * 60 * 1000

export function computeStreak(reviewDates: Date[], now: Date): number {
  const days = new Set(reviewDates.map(toUtcDayStart))
  const today = toUtcDayStart(now)
  const yesterday = today - DAY_MS

  let cursor: number
  if (days.has(today)) cursor = today
  else if (days.has(yesterday)) cursor = yesterday
  else return 0

  let streak = 0
  while (days.has(cursor)) {
    streak += 1
    cursor -= DAY_MS
  }
  return streak
}
