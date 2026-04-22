import type { IncomingMessage, ServerResponse, RequestListener } from 'http'
import { createRequestHandler } from '../../worker/src/server'

describe('worker HTTP server', () => {
  describe('GET /health', () => {
    it('returns 200 with { status: "ok" } JSON payload', async () => {
      const handler = createRequestHandler({ functions: [] })

      const { status, headers, body } = await invoke(handler, 'GET', '/health')

      expect(status).toBe(200)
      expect(headers['content-type']).toMatch(/application\/json/)
      expect(JSON.parse(body)).toMatchObject({ status: 'ok' })
    })

    it('reports engineWarm=false before engine is registered', async () => {
      const handler = createRequestHandler({ functions: [] })

      const { body } = await invoke(handler, 'GET', '/health')

      expect(JSON.parse(body)).toMatchObject({ engineWarm: false })
    })

    it('reports engineWarm=true once a warm engine is registered', async () => {
      const handler = createRequestHandler({
        functions: [],
        getEngineWarm: () => true,
      })

      const { body } = await invoke(handler, 'GET', '/health')

      expect(JSON.parse(body)).toMatchObject({ engineWarm: true })
    })
  })

  describe('unknown route', () => {
    it('returns 404 for unrecognised paths', async () => {
      const handler = createRequestHandler({ functions: [] })

      const { status } = await invoke(handler, 'GET', '/does-not-exist')

      expect(status).toBe(404)
    })
  })

  describe('/api/inngest', () => {
    it('delegates to the Inngest serve handler', async () => {
      const calls: Array<{ url: string | undefined; method: string | undefined }> = []
      const fakeServe = ((req: { url?: string; method?: string }, res: { statusCode: number; setHeader: (k: string, v: string) => void; end: (b?: string) => void }) => {
        calls.push({ url: req.url, method: req.method })
        res.statusCode = 200
        res.setHeader('content-type', 'application/json')
        res.end('{"ok":true}')
      }) as unknown as Parameters<typeof createRequestHandler>[0]['serveHandler']

      const handler = createRequestHandler({ functions: [], serveHandler: fakeServe })
      const { status, body } = await invoke(handler, 'POST', '/api/inngest')

      expect(status).toBe(200)
      expect(body).toBe('{"ok":true}')
      expect(calls).toHaveLength(1)
      expect(calls[0].method).toBe('POST')
    })
  })
})

// Minimal mock of http.IncomingMessage / ServerResponse for handler tests.
function invoke(
  handler: RequestListener,
  method: string,
  url: string,
): Promise<{ status: number; headers: Record<string, string>; body: string }> {
  const req = { method, url, headers: {} } as unknown as IncomingMessage
  return new Promise((resolve) => {
    const captured: { statusCode: number; _headers: Record<string, string> } = {
      statusCode: 200,
      _headers: {},
    }
    const res = {
      get statusCode() {
        return captured.statusCode
      },
      set statusCode(v: number) {
        captured.statusCode = v
      },
      setHeader(k: string, v: string) {
        captured._headers[k.toLowerCase()] = v
      },
      end(body?: string) {
        resolve({ status: captured.statusCode, headers: captured._headers, body: body ?? '' })
      },
    } as unknown as ServerResponse
    try {
      const result = handler(req, res) as unknown as Promise<unknown> | void
      if (result && typeof (result as Promise<unknown>).catch === 'function') {
        ;(result as Promise<unknown>).catch((err) => {
          resolve({ status: 500, headers: {}, body: String(err) })
        })
      }
    } catch (err) {
      resolve({ status: 500, headers: {}, body: String(err) })
    }
  })
}
