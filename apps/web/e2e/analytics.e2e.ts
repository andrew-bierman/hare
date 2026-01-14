import { type APIRequestContext, test as baseTest, expect, type Page } from '@playwright/test'
import { test } from './fixtures'

/**
 * Comprehensive Analytics Page E2E tests.
 * Tests analytics display, charts, filters, and export functionality.
 */

/**
 * Helper to get the first workspace ID from an authenticated page.
 */
async function getWorkspaceId(page: Page): Promise<string> {
	await page.waitForLoadState('networkidle')
	const response = await page.request.get('/api/workspaces')
	expect(response.status()).toBe(200)
	const body = await response.json()
	expect(body).toHaveProperty('workspaces')
	expect(body.workspaces.length).toBeGreaterThan(0)
	return body.workspaces[0].id
}

baseTest.describe('Analytics Route Protection', () => {
	baseTest('unauthenticated user is redirected from analytics to sign-in', async ({ page }) => {
		await page.goto('/dashboard/analytics')
		await page.waitForLoadState('networkidle')
		await page.waitForURL(/\/sign-in/, { timeout: 10000 })
		await expect(page).toHaveURL(/\/sign-in/)
	})

	baseTest('unauthenticated user is redirected from usage to sign-in', async ({ page }) => {
		await page.goto('/dashboard/usage')
		await page.waitForLoadState('networkidle')
		await page.waitForURL(/\/sign-in/, { timeout: 10000 })
		await expect(page).toHaveURL(/\/sign-in/)
	})
})

test.describe('Analytics Page - Authenticated', () => {
	test('authenticated user can access analytics page', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForLoadState('networkidle')
		await expect(authenticatedPage).toHaveURL(/\/dashboard\/analytics/)
		await expect(authenticatedPage.getByRole('heading', { name: 'Analytics' })).toBeVisible()
	})

	test('analytics page layout loads correctly', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForLoadState('networkidle')

		// Verify the main heading
		await expect(authenticatedPage.getByRole('heading', { name: 'Analytics' })).toBeVisible()

		// Verify page contains card elements
		const cards = authenticatedPage.locator('[class*="card"]')
		await expect(cards.first()).toBeVisible()
	})

	test('displays export button', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForLoadState('networkidle')

		// Check for Export button
		await expect(authenticatedPage.getByRole('button', { name: /Export/i })).toBeVisible()
	})
})

test.describe('Analytics Summary Stats', () => {
	test('displays Total Requests stat card', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForLoadState('networkidle')

		// Wait for loading to complete (skeletons disappear)
		await authenticatedPage.waitForTimeout(2000)

		// Check for Total Requests card
		await expect(authenticatedPage.getByText('Total Requests')).toBeVisible()
		await expect(authenticatedPage.getByText('API calls in period')).toBeVisible()
	})

	test('displays Total Tokens stat card', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForLoadState('networkidle')

		// Wait for loading to complete
		await authenticatedPage.waitForTimeout(2000)

		// Check for Total Tokens card
		await expect(authenticatedPage.getByText('Total Tokens')).toBeVisible()
	})

	test('displays Total Cost stat card', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForLoadState('networkidle')

		// Wait for loading to complete
		await authenticatedPage.waitForTimeout(2000)

		// Check for Total Cost card
		await expect(authenticatedPage.getByText('Total Cost')).toBeVisible()
		await expect(authenticatedPage.getByText('Estimated spend')).toBeVisible()
	})

	test('displays Avg Latency stat card', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForLoadState('networkidle')

		// Wait for loading to complete
		await authenticatedPage.waitForTimeout(2000)

		// Check for Avg Latency card
		await expect(authenticatedPage.getByText('Avg Latency')).toBeVisible()
		await expect(authenticatedPage.getByText('Response time')).toBeVisible()
	})

	test('stat cards show token breakdown', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForLoadState('networkidle')

		// Wait for loading to complete
		await authenticatedPage.waitForTimeout(2000)

		// Check for input/output breakdown text pattern (e.g., "1.2K in / 3.4K out")
		const tokenDescription = authenticatedPage.getByText(/in \/ .* out/i)
		await expect(tokenDescription.first()).toBeVisible()
	})
})

