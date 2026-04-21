'use client'

import { useCallback, useState } from 'react'

export interface VerifyResult {
  ok: boolean
  handle?: string
  error?: string
}

export async function verifyChessComHandle(handle: string): Promise<VerifyResult> {
  const trimmed = handle.trim()
  if (!trimmed) return { ok: false, error: 'Enter a username first.' }
  try {
    const res = await fetch(`https://api.chess.com/pub/player/${trimmed.toLowerCase()}`)
    if (res.ok) return { ok: true, handle: trimmed }
    return { ok: false, error: 'Username not found on Chess.com. Check the spelling and try again.' }
  } catch {
    return { ok: false, error: 'Could not reach Chess.com. Check your connection.' }
  }
}

export function useChessComVerify() {
  const [verifying, setVerifying] = useState(false)
  const [verified, setVerified] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const verify = useCallback(async (handle: string): Promise<VerifyResult> => {
    setVerifying(true)
    setError(null)
    const result = await verifyChessComHandle(handle)
    setVerifying(false)
    if (result.ok) {
      setVerified(true)
    } else {
      setVerified(false)
      setError(result.error ?? 'Verification failed.')
    }
    return result
  }, [])

  const reset = useCallback(() => {
    setVerified(false)
    setError(null)
  }, [])

  return { verify, verifying, verified, error, reset }
}
