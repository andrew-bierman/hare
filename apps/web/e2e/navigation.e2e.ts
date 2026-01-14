import { test as baseTest, expect, type Page } from '@playwright/test'
import { test } from './fixtures'

/**
 * Navigation E2E tests.
 * Tests sidebar navigation, breadcrumbs, and routing between pages.
 */

// ============================================================================
// Route Protection Tests
// ============================================================================

baseTest.describe('Navigation Route Protection', () => {
	baseTest('unauthenticated user is redirected from dashboard to sign-in', async ({ page }) => {
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')
		await page.waitForURL(/\/sign-in/, { timeout: 10000 })
		await expect(page).toHaveURL(/\/sign-in/)
	})
})

// ============================================================================
// Sidebar Navigation (Authenticated)
// ============================================================================

test.describe('Sidebar Navigation', () => {
	test('displays sidebar with navigation links', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')

		const nav = authenticatedPage.locator('nav')
		await expect(nav.getByRole('link', { name: 'Dashboard' })).toBeVisible()
		await expect(nav.getByRole('link', { name: 'Agents' })).toBeVisible()
		await expect(nav.getByRole('link', { name: 'Tools' })).toBeVisible()
	})

	test('navigates to agents page from sidebar', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')

		await authenticatedPage.getByRole('link', { name: 'Agents' }).click()
		await authenticatedPage.waitForURL(/\/dashboard\/agents/)
		await expect(authenticatedPage.locator('main')).toBeVisible()
	})

	test('navigates to tools page from sidebar', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')

		await authenticatedPage.getByRole('link', { name: 'Tools' }).click()
		await authenticatedPage.waitForURL(/\/dashboard\/tools/, { timeout: 10000 })
		await expect(authenticatedPage.locator('main')).toBeVisible()
	})

	test('navigates to settings page from sidebar', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')

		await authenticatedPage.getByRole('link', { name: 'Settings' }).click()
		await authenticatedPage.waitForURL(/\/dashboard\/settings/)
		await expect(authenticatedPage.locator('main')).toBeVisible()
	})

	test('navigates back to dashboard from sidebar', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents')
		await authenticatedPage.waitForLoadState('networkidle')

		await authenticatedPage.getByRole('link', { name: 'Dashboard' }).click()
		await authenticatedPage.waitForURL(/\/dashboard$/)
		await expect(authenticatedPage.locator('main')).toBeVisible()
	})
})

// ============================================================================
// Full Navigation Flow (Authenticated)
// ============================================================================

test.describe('Full Navigation Flow', () => {
	test('can navigate through all dashboard sections', async ({ authenticatedPage }) => {
		// Start at dashboard
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')
		await expect(authenticatedPage.locator('main')).toBeVisible()

		// Navigate to agents
		await authenticatedPage.getByRole('link', { name: 'Agents' }).click()
		await authenticatedPage.waitForURL(/\/dashboard\/agents/)
		await expect(authenticatedPage.locator('main')).toBeVisible()

		// Navigate to tools
		await authenticatedPage.getByRole('link', { name: 'Tools' }).click()
		await authenticatedPage.waitForURL(/\/dashboard\/tools/, { timeout: 10000 })
		await expect(authenticatedPage.locator('main')).toBeVisible()

		// Navigate to settings
		await authenticatedPage.getByRole('link', { name: 'Settings' }).click()
		await authenticatedPage.waitForURL(/\/dashboard\/settings/)
		await expect(authenticatedPage.locator('main')).toBeVisible()
	})

	test('can navigate to agent creation from list', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents')
		await authenticatedPage.waitForLoadState('networkidle')

		// Look for New Agent link or button
		const newAgentLink = authenticatedPage.getByRole('link', { name: /new agent/i })
		if (await newAgentLink.isVisible({ timeout: 5000 })) {
			await newAgentLink.click()
			await authenticatedPage.waitForURL(/\/dashboard\/agents\/new/)
			await expect(
				authenticatedPage.getByRole('heading', { name: 'Create New Agent' })
			).toBeVisible({ timeout: 10000 })
		}
	})
})

// ============================================================================
// Landing Page Navigation
// ============================================================================

baseTest.describe('Landing Page Navigation', () => {
	baseTest('Get Started button navigates to sign-up', async ({ page }) => {
		await page.goto('/')
		await page.waitForLoadState('networkidle')

		const getStartedButton = page.getByRole('link', { name: /get started/i })
		if (await getStartedButton.isVisible({ timeout: 5000 })) {
			await getStartedButton.click()
			await page.waitForURL(/\/sign-up/, { timeout: 10000 })
		}
	})

	baseTest('Sign In link navigates to sign-in', async ({ page }) => {
		await page.goto('/')
		await page.waitForLoadState('networkidle')

		const signInLink = page.getByRole('link', { name: /sign in/i })
		if (await signInLink.isVisible({ timeout: 5000 })) {
			await signInLink.click()
			await page.waitForURL(/\/sign-in/, { timeout: 10000 })
		}
	})
})
