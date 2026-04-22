# Chess Improver Sync Worker

Persistent Node/Docker worker that runs the sync pipeline off a single
always-on VM. Replaces the Vercel serverless path that was hanging on the
40MB Stockfish NNUE-16 weights cold-load (issue #67 / plan F in #74).

## Why a persistent worker

Stockfish NNUE-16 loads a 40MB weights file via synchronous `fs.readFileSync`
and a synchronous WASM compile. On Vercel's serverless cold-start model that
blocks the event loop for 20–60s per invocation, long enough that no timeout
could fire and Vercel eventually killed the container. A long-running
container pays that cost once at boot and then serves every subsequent job
warm.

## Local usage

```bash
# Build
cd worker && npx tsc
# Run
node dist/worker/src/index.js        # listens on :3000
curl localhost:3000/health           # → {"status":"ok","engineWarm":false}
```

## Deploy to Fly.io (first-time setup)

```bash
brew install flyctl
flyctl auth login
flyctl apps create chess-improver-worker

# Secrets — pull values from Vercel project env.
flyctl secrets set \
  SUPABASE_URL=... \
  SUPABASE_SERVICE_ROLE_KEY=... \
  INNGEST_EVENT_KEY=... \
  INNGEST_SIGNING_KEY=... \
  --app chess-improver-worker

flyctl deploy --config worker/fly.toml --dockerfile worker/Dockerfile
```

## Deploying updates

```bash
flyctl deploy --config worker/fly.toml --dockerfile worker/Dockerfile
```

Once the worker is live, register its `/api/inngest` URL in the Inngest
dashboard so events route to the worker instead of to Vercel.

## Health

`GET /health` → `{"status":"ok","engineWarm":<bool>}`.
`engineWarm` flips to `true` once the Stockfish NNUE weights are loaded.
