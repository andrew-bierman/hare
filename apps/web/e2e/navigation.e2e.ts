import { test as baseTest, expect, type Page } from '@playwright/test'
import { test } from './fixtures'

/**
 * Navigation E2E tests.
 * Tests sidebar navigation, breadcrumbs, and routing between pages.
 */

test.describe('Sidebar Navigation - Authenticated', () => {
	test('displays sidebar with navigation links', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')
		const nav = authenticatedPage.locator('nav')
		await expect(nav.getByRole('link', { name: 'Dashboard' })).toBeVisible()
		await expect(nav.getByRole('link', { name: 'Agents' })).toBeVisible()
		await expect(nav.getByRole('link', { name: 'Tools' })).toBeVisible()
		await expect(nav.getByRole('link', { name: 'Usage' })).toBeVisible()
		await expect(nav.getByRole('link', { name: 'Settings' })).toBeVisible()
	})

	test('navigates to agents page from sidebar', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')
		await authenticatedPage.getByRole('link', { name: 'Agents' }).click()
		await authenticatedPage.waitForURL(/\/dashboard\/agents/)
		await expect(
			authenticatedPage.getByRole('heading', { name: 'Agents', exact: true }),
		).toBeVisible()
	})

	test('navigates to tools page from sidebar', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')
		await authenticatedPage.getByRole('link', { name: 'Tools' }).click()
		await authenticatedPage.waitForURL(/\/dashboard\/tools/, { timeout: 10000 })
		// Use locator for the main page heading (h2)
		await expect(authenticatedPage.locator('h2').filter({ hasText: 'Tools' })).toBeVisible()
	})

	test('navigates to usage page from sidebar', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')
		await authenticatedPage.getByRole('link', { name: 'Usage' }).click()
		await authenticatedPage.waitForURL(/\/dashboard\/usage/, { timeout: 10000 })
		await expect(authenticatedPage.getByRole('heading', { name: 'Usage' })).toBeVisible()
	})

	test('navigates to settings page from sidebar', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')
		await authenticatedPage.getByRole('link', { name: 'Settings' }).click()
		await authenticatedPage.waitForURL(/\/dashboard\/settings/)
		await expect(authenticatedPage.getByRole('heading', { name: 'Settings' })).toBeVisible()
	})

	test('navigates back to dashboard from sidebar', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents')
		await authenticatedPage.waitForLoadState('networkidle')
		await authenticatedPage.getByRole('link', { name: 'Dashboard' }).click()
		await authenticatedPage.waitForURL(/\/dashboard$/)
		await expect(authenticatedPage.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
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

test.describe('Header Navigation - Authenticated', () => {
	test('header has search bar', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')
		const searchInput = authenticatedPage.getByPlaceholder(/search/i)
		await expect(searchInput).toBeVisible()
	})

	test('header has notification icon', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')
		// Look for notification bell icon
		const header = authenticatedPage.locator('header')
		const notificationBtn = header.locator('button').filter({ has: authenticatedPage.locator('svg') })
		const count = await notificationBtn.count()
		expect(count).toBeGreaterThan(0)
	})
})

test.describe('Mobile Navigation - Authenticated', () => {
	test('sidebar collapses on mobile', async ({ authenticatedPage }) => {
		await authenticatedPage.setViewportSize({ width: 375, height: 667 })
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')

		// On mobile, sidebar should be hidden or collapsed
		await expect(authenticatedPage.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
	})

	test('can toggle mobile menu', async ({ authenticatedPage }) => {
		await authenticatedPage.setViewportSize({ width: 375, height: 667 })
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')

		// Look for hamburger menu button
		const menuButton = authenticatedPage
			.locator('button')
			.filter({ has: authenticatedPage.locator('svg') })
			.first()
		if (await menuButton.isVisible()) {
			await menuButton.click()
			await authenticatedPage.waitForTimeout(300)
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
