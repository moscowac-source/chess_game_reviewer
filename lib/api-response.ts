import { NextResponse } from 'next/server'

export function apiError(
  status: number,
  message: string,
  details?: Record<string, unknown>,
): NextResponse {
  return NextResponse.json({ error: message, ...details }, { status })
}
