import { expect, type Page, test } from '@playwright/test'

test.describe('Sidebar Navigation - All routes should load without 404', () => {
	test('dashboard page loads correctly', async ({ page }: { page: Page }) => {
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')
		await expect(page).toHaveURL('/dashboard')
		// Verify the page title is visible
		await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
		// Verify page has meaningful content (not a 404 page)
		await expect(page.locator('body')).not.toContainText('404')
	})

	test('agents page loads correctly', async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/agents')
		await page.waitForLoadState('networkidle')
		await expect(page).toHaveURL('/dashboard/agents')
		// Verify the page title is visible (use exact: true to avoid matching other headings)
		await expect(page.getByRole('heading', { name: 'Agents', exact: true })).toBeVisible()
		// Verify the New Agent button exists
		await expect(page.getByRole('link', { name: 'New Agent' })).toBeVisible()
	})

	test('tools page loads correctly', async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/tools')
		await page.waitForLoadState('networkidle')
		await expect(page).toHaveURL('/dashboard/tools')
		// Verify the page title is visible (use exact: true to avoid matching other headings)
		await expect(page.getByRole('heading', { name: 'Tools', exact: true })).toBeVisible()
		// Verify the Add Tool button exists (use first() since there may be multiple)
		await expect(page.getByRole('button', { name: 'Add Tool' }).first()).toBeVisible()
	})

	test('usage page loads correctly', async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/usage')
		await page.waitForLoadState('networkidle')
		await expect(page).toHaveURL('/dashboard/usage')
		// Verify the page title is visible
		await expect(page.getByRole('heading', { name: 'Usage' })).toBeVisible()
		// Verify meaningful content exists
		await expect(page.locator('body')).not.toContainText('404')
	})

	test('settings page loads correctly', async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/settings')
		await page.waitForLoadState('networkidle')
		await expect(page).toHaveURL('/dashboard/settings')
		// Verify the page title is visible
		await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
		// Verify meaningful content exists (use first() to handle multiple matches)
		await expect(page.getByText('Profile', { exact: true }).first()).toBeVisible()
		})
})

test.describe('Sidebar Navigation Links', () => {
	test('clicking sidebar links navigates to correct pages', async ({ page }: { page: Page }) => {
		// Start at dashboard
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')
		await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

		// Click Agents link
		await page.getByRole('link', { name: 'Agents' }).click()
		await page.waitForLoadState('networkidle')
		await expect(page).toHaveURL('/dashboard/agents')
		await expect(page.getByRole('heading', { name: 'Agents', exact: true })).toBeVisible()

		// Click Tools link
		await page.getByRole('link', { name: 'Tools' }).click()
		await page.waitForLoadState('networkidle')
		await expect(page).toHaveURL('/dashboard/tools')
		await expect(page.getByRole('heading', { name: 'Tools', exact: true })).toBeVisible()

		// Click Usage link
		await page.getByRole('link', { name: 'Usage' }).click()
		await page.waitForLoadState('networkidle')
		await expect(page).toHaveURL('/dashboard/usage')
		await expect(page.getByRole('heading', { name: 'Usage' })).toBeVisible()

		// Click Settings link
		await page.getByRole('link', { name: 'Settings' }).click()
		await page.waitForLoadState('networkidle')
		await expect(page).toHaveURL('/dashboard/settings')
		await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()

		// Click Dashboard link to return
		await page.getByRole('link', { name: 'Dashboard' }).click()
		await page.waitForLoadState('networkidle')
		await expect(page).toHaveURL('/dashboard')
		await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
	})
})

test.describe('Agent Sub-Routes', () => {
	test('new agent page loads correctly', async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/agents/new')
		await page.waitForLoadState('networkidle')
		await expect(page).toHaveURL('/dashboard/agents/new')
		// Should have the Create New Agent heading
		await expect(page.getByRole('heading', { name: 'Create New Agent' })).toBeVisible()
	})

	test('agent detail page loads correctly', async ({ page }: { page: Page }) => {
		// Test with a sample agent ID - may show "not found" but shouldn't 404
		await page.goto('/dashboard/agents/1')
		await page.waitForLoadState('networkidle')
		await expect(page).toHaveURL('/dashboard/agents/1')
		// Should not be a 404 page
		await expect(page.locator('body')).not.toContainText('404')
	})

	test('agent playground page loads correctly', async ({ page }: { page: Page }) => {
		// Test with a sample agent ID - may show "not found" but shouldn't 404
		await page.goto('/dashboard/agents/1/playground')
		await page.waitForLoadState('networkidle')
		await expect(page).toHaveURL('/dashboard/agents/1/playground')
		// Should not be a 404 page
		await expect(page.locator('body')).not.toContainText('404')
	})
})

test.describe('Public Routes', () => {
	test('landing page loads correctly', async ({ page }: { page: Page }) => {
		await page.goto('/')
		await page.waitForLoadState('networkidle')
		// Landing page should have content
		await expect(page.locator('body')).not.toContainText('404')
	})

	test('sign-in page loads correctly', async ({ page }: { page: Page }) => {
		await page.goto('/sign-in')
		await page.waitForLoadState('networkidle')
		await expect(page).toHaveURL('/sign-in')
		await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible()
	})

	test('sign-up page loads correctly', async ({ page }: { page: Page }) => {
		await page.goto('/sign-up')
		await page.waitForLoadState('networkidle')
		await expect(page).toHaveURL('/sign-up')
		await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible()
	})

	test('navigation between public pages works', async ({ page }: { page: Page }) => {
		// Start at landing page
		await page.goto('/')
		await page.waitForLoadState('networkidle')

		// Navigate to sign in
		const signInLink = page.getByRole('link', { name: /sign in/i }).first()
		if (await signInLink.isVisible({ timeout: 2000 })) {
			await signInLink.click()
			await page.waitForLoadState('networkidle')
			await expect(page).toHaveURL('/sign-in')
		}
	})
})
