import http from 'http'
import { serve } from 'inngest/node'
import { inngest } from '../../lib/inngest/client'
import { createRequestHandler } from './server'
import { workerFunctions } from './functions'

const PORT = Number(process.env.PORT ?? 3000)

function main() {
  const serveHandler = serve({ client: inngest, functions: workerFunctions })
  const handler = createRequestHandler({
    functions: workerFunctions,
    serveHandler,
  })
  const server = http.createServer(handler)

  server.listen(PORT, () => {
    console.log(`[worker] listening on :${PORT}`)
  })

  const shutdown = (signal: string) => {
    console.log(`[worker] ${signal} received, shutting down`)
    server.close(() => process.exit(0))
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

if (require.main === module) {
  main()
}
