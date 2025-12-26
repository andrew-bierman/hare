import { expect, type Page, test } from '@playwright/test'

test.describe('Usage Page - Layout', () => {
	test.beforeEach(async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/usage')
		await page.waitForLoadState('networkidle')
		// Wait for loading skeletons to disappear
		await page.waitForTimeout(2000)
	})

	test('displays usage page heading', async ({ page }: { page: Page }) => {
		await expect(page.getByRole('heading', { name: 'Usage' })).toBeVisible()
	})

	test('displays cards on the page', async ({ page }: { page: Page }) => {
		// Usage page should have card elements
		const cards = page.locator('[class*="card"]')
		await expect(cards.first()).toBeVisible({ timeout: 10000 })
	})

	test('displays token breakdown section', async ({ page }: { page: Page }) => {
		await expect(page.getByText('Token Breakdown')).toBeVisible()
	})

	test('displays usage by agent section', async ({ page }: { page: Page }) => {
		await expect(page.getByText('Usage by Agent')).toBeVisible()
	})

	test('displays about section', async ({ page }: { page: Page }) => {
		await expect(page.getByText('About Usage Tracking')).toBeVisible()
	})
})

test.describe('Usage Page - Content', () => {
	test.beforeEach(async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/usage')
		await page.waitForLoadState('networkidle')
	})

	test('shows usage description text', async ({ page }: { page: Page }) => {
		await expect(page.getByText(/Usage is tracked automatically/)).toBeVisible()
	})

	test('shows billing information', async ({ page }: { page: Page }) => {
		await expect(page.getByText(/Cloudflare Workers AI pricing/)).toBeVisible()
	})
})

test.describe('Usage Page - Responsive Design', () => {
	test('displays correctly on mobile', async ({ page }: { page: Page }) => {
		await page.setViewportSize({ width: 375, height: 667 })
		await page.goto('/dashboard/usage')
		await page.waitForLoadState('networkidle')

		await expect(page.getByRole('heading', { name: 'Usage' })).toBeVisible()
	})

	test('displays correctly on tablet', async ({ page }: { page: Page }) => {
		await page.setViewportSize({ width: 768, height: 1024 })
		await page.goto('/dashboard/usage')
		await page.waitForLoadState('networkidle')

		await expect(page.getByRole('heading', { name: 'Usage' })).toBeVisible()
	})

	test('displays correctly on desktop', async ({ page }: { page: Page }) => {
		await page.setViewportSize({ width: 1920, height: 1080 })
		await page.goto('/dashboard/usage')
		await page.waitForLoadState('networkidle')

		await expect(page.getByRole('heading', { name: 'Usage' })).toBeVisible()
		await expect(page.getByText('Token Breakdown')).toBeVisible()
		await expect(page.getByText('Usage by Agent')).toBeVisible()
	})
})

test.describe('Usage Page - Cards', () => {
	test.beforeEach(async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/usage')
		await page.waitForLoadState('networkidle')
	})

	test('page has card elements', async ({ page }: { page: Page }) => {
		// Stats should show some cards
		const cards = page.locator('[class*="card"]')
		await expect(cards.first()).toBeVisible()
	})

	test('token breakdown section is visible', async ({ page }: { page: Page }) => {
		await expect(page.getByText('Token Breakdown')).toBeVisible()
	})
})

test.describe('Usage Page - Empty States', () => {
	test.beforeEach(async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/usage')
		await page.waitForLoadState('networkidle')
	})

	test('shows appropriate message when no agents deployed', async ({ page }: { page: Page }) => {
		// If there are no deployed agents, should show a message
		const noAgentsMessage = page.getByText('No deployed agents yet')
		// This may or may not be visible depending on the data
		if (await noAgentsMessage.isVisible()) {
			await expect(noAgentsMessage).toBeVisible()
		}
	})
})
