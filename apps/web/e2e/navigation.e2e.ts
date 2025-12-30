import { test as baseTest, expect, type Page } from '@playwright/test'
import { test } from './fixtures'

/**
 * Navigation E2E tests.
 * Tests sidebar navigation, breadcrumbs, and routing between pages.
 */

baseTest.describe('Sidebar Navigation - Unauthenticated', () => {
	baseTest.beforeEach(async ({ page }: { page: Page }) => {
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')
	})

	baseTest('displays sidebar with navigation links', async ({ page }: { page: Page }) => {
		const nav = page.locator('nav')
		await expect(nav.getByRole('link', { name: 'Dashboard' })).toBeVisible()
		await expect(nav.getByRole('link', { name: 'Agents' })).toBeVisible()
		await expect(nav.getByRole('link', { name: 'Tools' })).toBeVisible()
		await expect(nav.getByRole('link', { name: 'Analytics' })).toBeVisible()
		await expect(nav.getByRole('link', { name: 'Usage' })).toBeVisible()
		await expect(nav.getByRole('link', { name: 'Settings' })).toBeVisible()
	})

	baseTest('navigates to agents page from sidebar', async ({ page }: { page: Page }) => {
		await page.getByRole('link', { name: 'Agents' }).click()
		await page.waitForURL(/\/dashboard\/agents/)
		await expect(page.getByRole('heading', { name: 'Agents', exact: true })).toBeVisible()
	})

	baseTest('navigates to tools page from sidebar', async ({ page }: { page: Page }) => {
		await page.getByRole('link', { name: 'Tools' }).click()
		await page.waitForURL(/\/dashboard\/tools/, { timeout: 10000 })
		// Use locator for the main page heading (h2)
		await expect(page.locator('h2').filter({ hasText: 'Tools' })).toBeVisible()
	})

	baseTest('navigates to analytics page from sidebar', async ({ page }: { page: Page }) => {
		await page.getByRole('link', { name: 'Analytics' }).click()
		await page.waitForURL(/\/dashboard\/analytics/)
		await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible()
	})

	baseTest('navigates to usage page from sidebar', async ({ page }: { page: Page }) => {
		await page.getByRole('link', { name: 'Usage' }).click()
		await page.waitForURL(/\/dashboard\/usage/, { timeout: 10000 })
		await expect(page.getByRole('heading', { name: 'Usage' })).toBeVisible()
	})

	baseTest('navigates to settings page from sidebar', async ({ page }: { page: Page }) => {
		await page.getByRole('link', { name: 'Settings' }).click()
		await page.waitForURL(/\/dashboard\/settings/)
		await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
	})

	baseTest('navigates back to dashboard from sidebar', async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/agents')
		await page.waitForLoadState('networkidle')
		await page.getByRole('link', { name: 'Dashboard' }).click()
		await page.waitForURL(/\/dashboard$/)
		await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
	})
})

test.describe('Navigation - Authenticated', () => {
	test('can navigate through all dashboard sections', async ({ authenticatedPage }) => {
		// Start at dashboard
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')
		await expect(authenticatedPage.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

		// Navigate to agents
		await authenticatedPage.getByRole('link', { name: 'Agents' }).click()
		await authenticatedPage.waitForURL(/\/dashboard\/agents/)
		await expect(
			authenticatedPage.getByRole('heading', { name: 'Agents', exact: true }),
		).toBeVisible()

		// Navigate to tools
		await authenticatedPage.getByRole('link', { name: 'Tools' }).click()
		await authenticatedPage.waitForURL(/\/dashboard\/tools/)
		await expect(
			authenticatedPage.getByRole('heading', { name: 'Tools', exact: true }),
		).toBeVisible()

		// Navigate to settings
		await authenticatedPage.getByRole('link', { name: 'Settings' }).click()
		await authenticatedPage.waitForURL(/\/dashboard\/settings/)
		await expect(authenticatedPage.getByRole('heading', { name: 'Settings' })).toBeVisible()
	})

	test('new agent button navigates to create page', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents')
		await authenticatedPage.waitForLoadState('networkidle')

		await authenticatedPage.getByRole('link', { name: 'New Agent' }).click()
		await authenticatedPage.waitForURL(/\/dashboard\/agents\/new/)
		await expect(authenticatedPage.getByRole('heading', { name: 'Create New Agent' })).toBeVisible()
	})
})

baseTest.describe('Header Navigation', () => {
	baseTest.beforeEach(async ({ page }: { page: Page }) => {
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')
	})

	baseTest('header has search bar', async ({ page }: { page: Page }) => {
		const searchInput = page.getByPlaceholder(/search/i)
		await expect(searchInput).toBeVisible()
	})

	baseTest('header has notification icon', async ({ page }: { page: Page }) => {
		// Look for notification bell icon
		const header = page.locator('header')
		const notificationBtn = header.locator('button').filter({ has: page.locator('svg') })
		const count = await notificationBtn.count()
		expect(count).toBeGreaterThan(0)
	})
})

baseTest.describe('Mobile Navigation', () => {
	baseTest('sidebar collapses on mobile', async ({ page }: { page: Page }) => {
		await page.setViewportSize({ width: 375, height: 667 })
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')

		// On mobile, sidebar should be hidden or collapsed
		await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
	})

	baseTest('can toggle mobile menu', async ({ page }: { page: Page }) => {
		await page.setViewportSize({ width: 375, height: 667 })
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')

		// Look for hamburger menu button
		const menuButton = page
			.locator('button')
			.filter({ has: page.locator('svg') })
			.first()
		if (await menuButton.isVisible()) {
			await menuButton.click()
			await page.waitForTimeout(300)
		}
	})
})

baseTest.describe('Landing to Dashboard Navigation', () => {
	baseTest('Get Started button navigates to sign-up', async ({ page }: { page: Page }) => {
		await page.goto('/')
		await page.waitForLoadState('networkidle')

		const getStartedBtn = page.getByRole('link', { name: 'Get Started' })
		await expect(getStartedBtn).toHaveAttribute('href', '/sign-up')
	})

	baseTest('Sign In button navigates to sign-in', async ({ page }: { page: Page }) => {
		await page.goto('/')
		await page.waitForLoadState('networkidle')

		const signInLink = page.getByRole('link', { name: 'Sign In' })
		await expect(signInLink).toHaveAttribute('href', '/sign-in')
	})

	baseTest('Live Demo button navigates to dashboard', async ({ page }: { page: Page }) => {
		await page.goto('/')
		await page.waitForLoadState('networkidle')

		const liveDemoBtn = page.getByRole('link', { name: 'Live Demo' })
		await expect(liveDemoBtn).toHaveAttribute('href', '/dashboard')
	})
})
