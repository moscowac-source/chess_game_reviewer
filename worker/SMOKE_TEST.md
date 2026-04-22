# Plan F worker — prod smoke test

Run this checklist after the worker is deployed to Fly.io and its
`/api/inngest` URL is registered in the Inngest dashboard. The test
reproduces the scenario that was failing in issue #67: a real chess.com
account with ~16 games must complete end-to-end, producing `analyze:ok`
rows and `cards_created > 0`.

Target account: **`catalyst030119`** (~16 games on chess.com, all short, a
mix of wins/losses/draws so every classification branch of
`move-classifier` gets hit).

## 1. Confirm worker is live and warm

```bash
curl https://chess-improver-worker.fly.dev/health
# Expect: {"status":"ok","engineWarm":true}
```

If `engineWarm` is `false` for more than ~90 seconds after boot, check
Fly logs (`flyctl logs --app chess-improver-worker`) for a Stockfish
init error. The `[worker] engine warm; N inngest functions registered`
line must appear before moving on.

## 2. Confirm Inngest registration

Inngest dashboard → Apps → `chess-improver` → the URL listed for
`sync-games` must be the worker's `/api/inngest`, not Vercel. If it
still says Vercel, click "Sync app" and enter the worker URL.

## 3. Trigger the sync from the UI

1. Log in to https://chess-game-reviewer.vercel.app.
2. Settings → set `chess_com_username = catalyst030119`.
3. `/sync` → click "Start historical sync".

## 4. Verify pipeline completion

Open `/sync/audit` (or query `sync_step_log` directly). Expected rows
for the latest `sync_log_id`:

- [ ] `sync-start` → `ok`
- [ ] `fetch-archives-start` → `ok`
- [ ] `fetch-archives-end` → `ok`, details.count ≥ 1
- [ ] For **each of ~16 games**:
  - [ ] `parse-headers` → `ok`
  - [ ] `parse-positions` → `ok`
  - [ ] `ensure-game-row` → `ok`
  - [ ] `analyze` → `ok`, details.positions > 0
  - [ ] `generate-cards` → `ok`
- [ ] `sync-end` → `ok`

On the `sync_log` row:
- [ ] `stage = 'complete'`
- [ ] `games_processed > 0` (target: 16)
- [ ] `cards_created > 0`
- [ ] `error IS NULL`

## 5. Verify ETag reuse on the second sync

Kick off another historical sync for the same account:

```sql
-- Before:
SELECT year, month, etag, fetched_at
  FROM chess_com_archives
  WHERE user_id = <uid> ORDER BY year DESC, month DESC;
```

Run the sync, then re-query. Every row's `etag` should be unchanged and
`fetched_at` should advance — evidence that chess.com returned 304 and
the worker reused the cache. Worker logs should NOT contain a
`fetchMonthlyArchive 200 OK` line for months that already had a row.

## 6. Verify 429 backoff (optional / manual)

Artificially force a 429 by temporarily stubbing chess.com in a local
worker run, or rely on the unit tests
(`__tests__/lib/chess-com/retry.test.ts`) — the prod path isn't easy to
exercise without rate-limit abuse.

## 7. Regression gate

Confirm none of these have changed behaviour:

- [ ] #62: stale sync progress UI
- [ ] #63: sync aborts mid-fetch
- [ ] #64: per-game Inngest isolation
- [ ] #65: sync hero + stat card driven off `syncRunStatusLabel`
- [ ] #66: "last successful run" timestamp shown, not "last run"

## Rollback

If the smoke test fails:

1. `flyctl deploy --image <previous-sha>` to roll the worker back, OR
2. Re-register the Vercel `/api/inngest` URL in Inngest. This PR
   removed the Vercel-side function list, so restore
   `syncGamesFunction` in `app/api/inngest/route.ts` before redeploying
   Vercel.
