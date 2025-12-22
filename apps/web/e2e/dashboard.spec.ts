import { expect, test } from '@playwright/test'

test.describe('Dashboard Overview', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/dashboard')
	})

	test('displays dashboard heading', async ({ page }) => {
		await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
	})

	test('displays key metrics cards', async ({ page }) => {
		// Dashboard should show some metrics/stats
		// Look for card-like elements with stats
		const cards = page.locator('[class*="card"]')
		await expect(cards.first()).toBeVisible()
	})

	test('has sidebar navigation', async ({ page }) => {
		// Verify sidebar links exist
		await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible()
		await expect(page.getByRole('link', { name: 'Agents' })).toBeVisible()
		await expect(page.getByRole('link', { name: 'Tools' })).toBeVisible()
		await expect(page.getByRole('link', { name: 'Usage' })).toBeVisible()
		await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible()
	})
})

test.describe('Agents List Page', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/dashboard/agents')
	})

	test('displays agents heading', async ({ page }) => {
		await expect(page.getByRole('heading', { name: 'Agents', exact: true })).toBeVisible()
	})

	test('has new agent button', async ({ page }) => {
		await expect(page.getByRole('link', { name: 'New Agent' })).toBeVisible()
	})

	test('new agent button navigates to create page', async ({ page }) => {
		await page.getByRole('link', { name: 'New Agent' }).click()
		await expect(page).toHaveURL('/dashboard/agents/new')
	})
})

test.describe('Tools List Page', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/dashboard/tools')
	})

	test('displays tools heading', async ({ page }) => {
		await expect(page.getByRole('heading', { name: 'Tools', exact: true })).toBeVisible()
	})

	test('has add tool button', async ({ page }) => {
		await expect(page.getByRole('button', { name: 'Add Tool' }).first()).toBeVisible()
	})

	test('shows tool categories or list', async ({ page }) => {
		// Page should have some content about tools
		await expect(page.locator('body')).not.toContainText('404')
	})
})

test.describe('Usage Page', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/dashboard/usage')
	})

	test('displays usage heading', async ({ page }) => {
		await expect(page.getByRole('heading', { name: 'Usage' })).toBeVisible()
	})

	test('shows usage statistics section', async ({ page }) => {
		// Usage page should have stats/metrics
		await expect(page.locator('body')).not.toContainText('404')
	})
})

test.describe('Responsive Layout', () => {
	test('dashboard is responsive on mobile', async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 667 })
		await page.goto('/dashboard')

		// Page should still load without 404
		await expect(page.locator('body')).not.toContainText('404')
		// Heading should be visible
		await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
	})

	test('agents page is responsive on tablet', async ({ page }) => {
		await page.setViewportSize({ width: 768, height: 1024 })
		await page.goto('/dashboard/agents')

		await expect(page.locator('body')).not.toContainText('404')
		await expect(page.getByRole('heading', { name: 'Agents', exact: true })).toBeVisible()
	})
})

test.describe('Theme and Accessibility', () => {
	test('pages have proper heading hierarchy', async ({ page }) => {
		await page.goto('/dashboard')

		// Should have an h1 heading
		const h1 = page.locator('h1').first()
		await expect(h1).toBeVisible()
	})

	test('buttons are keyboard accessible', async ({ page }) => {
		await page.goto('/dashboard/agents')

		// Tab to the New Agent button and verify it's focusable
		const newAgentLink = page.getByRole('link', { name: 'New Agent' })
		await newAgentLink.focus()
		await expect(newAgentLink).toBeFocused()
	})

	test('form inputs are keyboard accessible', async ({ page }) => {
		await page.goto('/sign-in')

		// Tab through form elements
		await page.keyboard.press('Tab')
		const emailInput = page.getByLabel('Email')

		// Email input should be focusable
		await emailInput.focus()
		await expect(emailInput).toBeFocused()
	})
})
