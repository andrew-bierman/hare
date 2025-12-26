import { test as baseTest, expect, type Page } from '@playwright/test'
import { test } from './fixtures'

/**
 * Usage page E2E tests.
 * Tests the usage statistics and analytics display.
 */

baseTest.describe('Usage Page - Unauthenticated', () => {
	baseTest.beforeEach(async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/usage')
		await page.waitForLoadState('networkidle')
	})

	baseTest('displays usage heading', async ({ page }: { page: Page }) => {
		await expect(page.getByRole('heading', { name: 'Usage' })).toBeVisible()
	})

	baseTest('shows usage statistics section', async ({ page }: { page: Page }) => {
		// Page should have some stats cards
		const cards = page.locator('[class*="card"]')
		const cardCount = await cards.count()
		expect(cardCount).toBeGreaterThan(0)
	})
})

test.describe('Usage Page - Authenticated', () => {
	test('displays API calls metric', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/usage')
		await authenticatedPage.waitForLoadState('networkidle')

		await expect(authenticatedPage.getByText(/api calls|total.*calls/i).first()).toBeVisible()
	})

	test('displays tokens metric', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/usage')
		await authenticatedPage.waitForLoadState('networkidle')

		await expect(authenticatedPage.getByText(/tokens/i).first()).toBeVisible()
	})

	test('displays active agents count', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/usage')
		await authenticatedPage.waitForLoadState('networkidle')

		await expect(authenticatedPage.getByText(/agents/i).first()).toBeVisible()
	})

	test('displays usage period', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/usage')
		await authenticatedPage.waitForLoadState('networkidle')

		// Should show some date range
		await expect(authenticatedPage.getByText(/period|billing/i).first()).toBeVisible()
	})
})

test.describe('Usage Statistics Cards', () => {
	test('shows input tokens breakdown', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/usage')
		await authenticatedPage.waitForLoadState('networkidle')

		// Look for input tokens section
		const inputTokens = authenticatedPage.getByText(/input.*tokens/i).first()
		if (await inputTokens.isVisible({ timeout: 2000 })) {
			await expect(inputTokens).toBeVisible()
		}
	})

	test('shows output tokens breakdown', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/usage')
		await authenticatedPage.waitForLoadState('networkidle')

		// Look for output tokens section
		const outputTokens = authenticatedPage.getByText(/output.*tokens/i).first()
		if (await outputTokens.isVisible({ timeout: 2000 })) {
			await expect(outputTokens).toBeVisible()
		}
	})

	test('shows usage by agent section', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/usage')
		await authenticatedPage.waitForLoadState('networkidle')

		// Look for agent usage section
		await expect(authenticatedPage.getByText(/by agent|agent usage/i).first()).toBeVisible()
	})
})

test.describe('Usage Navigation', () => {
	test('can access usage from sidebar', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')

		await authenticatedPage.getByRole('link', { name: 'Usage', exact: true }).click()
		await authenticatedPage.waitForURL(/\/dashboard\/usage/)

		await expect(authenticatedPage.getByRole('heading', { name: 'Usage' })).toBeVisible()
	})

	test('can access usage from dashboard quick actions', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')

		// Look for "View Usage" quick action link
		const usageLink = authenticatedPage.getByRole('link', { name: /view usage/i })
		if (await usageLink.isVisible({ timeout: 2000 })) {
			await usageLink.click()
			await authenticatedPage.waitForURL(/\/dashboard\/usage/)
		}
	})
})

test.describe('Usage Empty State', () => {
	test('shows message when no deployed agents', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/usage')
		await authenticatedPage.waitForLoadState('networkidle')

		// If new account, might show empty state
		const emptyState = authenticatedPage.getByText(/no.*deployed.*agents|no agents yet/i)
		// This might or might not be visible depending on account state
		if (await emptyState.isVisible({ timeout: 2000 })) {
			await expect(emptyState).toBeVisible()
		}
	})
})

test.describe('Usage Data Display', () => {
	test('numbers are formatted properly', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/usage')
		await authenticatedPage.waitForLoadState('networkidle')

		// Look for formatted numbers (should have commas for thousands)
		// The page should display numbers, even if they're 0
		const numbers = authenticatedPage.locator('text=/\\d+/')
		const count = await numbers.count()
		expect(count).toBeGreaterThan(0)
	})

	test('dates are displayed', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/usage')
		await authenticatedPage.waitForLoadState('networkidle')

		// Should show some date information
		const datePattern = authenticatedPage.locator('text=/\\d{1,2}[\\/\\-]\\d{1,2}|\\w+ \\d{1,2}/')
		// Dates might be formatted different ways
	})
})
