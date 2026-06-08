'use client'

import { useCallback, useEffect, useState } from 'react'

export interface FetchResult<T> {
  data: T | null
  loading: boolean
  error: Error | null
  refetch: () => void
}

// A 401 right after the session cookie is refreshed is usually transient: a
// concurrent request rotated the auth cookie and this one briefly raced with
// it. The refreshed cookie lands within a moment, so a single short-delayed
// retry recovers cleanly instead of flashing an unauthenticated state (#69).
const UNAUTH_RETRY_DELAY_MS = 300

export function useFetchJson<T>(
  url: string,
  validate: (raw: unknown) => T | null,
): FetchResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    async function fetchJson(): Promise<unknown> {
      for (let attempt = 0; ; attempt++) {
        const r = await fetch(url)
        if (r.status === 401 && attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, UNAUTH_RETRY_DELAY_MS))
          if (cancelled) return null
          continue
        }
        if (!r.ok) throw new Error(`Request failed (${r.status})`)
        return r.json()
      }
    }

    fetchJson()
      .then((raw) => {
        if (cancelled) return
        const parsed = validate(raw)
        if (parsed === null) throw new Error('Unexpected response shape')
        setData(parsed)
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err : new Error(String(err)))
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [url, tick, validate])

  const refetch = useCallback(() => {
    setTick((t) => t + 1)
  }, [])

  return { data, loading, error, refetch }
}
