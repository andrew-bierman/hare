import { test as baseTest, expect } from '@playwright/test'
import { test } from './fixtures'

const VIEWPORTS = {
	mobile: { width: 375, height: 667 },
	tablet: { width: 768, height: 1024 },
} as const

// ============================================================================
// ROUTE PROTECTION
// ============================================================================

baseTest.describe('Audit Logs Route Protection', () => {
	baseTest('unauthenticated user is redirected from audit logs to sign-in', async ({ page }) => {
		await page.goto('/dashboard/settings/audit-logs')
		await page.waitForURL(/\/sign-in/, { timeout: 10000 })
		await expect(page).toHaveURL(/\/sign-in/)
	})
})

// ============================================================================
// AUTHENTICATED TESTS
// ============================================================================

test.describe('Audit Logs Page', () => {
	test('page loads with heading visible', async ({ authenticatedPage: page }) => {
		await page.goto('/dashboard/settings/audit-logs')
		await page.waitForSelector('main', { state: 'visible' })

		await expect(page.getByRole('heading', { name: 'Audit Logs' })).toBeVisible({
			timeout: 10000,
		})
	})

	test('shows filters card with action and resource type dropdowns', async ({
		authenticatedPage: page,
	}) => {
		await page.goto('/dashboard/settings/audit-logs')
		await page.waitForSelector('main', { state: 'visible' })

		// Filters section should be visible
		await expect(page.getByText('Filters').first()).toBeVisible({ timeout: 10000 })

		// Filter labels should be present
		await expect(page.getByLabel('Action Type')).toBeVisible()
		await expect(page.getByLabel('Resource Type')).toBeVisible()
	})

	test('shows workspace activity card with table or empty state', async ({
		authenticatedPage: page,
	}) => {
		await page.goto('/dashboard/settings/audit-logs')
		await page.waitForSelector('main', { state: 'visible' })

		// The Workspace Activity card should be visible
		await expect(page.getByText('Workspace Activity').first()).toBeVisible({ timeout: 10000 })

		// Should show either the audit log table or the empty state
		const emptyState = page.getByText('No audit logs found')
		const tableHeader = page.getByRole('columnheader', { name: 'Date' })

		const hasEmptyState = await emptyState.isVisible().catch(() => false)
		const hasTable = await tableHeader.isVisible().catch(() => false)

		// One of these must be true
		expect(hasEmptyState || hasTable).toBe(true)
	})

	test('empty state shows appropriate message for new workspace', async ({
		authenticatedPage: page,
	}) => {
		await page.goto('/dashboard/settings/audit-logs')
		await page.waitForSelector('main', { state: 'visible' })

		// A fresh test user workspace likely has no audit logs
		const emptyState = page.getByText('No audit logs found')
		if (await emptyState.isVisible().catch(() => false)) {
			await expect(page.getByText('Activity in your workspace will appear here.')).toBeVisible()
		}
	})
})

// ============================================================================
// RESPONSIVE DESIGN
// ============================================================================

test.describe('Audit Logs - Responsive', () => {
	for (const [device, viewport] of Object.entries(VIEWPORTS)) {
		test(`page renders correctly on ${device} (${viewport.width}x${viewport.height})`, async ({
			authenticatedPage: page,
		}) => {
			await page.setViewportSize(viewport)
			await page.goto('/dashboard/settings/audit-logs')
			await page.waitForSelector('main', { state: 'visible' })

			// Heading should still be visible
			await expect(page.getByRole('heading', { name: 'Audit Logs' })).toBeVisible({
				timeout: 10000,
			})

			// Filters card should be visible
			await expect(page.getByText('Filters').first()).toBeVisible()

			// Workspace Activity card should be visible
			await expect(page.getByText('Workspace Activity').first()).toBeVisible()
		})
	}
})
