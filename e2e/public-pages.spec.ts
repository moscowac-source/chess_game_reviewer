import { test, expect } from '@playwright/test'

/**
 * Smoke tests for public (unauthenticated) pages. These run without any
 * Supabase test fixture — they just confirm the pages render and the primary
 * CTAs are reachable. If these break, the build is fundamentally wrong.
 */

test.describe('Public pages', () => {
  test('landing page renders and links to signup + login', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /begin/i })).toBeVisible()
  })

  test('login page renders the email/password form', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible()
    await expect(page.getByPlaceholder(/you@domain\.com/i)).toBeVisible()
    await expect(page.getByPlaceholder(/your password/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })

  test('signup page renders a form', async ({ page }) => {
    await page.goto('/signup')

    // Signup page should at minimum expose an email input.
    await expect(page.locator('input[type="email"]').first()).toBeVisible()
  })

  test('protected route redirects unauthenticated user to login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })
})
