import { test, expect } from '@playwright/test'

test.describe('App Smoke Tests', () => {
  test('app loads without crashing', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('body')).toBeVisible()
    // Should not show a React error overlay
    const bodyText = await page.locator('body').textContent()
    expect(bodyText).not.toContain('Application error')
  })

  test('sidebar navigation is visible', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // The sidebar should contain navigation links
    const sidebar = page.locator('nav, aside, [class*="sidebar"]').first()
    if (await sidebar.isVisible()) {
      const text = await sidebar.textContent()
      // Should contain at least one section name
      const hasNavItems = text.includes('OKR') || text.includes('Plan') || text.includes('Company')
      expect(hasNavItems).toBeTruthy()
    }
  })

  test('can navigate between sections without crash', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Find all navigation links
    const navLinks = page.locator('nav a, aside a, [class*="sidebar"] a, [class*="sidebar"] button')
    const count = await navLinks.count()

    // Click each nav link and verify no crash
    for (let i = 0; i < Math.min(count, 5); i++) {
      const link = navLinks.nth(i)
      if (await link.isVisible()) {
        await link.click()
        await page.waitForTimeout(500)

        // Verify no crash
        const bodyText = await page.locator('body').textContent()
        expect(bodyText).not.toContain('Application error')
      }
    }
  })
})
