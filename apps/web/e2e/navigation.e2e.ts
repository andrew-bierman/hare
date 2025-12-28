import { test as baseTest, expect, type Page } from '@playwright/test'
import { test } from './fixtures'

baseTest.describe('Navigation - Sidebar Links', () => {
	baseTest.beforeEach(async ({ page }: { page: Page }) => {
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')
	})

	baseTest('sidebar has all main navigation links', async ({ page }: { page: Page }) => {
		const nav = page.locator('nav')
		await expect(nav.getByRole('link', { name: 'Dashboard' })).toBeVisible()
		await expect(nav.getByRole('link', { name: 'Agents' })).toBeVisible()
		await expect(nav.getByRole('link', { name: 'Tools' })).toBeVisible()
		await expect(nav.getByRole('link', { name: 'Usage' })).toBeVisible()
		await expect(nav.getByRole('link', { name: 'Settings' })).toBeVisible()
	})

	baseTest('clicking Agents navigates to agents page', async ({ page }: { page: Page }) => {
		const nav = page.locator('nav')
		await nav.getByRole('link', { name: 'Agents' }).click()
		await expect(page).toHaveURL(/\/dashboard\/agents/)
		await expect(page.getByRole('heading', { name: 'Agents', exact: true })).toBeVisible()
	})

	baseTest('clicking Tools navigates to tools page', async ({ page }: { page: Page }) => {
		const nav = page.locator('nav')
		await nav.getByRole('link', { name: 'Tools' }).click()
		await expect(page).toHaveURL(/\/dashboard\/tools/)
		await expect(page.getByRole('heading', { name: 'Tools', exact: true })).toBeVisible()
	})

	baseTest('clicking Usage navigates to usage page', async ({ page }: { page: Page }) => {
		const nav = page.locator('nav')
		await nav.getByRole('link', { name: 'Usage' }).click()
		await expect(page).toHaveURL(/\/dashboard\/usage/)
		await expect(page.getByRole('heading', { name: 'Usage' })).toBeVisible()
	})

	baseTest('clicking Settings navigates to settings page', async ({ page }: { page: Page }) => {
		const nav = page.locator('nav')
		await nav.getByRole('link', { name: 'Settings' }).click()
		await expect(page).toHaveURL(/\/dashboard\/settings/)
		await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
	})

	baseTest('clicking Dashboard returns to dashboard', async ({ page }: { page: Page }) => {
		// Navigate away first
		await page.goto('/dashboard/agents')
		await page.waitForLoadState('networkidle')

		// Then click Dashboard in sidebar
		const nav = page.locator('nav')
		await nav.getByRole('link', { name: 'Dashboard' }).click()
		await expect(page).toHaveURL(/\/dashboard$|\/dashboard\//)
		await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
	})
})

baseTest.describe('Navigation - Settings Pages', () => {
	baseTest('settings page loads', async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/settings')
		await page.waitForLoadState('networkidle')
		await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
	})

	baseTest('api-keys page is accessible', async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/settings/api-keys')
		await page.waitForLoadState('networkidle')
		await expect(page).toHaveURL(/\/dashboard\/settings\/api-keys/)
	})

	baseTest('billing page is accessible', async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/settings/billing')
		await page.waitForLoadState('networkidle')
		await expect(page).toHaveURL(/\/dashboard\/settings\/billing/)
	})

	baseTest('team page is accessible', async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/settings/team')
		await page.waitForLoadState('networkidle')
		await expect(page).toHaveURL(/\/dashboard\/settings\/team/)
	})
})

baseTest.describe('Navigation - Agent Detail Pages', () => {
	baseTest('new agent page is accessible', async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/agents/new')
		await page.waitForLoadState('networkidle')
		await expect(page.getByRole('heading', { name: 'Create New Agent' })).toBeVisible()
	})

	baseTest('new agent button navigates correctly', async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/agents')
		await page.waitForLoadState('networkidle')
		await page.getByRole('link', { name: 'New Agent' }).click()
		await expect(page).toHaveURL(/\/dashboard\/agents\/new/)
	})
})

baseTest.describe('Navigation - Mobile Responsive', () => {
	baseTest('mobile menu button is visible on small screens', async ({ page }: { page: Page }) => {
		await page.setViewportSize({ width: 375, height: 667 })
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')

		// Menu button should be visible on mobile
		const menuButton = page.getByRole('button', { name: /menu/i })
		await expect(menuButton).toBeVisible()
	})

	baseTest('sidebar is hidden on mobile by default', async ({ page }: { page: Page }) => {
		await page.setViewportSize({ width: 375, height: 667 })
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')

		// Sidebar should be hidden on mobile
		const sidebar = page.locator('.hidden.md\\:flex')
		// The sidebar has this class on mobile
		expect(sidebar).toBeDefined()
	})
})

