import { test as baseTest, expect, type Page } from '@playwright/test'
import { test } from './fixtures'

/**
 * Tools Page E2E tests.
 * Tests the tools listing, system tools, and tool management functionality.
 */

// Tools page requires authentication - test redirect
baseTest.describe('Tools Page - Auth Redirect', () => {
	baseTest('tools page redirects to sign-in for unauthenticated users', async ({
		page,
	}: { page: Page }) => {
		await page.goto('/dashboard/tools')
		await page.waitForLoadState('networkidle')
		// Should be redirected to sign-in
		await expect(page).toHaveURL(/\/sign-in/)
	})
})

test.describe('Tools Page - Authenticated', () => {
	test('shows system tools section', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/tools')
		await authenticatedPage.waitForLoadState('networkidle')
		await expect(authenticatedPage.getByRole('heading', { name: 'System Tools' })).toBeVisible()
	})

	test('can view all system tools', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/tools')
		await authenticatedPage.waitForLoadState('networkidle')

		// Should show system tools section
		await expect(authenticatedPage.getByRole('heading', { name: 'System Tools' })).toBeVisible()

		// Should have multiple tool cards
		const toolCards = authenticatedPage.locator('[class*="card"]')
		const count = await toolCards.count()
		expect(count).toBeGreaterThan(5)
	})

	test('shows KV storage tools', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/tools')
		await authenticatedPage.waitForLoadState('networkidle')
		// Should show KV tools
		await expect(authenticatedPage.getByText('KV Get')).toBeVisible()
		await expect(authenticatedPage.getByText('KV Put')).toBeVisible()
	})

	test('shows R2 storage tools', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/tools')
		await authenticatedPage.waitForLoadState('networkidle')
		// Should show R2 tools
		await expect(authenticatedPage.getByText('R2 Get')).toBeVisible()
		await expect(authenticatedPage.getByText('R2 Put')).toBeVisible()
	})

	test('has search functionality', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/tools')
		await authenticatedPage.waitForLoadState('networkidle')
		// Use specific placeholder for tools page search
		const searchInput = authenticatedPage.getByPlaceholder('Search tools...')
		await expect(searchInput).toBeVisible()
	})

	test('system tools have correct structure', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/tools')
		await authenticatedPage.waitForLoadState('networkidle')

		// First tool card should have name, description, and type
		const firstToolCard = authenticatedPage.locator('[class*="card"]').first()
		await expect(firstToolCard).toBeVisible()

		// Should show tool type badge
		const typeBadge = authenticatedPage.getByText('System', { exact: true }).first()
		await expect(typeBadge).toBeVisible()
	})

	test('can search for tools', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/tools')
		await authenticatedPage.waitForLoadState('networkidle')

		// Use specific placeholder for tools page search
		const searchInput = authenticatedPage.getByPlaceholder('Search tools...')
		await searchInput.fill('KV')
		await authenticatedPage.waitForTimeout(500)

		// Should filter to show KV tools
		await expect(authenticatedPage.getByText('KV Get')).toBeVisible()
	})
})

test.describe('Tools Page - Responsive', () => {
	test('displays correctly on mobile', async ({ authenticatedPage }) => {
		await authenticatedPage.setViewportSize({ width: 375, height: 667 })
		await authenticatedPage.goto('/dashboard/tools')
		await authenticatedPage.waitForLoadState('networkidle')

		await expect(
			authenticatedPage.getByRole('heading', { name: 'Tools', exact: true }),
		).toBeVisible()
	})

	test('displays correctly on tablet', async ({ authenticatedPage }) => {
		await authenticatedPage.setViewportSize({ width: 768, height: 1024 })
		await authenticatedPage.goto('/dashboard/tools')
		await authenticatedPage.waitForLoadState('networkidle')

		await expect(
			authenticatedPage.getByRole('heading', { name: 'Tools', exact: true }),
		).toBeVisible()
	})
})
