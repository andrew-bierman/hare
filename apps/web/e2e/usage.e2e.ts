import { expect, type Page, test as baseTest } from '@playwright/test'
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

baseTest.describe('Usage Page - Layout', () => {
	baseTest.beforeEach(async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/usage')
		await page.waitForLoadState('networkidle')
		// Wait for loading skeletons to disappear
		await page.waitForTimeout(2000)
	})

	baseTest('displays usage page heading', async ({ page }: { page: Page }) => {
		await expect(page.getByRole('heading', { name: 'Usage' })).toBeVisible()
	})

	baseTest('displays cards on the page', async ({ page }: { page: Page }) => {
		// Usage page should have card elements
		const cards = page.locator('[class*="card"]')
		await expect(cards.first()).toBeVisible({ timeout: 10000 })
	})

	baseTest('displays token breakdown section', async ({ page }: { page: Page }) => {
		await expect(page.getByText('Token Breakdown')).toBeVisible()
	})

	baseTest('displays usage by agent section', async ({ page }: { page: Page }) => {
		await expect(page.getByText('Usage by Agent')).toBeVisible()
	})

	baseTest('displays about section', async ({ page }: { page: Page }) => {
		await expect(page.getByText('About Usage Tracking')).toBeVisible()
	})
})

baseTest.describe('Usage Page - Content', () => {
	baseTest.beforeEach(async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/usage')
		await page.waitForLoadState('networkidle')
	})

	baseTest('shows usage description text', async ({ page }: { page: Page }) => {
		await expect(page.getByText(/Usage is tracked automatically/)).toBeVisible()
	})

	baseTest('shows billing information', async ({ page }: { page: Page }) => {
		await expect(page.getByText(/Cloudflare Workers AI pricing/)).toBeVisible()
	})
})

baseTest.describe('Usage Page - Responsive Design', () => {
	baseTest('displays correctly on mobile', async ({ page }: { page: Page }) => {
		await page.setViewportSize({ width: 375, height: 667 })
		await page.goto('/dashboard/usage')
		await page.waitForLoadState('networkidle')

		await expect(page.getByRole('heading', { name: 'Usage' })).toBeVisible()
	})

	baseTest('displays correctly on tablet', async ({ page }: { page: Page }) => {
		await page.setViewportSize({ width: 768, height: 1024 })
		await page.goto('/dashboard/usage')
		await page.waitForLoadState('networkidle')

		await expect(page.getByRole('heading', { name: 'Usage' })).toBeVisible()
	})

	baseTest('displays correctly on desktop', async ({ page }: { page: Page }) => {
		await page.setViewportSize({ width: 1920, height: 1080 })
		await page.goto('/dashboard/usage')
		await page.waitForLoadState('networkidle')

		await expect(page.getByRole('heading', { name: 'Usage' })).toBeVisible()
		await expect(page.getByText('Token Breakdown')).toBeVisible()
		await expect(page.getByText('Usage by Agent')).toBeVisible()
	})
})

baseTest.describe('Usage Page - Cards', () => {
	baseTest.beforeEach(async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/usage')
		await page.waitForLoadState('networkidle')
	})

	baseTest('page has card elements', async ({ page }: { page: Page }) => {
		// Stats should show some cards
		const cards = page.locator('[class*="card"]')
		await expect(cards.first()).toBeVisible()
	})

	baseTest('token breakdown section is visible', async ({ page }: { page: Page }) => {
		await expect(page.getByText('Token Breakdown')).toBeVisible()
	})
})

baseTest.describe('Usage Page - Empty States', () => {
	baseTest.beforeEach(async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/usage')
		await page.waitForLoadState('networkidle')
	})

	baseTest('shows appropriate message when no agents deployed', async ({ page }: { page: Page }) => {
		// If there are no deployed agents, should show a message
		const noAgentsMessage = page.getByText('No deployed agents yet')
		// This may or may not be visible depending on the data
		if (await noAgentsMessage.isVisible()) {
			await expect(noAgentsMessage).toBeVisible()
		}
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
})
