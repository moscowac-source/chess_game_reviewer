import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest/client'
import { syncGamesFunction } from '@/lib/inngest/functions'

// Each Inngest step runs as its own invocation of this handler. A single
// game's Stockfish analysis needs well more than Vercel's default budget —
// 300s (5 min, Vercel Pro ceiling) gives ample headroom per step while the
// step.run memoization keeps the whole sync resumable.
export const maxDuration = 300

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [syncGamesFunction],
})
