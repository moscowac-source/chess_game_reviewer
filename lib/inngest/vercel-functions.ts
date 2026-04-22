import type { InngestFunction } from 'inngest'

// Slice 6 (#74): the sync pipeline runs on the Fly.io worker now. Vercel's
// /api/inngest route no longer registers sync-games, because serverless
// cold-starts can't load the 40MB Stockfish NNUE weights without freezing
// the event loop (issue #67). The array is kept (empty) so any future
// non-sync Inngest functions can slot in without re-wiring the Next.js app.
//
// Lives in `lib/` rather than inside `app/api/inngest/route.ts` because
// Next.js 15's route-file type check only allows named exports like
// `GET` / `POST` / `dynamic` — anything else fails the build.
export const vercelInngestFunctions: InngestFunction.Any[] = []
