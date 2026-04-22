import type { IncomingMessage, ServerResponse, RequestListener } from 'http'
import type { InngestFunction } from 'inngest'

export interface WorkerServerDeps {
  functions: InngestFunction.Any[]
  /**
   * Injected Inngest HTTP handler. In production `server.ts`'s entrypoint
   * builds this from `serve({ client, functions })`. Tests pass a stub so the
   * Inngest runtime doesn't have to be spun up.
   */
  serveHandler?: (req: IncomingMessage, res: ServerResponse) => void | Promise<void>
  /** Reports whether the Stockfish engine has finished its warm-up. */
  getEngineWarm?: () => boolean
}

export function createRequestHandler(deps: WorkerServerDeps): RequestListener {
  const { serveHandler, getEngineWarm } = deps

  return (req, res) => {
    const url = req.url ?? '/'

    if (url === '/health' || url === '/healthz') {
      const payload = {
        status: 'ok',
        engineWarm: getEngineWarm ? getEngineWarm() : false,
      }
      res.statusCode = 200
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify(payload))
      return
    }

    if (url.startsWith('/api/inngest')) {
      if (!serveHandler) {
        res.statusCode = 503
        res.setHeader('content-type', 'application/json')
        res.end(JSON.stringify({ error: 'inngest handler not configured' }))
        return
      }
      return serveHandler(req, res)
    }

    res.statusCode = 404
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ error: 'not found' }))
  }
}
