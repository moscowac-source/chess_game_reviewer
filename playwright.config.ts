import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright config for durable E2E regression tests.
 *
 * What belongs here: critical user journeys that we'd be angry about silently
 * regressing. Unit & component tests stay in jest; ad-hoc UI smoke checks
 * happen via Claude in Chrome, not here.
 *
 * Running locally:   npm run test:e2e
 * Interactive UI:    npm run test:e2e:ui
 * In CI:             same npm run test:e2e (with CI=1 env)
 */
const PORT = Number(process.env.PORT ?? 3000)
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Auto-start the Next.js dev server when running locally or in CI.
  // Override with PLAYWRIGHT_BASE_URL to point at an already-running preview.
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        stdout: 'ignore',
        stderr: 'pipe',
      },
})
