import { expect, type Page, test } from '@playwright/test'

test.describe('Sidebar Navigation - All routes should load without 404', () => {
	test('dashboard page loads correctly', async ({ page }: { page: Page }) => {
		await page.goto('/dashboard')
		await expect(page).toHaveURL('/dashboard')
		// Verify the page title is visible
		await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
		// Verify page has meaningful content (not a 404 page)
		await expect(page.locator('body')).not.toContainText('404')
	})

	test('agents page loads correctly', async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/agents')
		await expect(page).toHaveURL('/dashboard/agents')
		// Verify the page title is visible (use exact: true to avoid matching other headings)
		await expect(page.getByRole('heading', { name: 'Agents', exact: true })).toBeVisible()
		// Verify the New Agent button exists
		await expect(page.getByRole('link', { name: 'New Agent' })).toBeVisible()
	})

	test('tools page loads correctly', async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/tools')
		await expect(page).toHaveURL('/dashboard/tools')
		// Verify the page title is visible (use exact: true to avoid matching other headings)
		await expect(page.getByRole('heading', { name: 'Tools', exact: true })).toBeVisible()
		// Verify the Add Tool button exists (use first() since there may be multiple)
		await expect(page.getByRole('button', { name: 'Add Tool' }).first()).toBeVisible()
	})

	test('usage page loads correctly', async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/usage')
		await expect(page).toHaveURL('/dashboard/usage')
		// Verify the page title is visible
		await expect(page.getByRole('heading', { name: 'Usage' })).toBeVisible()
		// Verify meaningful content exists
		await expect(page.locator('body')).not.toContainText('404')
	})

	test('settings page loads correctly', async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/settings')
		await expect(page).toHaveURL('/dashboard/settings')
		// Wait for page to fully load (settings page has a loading skeleton)
		await page.waitForLoadState('networkidle')
		await page.waitForSelector('h2:has-text("Settings")', { timeout: 10000 })
		// Verify the page title is visible
		await expect(page.locator('h2').filter({ hasText: 'Settings' })).toBeVisible()
		// Verify meaningful content exists (use first() to handle multiple matches)
		await expect(page.getByText('Profile', { exact: true }).first()).toBeVisible()
	})
})

test.describe('Sidebar Navigation Links', () => {
	test('sidebar links have correct hrefs', async ({ page }: { page: Page }) => {
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')

		// Use nav locator for sidebar links
		const nav = page.locator('nav')

		// Verify all sidebar links have correct hrefs
		await expect(nav.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard')
		await expect(nav.getByRole('link', { name: 'Agents' })).toHaveAttribute('href', '/dashboard/agents')
		await expect(nav.getByRole('link', { name: 'Tools' })).toHaveAttribute('href', '/dashboard/tools')
		await expect(nav.getByRole('link', { name: 'Usage' })).toHaveAttribute('href', '/dashboard/usage')
		await expect(nav.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/dashboard/settings')
	})
})

test.describe('Agent Sub-Routes', () => {
	test('new agent page loads correctly', async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/agents/new')
		await expect(page).toHaveURL('/dashboard/agents/new')
		// Should have the Create New Agent heading
		await expect(page.getByRole('heading', { name: 'Create New Agent' })).toBeVisible()
	})

	test('agent detail page loads correctly', async ({ page }: { page: Page }) => {
		// Test with a sample agent ID - may show "not found" but shouldn't 404
		await page.goto('/dashboard/agents/1')
		await expect(page).toHaveURL('/dashboard/agents/1')
		// Should not be a 404 page
		await expect(page.locator('body')).not.toContainText('404')
	})

	test('agent playground page loads correctly', async ({ page }: { page: Page }) => {
		// Test with a sample agent ID - may show "not found" but shouldn't 404
		await page.goto('/dashboard/agents/1/playground')
		await expect(page).toHaveURL('/dashboard/agents/1/playground')
		// Should not be a 404 page
		await expect(page.locator('body')).not.toContainText('404')
	})
})

test.describe('Public Routes', () => {
	test('landing page loads correctly', async ({ page }: { page: Page }) => {
		await page.goto('/')
		// Landing page should have content
		await expect(page.locator('body')).not.toContainText('404')
	})

	test('sign-in page loads correctly', async ({ page }: { page: Page }) => {
		await page.goto('/sign-in')
		await expect(page).toHaveURL('/sign-in')
		await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible()
	})

	test('sign-up page loads correctly', async ({ page }: { page: Page }) => {
		await page.goto('/sign-up')
		await expect(page).toHaveURL('/sign-up')
		await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible()
	})
})
