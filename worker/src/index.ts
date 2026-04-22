import http from 'http'
import { serve } from 'inngest/node'
import { inngest } from '../../lib/inngest/client'
import { createRequestHandler } from './server'
import { createWorkerFunctions } from './functions'

const PORT = Number(process.env.PORT ?? 3000)

let engineWarm = false

async function main() {
  // Start the HTTP listener BEFORE awaiting the 40MB NNUE load so Fly.io's
  // health-check can see the process is alive while it warms up. /health
  // reports `engineWarm: false` until the factory promise resolves, then
  // flips to `true` — that gives the platform a clean ready-signal to gate
  // traffic on.
  const preloadFunctionsPromise = createWorkerFunctions()
  const handler = createRequestHandler({
    functions: [],
    // Temporarily 503 Inngest requests until the engine is warm; Inngest's
    // SDK retries on 5xx, so jobs delivered during boot aren't lost.
    getEngineWarm: () => engineWarm,
  })
  const server = http.createServer(handler)

  server.listen(PORT, () => {
    console.log(`[worker] listening on :${PORT}`)
  })

  const functions = await preloadFunctionsPromise
  engineWarm = true
  console.log(`[worker] engine warm; ${functions.length} inngest functions registered`)

  const serveHandler = serve({ client: inngest, functions })
  // Swap the handler in-place now that the engine is ready. The next HTTP
  // request will pick up the new one.
  server.removeAllListeners('request')
  server.on(
    'request',
    createRequestHandler({
      functions,
      serveHandler,
      getEngineWarm: () => engineWarm,
    }),
  )

  const shutdown = (signal: string) => {
    console.log(`[worker] ${signal} received, shutting down`)
    server.close(() => process.exit(0))
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

if (require.main === module) {
  main().catch((err) => {
    console.error('[worker] failed to start', err)
    process.exit(1)
  })
}