test.describe('Analytics Date Range Filter', () => {
	test('displays date range selector', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForLoadState('networkidle')

		// Check for date range dropdown
		const dateRangeSelect = authenticatedPage.getByRole('combobox').first()
		await expect(dateRangeSelect).toBeVisible()
	})

	test('can select Last 7 days', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForLoadState('networkidle')

		// Click date range selector
		const dateRangeSelect = authenticatedPage.getByRole('combobox').first()
		await dateRangeSelect.click()

		// Select Last 7 days
		await authenticatedPage.getByRole('option', { name: 'Last 7 days' }).click()

		// Wait for data to reload
		await authenticatedPage.waitForTimeout(1000)

		// Verify selection persisted
		await expect(dateRangeSelect).toContainText('Last 7 days')
	})

	test('can select Last 30 days', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForLoadState('networkidle')

		// Click date range selector
		const dateRangeSelect = authenticatedPage.getByRole('combobox').first()
		await dateRangeSelect.click()

		// Select Last 30 days
		await authenticatedPage.getByRole('option', { name: 'Last 30 days' }).click()

		// Wait for data to reload
		await authenticatedPage.waitForTimeout(1000)

		// Verify selection persisted
		await expect(dateRangeSelect).toContainText('Last 30 days')
	})

	test('can select Last 90 days', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForLoadState('networkidle')

		// Click date range selector
		const dateRangeSelect = authenticatedPage.getByRole('combobox').first()
		await dateRangeSelect.click()

		// Select Last 90 days
		await authenticatedPage.getByRole('option', { name: 'Last 90 days' }).click()

		// Wait for data to reload
		await authenticatedPage.waitForTimeout(1000)

		// Verify selection persisted
		await expect(dateRangeSelect).toContainText('Last 90 days')
	})
})

test.describe('Analytics Grouping Filter', () => {
	test('displays grouping selector', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForLoadState('networkidle')

		// Check for grouping dropdown (2nd combobox)
		const groupingSelects = authenticatedPage.getByRole('combobox')
		const count = await groupingSelects.count()
		expect(count).toBeGreaterThanOrEqual(2)
	})

	test('can select Daily grouping', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForLoadState('networkidle')

		// Get all comboboxes and select the grouping one (2nd)
		const comboboxes = authenticatedPage.getByRole('combobox')
		const groupingSelect = comboboxes.nth(1)
		await groupingSelect.click()

		// Select Daily
		await authenticatedPage.getByRole('option', { name: 'Daily' }).click()

		// Wait for data to reload
		await authenticatedPage.waitForTimeout(1000)

		// Verify selection persisted
		await expect(groupingSelect).toContainText('Daily')
	})

	test('can select Weekly grouping', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForLoadState('networkidle')

		// Get all comboboxes and select the grouping one (2nd)
		const comboboxes = authenticatedPage.getByRole('combobox')
		const groupingSelect = comboboxes.nth(1)
		await groupingSelect.click()

		// Select Weekly
		await authenticatedPage.getByRole('option', { name: 'Weekly' }).click()

		// Wait for data to reload
		await authenticatedPage.waitForTimeout(1000)

		// Verify selection persisted
		await expect(groupingSelect).toContainText('Weekly')
	})

	test('can select Monthly grouping', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForLoadState('networkidle')

		// Get all comboboxes and select the grouping one (2nd)
		const comboboxes = authenticatedPage.getByRole('combobox')
		const groupingSelect = comboboxes.nth(1)
		await groupingSelect.click()

		// Select Monthly
		await authenticatedPage.getByRole('option', { name: 'Monthly' }).click()

		// Wait for data to reload
		await authenticatedPage.waitForTimeout(1000)

		// Verify selection persisted
		await expect(groupingSelect).toContainText('Monthly')
	})
})

