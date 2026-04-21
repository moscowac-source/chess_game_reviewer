# E2E Tests (Playwright)

Durable regression tests for critical user journeys. Run in CI on every PR.

## What belongs here

Only flows we'd be angry about silently breaking:

- Public page rendering (landing, login, signup, protected-route redirect)
- Signup → onboard → first review
- Settings: change Chess.com handle → persists
- Sync start → progress → complete
- Login / logout round-trip

Component behavior and API validation stay in `__tests__/` (jest). One-off
"does this PR look right?" checks happen via Claude in Chrome, not here.

## Running locally

```bash
# Run all tests (auto-starts next dev server)
npm run test:e2e

# Interactive UI mode — best for authoring / debugging
npm run test:e2e:ui

# Against an already-running server (e.g. a preview deploy)
PLAYWRIGHT_BASE_URL=https://preview.example.com npm run test:e2e
```

First-time setup: `npx playwright install chromium` downloads the browser
binary (~100 MB, one-time).

## Authenticated flows — fixture still needed

`authed-flows.spec.ts` is currently gated by `test.describe.skip(...)`. The
selectors are real and the tests will run once one of these is in place:

**Option A — seeded test user against a dedicated Supabase project**
1. Create a long-lived Supabase project for E2E only.
2. Seed a test user via migration or an admin-key script in `e2e/setup/`.
3. Set `E2E_TEST_USER_EMAIL` / `E2E_TEST_USER_PASSWORD` as CI secrets.
4. Remove the `.skip`.

**Option B — storageState fixture (faster, no real auth per test)**
1. Log in once in a `global-setup.ts`, save `storageState` to a file.
2. Reference that file in `playwright.config.ts` under `use.storageState`.
3. Each test starts already authenticated — no login round-trip on every run.

Option B is preferred for speed. Add it when a real critical-path bug
motivates having these tests running.

## CI

`.github/workflows/e2e.yml` runs on every PR. Chromium only — Firefox and
WebKit add ~10 min with near-zero additional signal for a React/Next.js app.