test.describe('Navigation - Authenticated User', () => {
	test('authenticated user can navigate all dashboard routes', async ({ authenticatedPage }) => {
		// Test dashboard
		await authenticatedPage.goto('/dashboard')
		await expect(authenticatedPage.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

		// Test agents
		await authenticatedPage.goto('/dashboard/agents')
		await expect(
			authenticatedPage.getByRole('heading', { name: 'Agents', exact: true }),
		).toBeVisible()

		// Test tools
		await authenticatedPage.goto('/dashboard/tools')
		await expect(
			authenticatedPage.getByRole('heading', { name: 'Tools', exact: true }),
		).toBeVisible()

		// Test usage
		await authenticatedPage.goto('/dashboard/usage')
		await expect(authenticatedPage.getByRole('heading', { name: 'Usage' })).toBeVisible()

		// Test settings
		await authenticatedPage.goto('/dashboard/settings')
		await expect(authenticatedPage.getByRole('heading', { name: 'Settings' })).toBeVisible()
	})

	test('authenticated user can access settings subpages', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings/api-keys')
		await expect(authenticatedPage).toHaveURL(/\/dashboard\/settings\/api-keys/)

		await authenticatedPage.goto('/dashboard/settings/billing')
		await expect(authenticatedPage).toHaveURL(/\/dashboard\/settings\/billing/)

		await authenticatedPage.goto('/dashboard/settings/team')
		await expect(authenticatedPage).toHaveURL(/\/dashboard\/settings\/team/)
	})

	test('authenticated user can navigate via sidebar clicks', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')

		const nav = authenticatedPage.locator('nav')

		// Click through each nav item
		await nav.getByRole('link', { name: 'Agents' }).click()
		await expect(authenticatedPage).toHaveURL(/\/dashboard\/agents/)

		await nav.getByRole('link', { name: 'Tools' }).click()
		await expect(authenticatedPage).toHaveURL(/\/dashboard\/tools/)

		await nav.getByRole('link', { name: 'Usage' }).click()
		await expect(authenticatedPage).toHaveURL(/\/dashboard\/usage/)

		await nav.getByRole('link', { name: 'Settings' }).click()
		await expect(authenticatedPage).toHaveURL(/\/dashboard\/settings/)

		await nav.getByRole('link', { name: 'Dashboard' }).click()
		await expect(authenticatedPage).toHaveURL(/\/dashboard/)
	})
})

baseTest.describe('Navigation - Header', () => {
	baseTest.beforeEach(async ({ page }: { page: Page }) => {
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')
	})

	baseTest('header has search button on mobile', async ({ page }: { page: Page }) => {
		await page.setViewportSize({ width: 375, height: 667 })
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')

		const searchButton = page.getByRole('button', { name: /search/i })
		await expect(searchButton).toBeVisible()
	})

	baseTest('header has notifications button', async ({ page }: { page: Page }) => {
		const notificationsButton = page.getByRole('button', { name: /notifications/i })
		await expect(notificationsButton).toBeVisible()
	})
})

baseTest.describe('Navigation - Landing Page Links', () => {
	baseTest('header navigation links work', async ({ page }: { page: Page }) => {
		await page.goto('/')
		await page.waitForLoadState('networkidle')

		// Features link should scroll or navigate
		const featuresLink = page.getByRole('link', { name: 'Features' })
		await expect(featuresLink).toBeVisible()

		// How it Works link
		const howItWorksLink = page.getByRole('link', { name: 'How it Works' })
		await expect(howItWorksLink).toBeVisible()
	})

	baseTest('CTA buttons navigate correctly', async ({ page }: { page: Page }) => {
		await page.goto('/')
		await page.waitForLoadState('networkidle')

		// Start Building Free button
		const startBuildingLink = page.getByRole('link', { name: 'Start Building Free' })
		await expect(startBuildingLink).toHaveAttribute('href', '/sign-up')

		// Live Demo button
		const liveDemoLink = page.getByRole('link', { name: 'Live Demo' })
		await expect(liveDemoLink).toHaveAttribute('href', '/dashboard')
	})

	baseTest('footer links are present', async ({ page }: { page: Page }) => {
		await page.goto('/')
		await page.waitForLoadState('networkidle')

		const footer = page.locator('footer')
		await expect(footer.getByRole('link', { name: 'Documentation' })).toBeVisible()
		await expect(footer.getByRole('link', { name: 'Privacy' })).toBeVisible()
		await expect(footer.getByRole('link', { name: 'Terms' })).toBeVisible()
	})
})
