'use client'

import { useCallback, useEffect, useState } from 'react'

export interface FetchResult<T> {
  data: T | null
  loading: boolean
  error: Error | null
  refetch: () => void
}

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

    fetch(url)
      .then(async (r) => {
        if (!r.ok) throw new Error(`Request failed (${r.status})`)
        return r.json()
      })
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