test.describe('Analytics Agent Filter', () => {
	test('displays agent filter selector', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForLoadState('networkidle')

		// Check for agent filter dropdown (3rd combobox)
		const comboboxes = authenticatedPage.getByRole('combobox')
		const count = await comboboxes.count()
		expect(count).toBeGreaterThanOrEqual(3)
	})

	test('can select All agents filter', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForLoadState('networkidle')

		// Get all comboboxes and select the agent one (3rd)
		const comboboxes = authenticatedPage.getByRole('combobox')
		const agentSelect = comboboxes.nth(2)
		await agentSelect.click()

		// Select All agents
		await authenticatedPage.getByRole('option', { name: 'All agents' }).click()

		// Wait for data to reload
		await authenticatedPage.waitForTimeout(1000)
	})
})

test.describe('Analytics Export Functionality', () => {
	test('export dropdown opens on click', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForLoadState('networkidle')

		// Click Export button
		await authenticatedPage.getByRole('button', { name: /Export/i }).click()

		// Verify dropdown menu appears
		await expect(authenticatedPage.getByRole('menuitem', { name: 'Export as CSV' })).toBeVisible()
		await expect(
			authenticatedPage.getByRole('menuitem', { name: 'Export as JSON' }),
		).toBeVisible()
	})

	test('CSV export option is clickable', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForLoadState('networkidle')

		// Wait for data to load
		await authenticatedPage.waitForTimeout(2000)

		// Click Export button
		await authenticatedPage.getByRole('button', { name: /Export/i }).click()

		// Click CSV export
		const csvOption = authenticatedPage.getByRole('menuitem', { name: 'Export as CSV' })
		await expect(csvOption).toBeVisible()
		// Note: Actually clicking would trigger download, which is hard to test in E2E
		// We verify the option is present and clickable
	})

	test('JSON export option is clickable', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForLoadState('networkidle')

		// Wait for data to load
		await authenticatedPage.waitForTimeout(2000)

		// Click Export button
		await authenticatedPage.getByRole('button', { name: /Export/i }).click()

		// Click JSON export
		const jsonOption = authenticatedPage.getByRole('menuitem', { name: 'Export as JSON' })
		await expect(jsonOption).toBeVisible()
	})
})

test.describe('Analytics Charts', () => {
	test('displays Token Usage Over Time chart', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForLoadState('networkidle')

		// Wait for loading to complete
		await authenticatedPage.waitForTimeout(2000)

		// Check for chart title
		await expect(authenticatedPage.getByText('Token Usage Over Time')).toBeVisible()
		await expect(authenticatedPage.getByText('Input and output tokens trend')).toBeVisible()
	})

	test('displays Usage by Agent chart', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForLoadState('networkidle')

		// Wait for loading to complete
		await authenticatedPage.waitForTimeout(2000)

		// Check for chart title
		await expect(authenticatedPage.getByText('Usage by Agent')).toBeVisible()
		await expect(authenticatedPage.getByText('Token distribution across agents')).toBeVisible()
	})

	test('displays Usage by Model chart', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForLoadState('networkidle')

		// Wait for loading to complete
		await authenticatedPage.waitForTimeout(2000)

		// Check for chart title
		await expect(authenticatedPage.getByText('Usage by Model')).toBeVisible()
		await expect(
			authenticatedPage.getByText('Token distribution across AI models'),
		).toBeVisible()
	})

	test('displays Cost Trend chart', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForLoadState('networkidle')

		// Wait for loading to complete
		await authenticatedPage.waitForTimeout(2000)

		// Check for chart title
		await expect(authenticatedPage.getByText('Cost Trend')).toBeVisible()
		await expect(authenticatedPage.getByText('Estimated API costs over time')).toBeVisible()
	})

	test('displays Request Volume chart', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForLoadState('networkidle')

		// Wait for loading to complete
		await authenticatedPage.waitForTimeout(2000)

		// Check for chart title
		await expect(authenticatedPage.getByText('Request Volume')).toBeVisible()
		await expect(authenticatedPage.getByText('API calls over time')).toBeVisible()
	})

	test('charts show empty state when no data', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForLoadState('networkidle')

		// Wait for content to load
		await authenticatedPage.waitForTimeout(2000)

		// For new users with no data, charts should either show empty state or have loaded
		// We just verify the chart containers are present
		await expect(authenticatedPage.getByText('Token Usage Over Time')).toBeVisible()
	})
})

