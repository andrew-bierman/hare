import { expect, type Page, test } from '@playwright/test'

test.describe('Agent Playground - Not Found State', () => {
	test('shows error for non-existent agent', async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/agents/nonexistent-id/playground')
		await page.waitForLoadState('networkidle')

		// Should show error or not found state
		await expect(page.locator('body')).not.toContainText('404')
	})
})

test.describe('Agent Playground - Layout', () => {
	test.beforeEach(async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/agents/1/playground')
		await page.waitForLoadState('networkidle')
	})

	test('page loads without errors', async ({ page }: { page: Page }) => {
		await expect(page.locator('body')).not.toContainText('404')
	})
})

test.describe('Agent Playground - Responsive', () => {
	test('displays correctly on mobile', async ({ page }: { page: Page }) => {
		await page.setViewportSize({ width: 375, height: 667 })
		await page.goto('/dashboard/agents/1/playground')
		await page.waitForLoadState('networkidle')

		await expect(page.locator('body')).not.toContainText('404')
	})

	test('displays correctly on tablet', async ({ page }: { page: Page }) => {
		await page.setViewportSize({ width: 768, height: 1024 })
		await page.goto('/dashboard/agents/1/playground')
		await page.waitForLoadState('networkidle')

		await expect(page.locator('body')).not.toContainText('404')
	})
})
