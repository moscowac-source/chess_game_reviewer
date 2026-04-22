import { serve } from 'inngest/next'
import type { InngestFunction } from 'inngest'
import { inngest } from '@/lib/inngest/client'

// Slice 6 (#74): the sync pipeline runs on the Fly.io worker now. Vercel no
// longer serves `sync-games`, because serverless cold-starts can't load the
// 40MB Stockfish NNUE weights without freezing the event loop (issue #67).
// The route is kept as an empty serve() so any future non-sync Inngest
// functions can slot in without re-wiring the Next.js app.
export const vercelInngestFunctions: InngestFunction.Any[] = []

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: vercelInngestFunctions,
})