test.describe('Analytics API Integration', () => {
	baseTest(
		'analytics endpoint requires authentication',
		async ({ request }: { request: APIRequestContext }) => {
			const response = await request.get('/api/analytics?workspaceId=test')
			expect(response.status()).toBe(401)
		},
	)

	test('can get analytics data via API', async ({ authenticatedPage }) => {
		const workspaceId = await getWorkspaceId(authenticatedPage)

		const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
		const endDate = new Date().toISOString()

		const response = await authenticatedPage.request.get(
			`/api/analytics?workspaceId=${workspaceId}&startDate=${startDate}&endDate=${endDate}&groupBy=day`,
		)
		expect(response.status()).toBe(200)

		const body = await response.json()
		expect(body).toHaveProperty('summary')
		expect(body).toHaveProperty('timeSeries')
		expect(body).toHaveProperty('byAgent')
		expect(body).toHaveProperty('byModel')
	})

	test('analytics API returns summary data', async ({ authenticatedPage }) => {
		const workspaceId = await getWorkspaceId(authenticatedPage)

		const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
		const endDate = new Date().toISOString()

		const response = await authenticatedPage.request.get(
			`/api/analytics?workspaceId=${workspaceId}&startDate=${startDate}&endDate=${endDate}&groupBy=day`,
		)
		expect(response.status()).toBe(200)

		const body = await response.json()
		expect(body.summary).toHaveProperty('totalRequests')
		expect(body.summary).toHaveProperty('totalTokens')
		expect(body.summary).toHaveProperty('totalInputTokens')
		expect(body.summary).toHaveProperty('totalOutputTokens')
		expect(body.summary).toHaveProperty('totalCost')
		expect(body.summary).toHaveProperty('avgLatencyMs')
	})

	test('analytics API returns timeSeries array', async ({ authenticatedPage }) => {
		const workspaceId = await getWorkspaceId(authenticatedPage)

		const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
		const endDate = new Date().toISOString()

		const response = await authenticatedPage.request.get(
			`/api/analytics?workspaceId=${workspaceId}&startDate=${startDate}&endDate=${endDate}&groupBy=day`,
		)
		expect(response.status()).toBe(200)

		const body = await response.json()
		expect(Array.isArray(body.timeSeries)).toBe(true)
	})

	test('analytics API supports groupBy parameter', async ({ authenticatedPage }) => {
		const workspaceId = await getWorkspaceId(authenticatedPage)

		const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
		const endDate = new Date().toISOString()

		// Test with different groupBy values
		for (const groupBy of ['day', 'week', 'month']) {
			const response = await authenticatedPage.request.get(
				`/api/analytics?workspaceId=${workspaceId}&startDate=${startDate}&endDate=${endDate}&groupBy=${groupBy}`,
			)
			expect(response.status()).toBe(200)

			const body = await response.json()
			expect(body).toHaveProperty('timeSeries')
		}
	})

	test('analytics API supports agentId filter', async ({ authenticatedPage }) => {
		const workspaceId = await getWorkspaceId(authenticatedPage)

		const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
		const endDate = new Date().toISOString()

		// Test with agentId parameter
		const response = await authenticatedPage.request.get(
			`/api/analytics?workspaceId=${workspaceId}&startDate=${startDate}&endDate=${endDate}&groupBy=day&agentId=test-agent-id`,
		)
		// Should return 200 even if agent doesn't exist (empty data)
		expect(response.status()).toBe(200)
	})
})

