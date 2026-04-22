import type { InngestFunction } from 'inngest'
import { syncGamesFunction } from '../../lib/inngest/functions'

/**
 * The full list of Inngest functions this worker handles. The Vercel
 * `app/api/inngest/route.ts` is retired in slice 6 — after that, events flow
 * exclusively to this worker, whose public URL is registered in the Inngest
 * dashboard.
 */
export const workerFunctions: InngestFunction.Any[] = [syncGamesFunction]
