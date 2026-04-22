import http from 'http'
import { createRequestHandler } from './server'

const PORT = Number(process.env.PORT ?? 3000)

// Slice 1: minimal always-on process with a /health endpoint so the container
// is deployable and Fly.io health-checks pass. Later slices register the
// Inngest `syncGamesFunction` and a warm Stockfish engine.
function main() {
  const handler = createRequestHandler({ functions: [] })
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