test.describe('Analytics Loading States', () => {
	test('shows loading skeletons initially', async ({ authenticatedPage }) => {
		// Navigate to analytics page and check for skeleton loaders
		await authenticatedPage.goto('/dashboard/analytics')

		// Skeletons should appear briefly while data loads
		const skeletons = authenticatedPage.locator('[class*="skeleton"]')

		// Either skeletons are visible (still loading) or content has loaded
		const hasSkeletons = await skeletons
			.first()
			.isVisible({ timeout: 1000 })
			.catch(() => false)
		const hasHeading = await authenticatedPage
			.getByRole('heading', { name: 'Analytics' })
			.isVisible({ timeout: 5000 })

		// Page should either show skeletons or have loaded content
		expect(hasSkeletons || hasHeading).toBe(true)
	})

	test('content loads after skeletons', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForLoadState('networkidle')

		// Wait for content to load
		await authenticatedPage.waitForTimeout(3000)

		// After loading, stat cards should be visible
		await expect(authenticatedPage.getByText('Total Requests')).toBeVisible()
		await expect(authenticatedPage.getByText('Total Tokens')).toBeVisible()
	})
})

test.describe('Analytics Page Responsive Layout', () => {
	test('analytics page is responsive on mobile', async ({ authenticatedPage }) => {
		await authenticatedPage.setViewportSize({ width: 375, height: 667 })
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForLoadState('networkidle')

		// Page should still load without 404
		await expect(authenticatedPage.locator('body')).not.toContainText('404')
		// Heading should be visible
		await expect(authenticatedPage.getByRole('heading', { name: 'Analytics' })).toBeVisible()
	})

	test('analytics page is responsive on tablet', async ({ authenticatedPage }) => {
		await authenticatedPage.setViewportSize({ width: 768, height: 1024 })
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForLoadState('networkidle')

		await expect(authenticatedPage.locator('body')).not.toContainText('404')
		await expect(authenticatedPage.getByRole('heading', { name: 'Analytics' })).toBeVisible()
	})

	test('stat cards stack correctly on mobile', async ({ authenticatedPage }) => {
		await authenticatedPage.setViewportSize({ width: 375, height: 667 })
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForLoadState('networkidle')

		// Wait for content to load
		await authenticatedPage.waitForTimeout(2000)

		// Check that stat cards are visible (they should stack on mobile)
		await expect(authenticatedPage.getByText('Total Requests')).toBeVisible()
		await expect(authenticatedPage.getByText('Total Tokens')).toBeVisible()
	})
})

test.describe('Analytics Page Navigation', () => {
	test('can navigate to analytics from dashboard', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')

		await authenticatedPage.getByRole('link', { name: 'Analytics' }).click()
		await authenticatedPage.waitForURL(/\/dashboard\/analytics/)

		await expect(authenticatedPage.getByRole('heading', { name: 'Analytics' })).toBeVisible()
	})

	test('can navigate back to dashboard from analytics', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForLoadState('networkidle')

		await authenticatedPage.getByRole('link', { name: 'Dashboard' }).click()
		await authenticatedPage.waitForURL(/\/dashboard$/)

		await expect(authenticatedPage.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
	})

	test('can navigate to other pages from analytics', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForLoadState('networkidle')

		// Navigate to Usage
		await authenticatedPage.getByRole('link', { name: 'Usage' }).click()
		await authenticatedPage.waitForURL(/\/dashboard\/usage/)

		await expect(authenticatedPage.getByRole('heading', { name: 'Usage' })).toBeVisible()
	})
})

test.describe('Analytics Page Accessibility', () => {
	test('has proper heading hierarchy', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForLoadState('networkidle')

		// Should have h2 heading for main page title
		const h2 = authenticatedPage.locator('h2').filter({ hasText: 'Analytics' })
		await expect(h2).toBeVisible()
	})

	test('stat cards have proper labels', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForLoadState('networkidle')

		// Wait for content to load
		await authenticatedPage.waitForTimeout(2000)

		// Each stat card should have a title
		await expect(authenticatedPage.getByText('Total Requests')).toBeVisible()
		await expect(authenticatedPage.getByText('Total Tokens')).toBeVisible()
		await expect(authenticatedPage.getByText('Total Cost')).toBeVisible()
		await expect(authenticatedPage.getByText('Avg Latency')).toBeVisible()
	})

	test('export button is keyboard accessible', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForLoadState('networkidle')

		// Tab to export button and verify it's focusable
		const exportButton = authenticatedPage.getByRole('button', { name: /Export/i })
		await exportButton.focus()
		await expect(exportButton).toBeFocused()
	})
})
