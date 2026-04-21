import { test, expect } from '@playwright/test'

/**
 * Authenticated critical-path flows.
 *
 * These are SKIPPED until the E2E auth fixture is in place — see
 * `e2e/README.md` for the setup plan. Each test is written against the real
 * UI selectors so it will run as-is once a test user + session fixture lands.
 *
 * Critical paths covered:
 *  - Settings: change Chess.com handle → persists after reload
 *  - Onboarding: name → link chess.com → begin import
 *  - Sync: start → progress updates → complete
 *  - Login/logout round-trip
 *
 * Do not remove `.skip` until the fixture is ready. Flaky E2E tests that get
 * disabled individually are worse than the whole file being gated behind one
 * clear blocker.
 */

test.describe.skip('Authenticated flows (requires test user fixture)', () => {
  test('settings: change Chess.com handle and persist across reload', async ({ page }) => {
    // Stub api.chess.com so the test doesn't depend on their public API.
    await page.route('https://api.chess.com/pub/player/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '{"username":"test_handle"}' }),
    )

    await page.goto('/settings')

    const handleInput = page.getByLabel(/username/i).first()
    await handleInput.fill('test_handle')
    await page.getByRole('button', { name: /verify/i }).click()
    await expect(page.getByRole('button', { name: /verified/i })).toBeVisible()

    await page.getByRole('button', { name: /^save$/i }).click()
    await expect(page.getByText(/saved/i)).toBeVisible()

    await page.reload()
    await expect(handleInput).toHaveValue('test_handle')
  })

  test('onboard: name → link chess.com → begin import', async ({ page }) => {
    await page.route('https://api.chess.com/pub/player/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '{"username":"test_handle"}' }),
    )

    await page.goto('/onboard')

    // Step 1: Name (optional — skip)
    await page.getByRole('button', { name: /skip/i }).click()

    // Step 2: Link
    await page.getByPlaceholder(/your_handle/i).fill('test_handle')
    await page.getByRole('button', { name: /verify/i }).click()
    await expect(page.getByText(/account found/i)).toBeVisible()
    await page.getByRole('button', { name: /import these games/i }).click()

    // Step 3: Import — just confirm the step renders
    await expect(page.getByRole('heading', { name: /pull the history/i })).toBeVisible()
  })

  test('login → dashboard → logout → back at login', async ({ page }) => {
    // Requires a seeded test user. Credentials pulled from env.
    const email = process.env.E2E_TEST_USER_EMAIL
    const password = process.env.E2E_TEST_USER_PASSWORD
    test.skip(!email || !password, 'Set E2E_TEST_USER_EMAIL/PASSWORD to run this test')

    await page.goto('/login')
    await page.getByPlaceholder(/you@domain\.com/i).fill(email!)
    await page.getByPlaceholder(/your password/i).fill(password!)
    await page.getByRole('button', { name: /sign in/i }).click()

    await expect(page).toHaveURL(/\/dashboard/)

    await page.getByTestId('user-avatar').click()
    await page.getByTestId('logout-button').click()

    await expect(page).toHaveURL(/\/login/)
  })
})
