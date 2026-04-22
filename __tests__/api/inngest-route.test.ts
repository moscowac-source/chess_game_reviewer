/**
 * @jest-environment node
 */

// Slice 6 (#74): once the persistent worker is live, the Vercel /api/inngest
// route must no longer claim to handle `sync/run`. Otherwise Inngest may
// still route jobs to Vercel — where Stockfish cold-loads freeze the event
// loop (the exact bug we moved to a worker to fix, issue #67).

import { vercelInngestFunctions } from '@/app/api/inngest/route'

describe('Vercel /api/inngest route', () => {
  it('no longer registers any sync-pipeline functions (delegated to the Fly.io worker)', () => {
    expect(vercelInngestFunctions).toEqual([])
  })
})
