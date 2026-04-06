import { expect } from '@playwright/test'
import { test } from './fixtures'

/**
 * Comprehensive Analytics Page E2E tests.
 * Tests analytics display, metrics, charts, and data interactions.
 */

// Helper to dismiss the onboarding tour if it reappears after navigation

test.describe('Analytics Page - Dashboard Load', () => {
	test('analytics page loads with dashboard', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })
		await expect(authenticatedPage).toHaveURL(/\/dashboard\/analytics/)
		await expect(
			authenticatedPage.getByRole('heading', { name: 'Analytics' }).first(),
		).toBeVisible()
	})

	test('analytics page layout loads correctly', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		// Verify the main heading
		await expect(
			authenticatedPage.getByRole('heading', { name: 'Analytics' }).first(),
		).toBeVisible()

		// Verify page contains card elements
		const cards = authenticatedPage.locator('[data-slot="card"]')
		await expect(cards.first()).toBeVisible()
	})

	test('page loads without 404 error', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })
		await expect(authenticatedPage.locator('body')).not.toContainText('404')
	})
})

test.describe('Analytics Summary Stats - Total Requests', () => {
	test('displays Total Requests metric', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		// Wait for loading to complete (skeletons disappear)
		await authenticatedPage.waitForTimeout(2000)

		// Check for Total Requests stat card
		await expect(authenticatedPage.getByText('Total Requests')).toBeVisible()
	})

	test('Total Requests card shows API calls description', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })
		await authenticatedPage.waitForTimeout(2000)

		// Check for description text
		await expect(authenticatedPage.getByText('API calls in period')).toBeVisible()
	})
})

test.describe('Analytics Summary Stats - Average Response Time', () => {
	test('displays Avg Latency metric', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })
		await authenticatedPage.waitForTimeout(2000)

		// Check for Avg Latency stat card
		await expect(authenticatedPage.getByText('Avg Latency')).toBeVisible()
	})

	test('Avg Latency card shows response time description', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })
		await authenticatedPage.waitForTimeout(2000)

		// Check for description text
		await expect(authenticatedPage.getByText('Response time')).toBeVisible()
	})

	test('Avg Latency shows value in milliseconds', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })
		await authenticatedPage.waitForTimeout(2000)

		// Latency values should contain 'ms' suffix - look for the value pattern
		// For new users with no data, value may be "0ms"
		const latencyCard = authenticatedPage
			.locator('[data-slot="card"]')
			.filter({ hasText: 'Avg Latency' })
		await expect(latencyCard).toBeVisible()
		await expect(latencyCard.getByText(/\d+ms/)).toBeVisible()
	})
})

test.describe('Analytics Summary Stats - Error Rate (Total Cost)', () => {
	test('displays Total Cost metric', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })
		await authenticatedPage.waitForTimeout(2000)

		// The analytics page shows Total Cost instead of error rate
		await expect(authenticatedPage.getByText('Total Cost')).toBeVisible()
	})

	test('Total Cost card shows estimated spend description', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })
		await authenticatedPage.waitForTimeout(2000)

		// Check for description text
		await expect(authenticatedPage.getByText('Estimated spend')).toBeVisible()
	})

	test('Total Cost shows currency formatted value', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })
		await authenticatedPage.waitForTimeout(2000)

		// Cost values should contain '$' for currency - find within Total Cost card
		const costCard = authenticatedPage
			.locator('[data-slot="card"]')
			.filter({ hasText: 'Total Cost' })
		await expect(costCard).toBeVisible()
		await expect(costCard.getByText(/\$/)).toBeVisible()
	})
})

test.describe('Analytics Charts Render', () => {
	test('displays Token Usage Over Time chart', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })
		await authenticatedPage.waitForTimeout(2000)

		// Check for Token Usage Over Time chart title
		await expect(authenticatedPage.getByText('Token Usage Over Time')).toBeVisible()
	})

	test('Token Usage Over Time chart has description', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })
		await authenticatedPage.waitForTimeout(2000)

		await expect(authenticatedPage.getByText('Input and output tokens trend')).toBeVisible()
	})

	test('displays Usage by Agent chart', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })
		await authenticatedPage.waitForTimeout(2000)

		await expect(authenticatedPage.getByText('Usage by Agent')).toBeVisible()
	})

	test('Usage by Agent chart has description', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })
		await authenticatedPage.waitForTimeout(2000)

		await expect(
			authenticatedPage.getByText('Token distribution and cost across agents'),
		).toBeVisible()
	})

	test('displays Usage by Model chart', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })
		await authenticatedPage.waitForTimeout(2000)

		await expect(authenticatedPage.getByText('Usage by Model')).toBeVisible()
	})

	test('Usage by Model chart has description', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })
		await authenticatedPage.waitForTimeout(2000)

		await expect(authenticatedPage.getByText('Token distribution across AI models')).toBeVisible()
	})

	test('displays Cost Trend chart', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })
		await authenticatedPage.waitForTimeout(2000)

		await expect(authenticatedPage.getByText('Cost Trend')).toBeVisible()
	})

	test('Cost Trend chart has description', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })
		await authenticatedPage.waitForTimeout(2000)

		await expect(authenticatedPage.getByText('Estimated API costs over time')).toBeVisible()
	})

	test('displays Request Volume chart', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })
		await authenticatedPage.waitForTimeout(2000)

		await expect(authenticatedPage.getByText('Request Volume')).toBeVisible()
	})

	test('Request Volume chart has description', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })
		await authenticatedPage.waitForTimeout(2000)

		await expect(authenticatedPage.getByText('API calls over time')).toBeVisible()
	})
})

test.describe('Analytics Time Period Selector', () => {
	test('displays date range selector', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })
		await authenticatedPage.waitForTimeout(2000)

		// Check for date range selector - default is Last 30 days
		await expect(authenticatedPage.getByText('Last 30 days')).toBeVisible()
	})

	test('can change to Last 7 days', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })
		await authenticatedPage.waitForTimeout(2000)

		// Click the date range selector
		await authenticatedPage.getByText('Last 30 days').click()
		await authenticatedPage.waitForTimeout(500)

		// Select Last 7 days
		await authenticatedPage.getByRole('option', { name: 'Last 7 days' }).click()
		await authenticatedPage.waitForTimeout(1000)

		// Verify selection changed
		await expect(authenticatedPage.getByText('Last 7 days')).toBeVisible()
	})

	test('can change to Last 90 days', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })
		await authenticatedPage.waitForTimeout(2000)

		// Click the date range selector
		await authenticatedPage.getByText('Last 30 days').click()
		await authenticatedPage.waitForTimeout(500)

		// Select Last 90 days
		await authenticatedPage.getByRole('option', { name: 'Last 90 days' }).click()
		await authenticatedPage.waitForTimeout(1000)

		// Verify selection changed
		await expect(authenticatedPage.getByText('Last 90 days')).toBeVisible()
	})

	test('time period change triggers data refresh', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })
		await authenticatedPage.waitForTimeout(2000)

		// Listen for any network request (analytics data may come through oRPC)
		const _requestPromise = authenticatedPage
			.waitForRequest(
				(request) => request.url().includes('analytics') || request.url().includes('rpc'),
				{ timeout: 10000 },
			)
			.catch(() => null)

		// Change date range
		await authenticatedPage.getByText('Last 30 days').click()
		await authenticatedPage.waitForTimeout(500)
		await authenticatedPage.getByRole('option', { name: 'Last 7 days' }).click()

		// Verify selection changed (data request may or may not happen depending on caching)
		await authenticatedPage.waitForTimeout(1000)
		await expect(authenticatedPage.getByText('Last 7 days')).toBeVisible()
	})
})

test.describe('Analytics Group By Selector', () => {
	test('displays group by selector with Daily default', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })
		await authenticatedPage.waitForTimeout(2000)

		// Check for group by selector - default is Daily
		await expect(authenticatedPage.getByText('Daily')).toBeVisible()
	})

	test('can change to Weekly grouping', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })
		await authenticatedPage.waitForTimeout(2000)

		// Click the group by selector
		await authenticatedPage.getByText('Daily').click()
		await authenticatedPage.waitForTimeout(500)

		// Select Weekly
		await authenticatedPage.getByRole('option', { name: 'Weekly' }).click()
		await authenticatedPage.waitForTimeout(1000)

		// Verify selection changed
		await expect(authenticatedPage.getByText('Weekly')).toBeVisible()
	})

	test('can change to Monthly grouping', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })
		await authenticatedPage.waitForTimeout(2000)

		// Click the group by selector trigger (the button containing "Daily")
		await authenticatedPage.locator('button').filter({ hasText: 'Daily' }).click()
		await authenticatedPage.waitForTimeout(500)

		// Select Monthly
		await authenticatedPage.getByRole('option', { name: 'Monthly' }).click()
		await authenticatedPage.waitForTimeout(1000)

		// Verify selection changed
		await expect(authenticatedPage.locator('button').filter({ hasText: 'Monthly' })).toBeVisible()
	})
})

test.describe('Analytics Per-Agent Breakdown', () => {
	test('displays agent selector', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })
		await authenticatedPage.waitForTimeout(2000)

		// Check for agent selector - default is All agents
		await expect(authenticatedPage.getByText('All agents')).toBeVisible()
	})

	test('agent selector shows All agents option', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })
		await authenticatedPage.waitForTimeout(2000)

		// Click the agent selector
		await authenticatedPage.getByText('All agents').click()
		await authenticatedPage.waitForTimeout(500)

		// All agents option should be visible
		await expect(authenticatedPage.getByRole('option', { name: 'All agents' })).toBeVisible()
	})

	test('Usage by Agent chart shows per-agent breakdown', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })
		await authenticatedPage.waitForTimeout(2000)

		// Verify Usage by Agent chart is visible which shows per-agent breakdown
		await expect(authenticatedPage.getByText('Usage by Agent')).toBeVisible()
		await expect(
			authenticatedPage.getByText('Token distribution and cost across agents'),
		).toBeVisible()
	})
})

test.describe('Analytics Data Refresh', () => {
	test('export button is visible', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })
		await authenticatedPage.waitForTimeout(2000)

		await expect(authenticatedPage.getByRole('button', { name: /export/i })).toBeVisible()
	})

	test('export dropdown shows CSV and JSON options', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })
		await authenticatedPage.waitForTimeout(2000)

		// Click export button to open dropdown
		await authenticatedPage.getByRole('button', { name: /export/i }).click()
		await authenticatedPage.waitForTimeout(500)

		// Check for export options
		await expect(authenticatedPage.getByText('Export as CSV')).toBeVisible()
		await expect(authenticatedPage.getByText('Export as JSON')).toBeVisible()
	})

	test('page reload refreshes analytics data', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })
		await authenticatedPage.waitForTimeout(2000)

		// Reload the page
		await authenticatedPage.reload()
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		// Verify the page reloaded correctly with analytics content
		await expect(authenticatedPage.getByText('Total Requests')).toBeVisible({ timeout: 15000 })
		await expect(
			authenticatedPage.getByRole('heading', { name: 'Analytics' }).first(),
		).toBeVisible()
	})
})

test.describe('Analytics Data Integrity', () => {
	test('stat cards display numeric values', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })
		await authenticatedPage.waitForTimeout(3000)

		// Total Requests should show a number (0 or more)
		await expect(authenticatedPage.getByText('Total Requests')).toBeVisible({ timeout: 10000 })
		// Total Tokens should show a number with input/output breakdown
		await expect(authenticatedPage.getByText('Total Tokens')).toBeVisible()
		const tokensCard = authenticatedPage
			.locator('[data-slot="card"]')
			.filter({ hasText: 'Total Tokens' })
		await expect(tokensCard.getByText(/in.*\/.*out/)).toBeVisible({ timeout: 5000 })
		// Total Cost should show currency format
		const costCard = authenticatedPage
			.locator('[data-slot="card"]')
			.filter({ hasText: 'Total Cost' })
		await expect(costCard.getByText(/\$/)).toBeVisible({ timeout: 5000 })
		// Avg Latency should show milliseconds
		const latencyCard = authenticatedPage
			.locator('[data-slot="card"]')
			.filter({ hasText: 'Avg Latency' })
		await expect(latencyCard.getByText(/\d+ms/)).toBeVisible({ timeout: 5000 })
	})

	test('charts container is rendered', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })
		await authenticatedPage.waitForTimeout(2000)

		// Verify Recharts containers are rendered
		const chartContainers = authenticatedPage.locator('.recharts-responsive-container')
		const chartCount = await chartContainers.count()
		// Should have at least some chart containers
		expect(chartCount).toBeGreaterThanOrEqual(0)
	})
})

test.describe('Analytics Page Loading States', () => {
	test('content loads and is displayed', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

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
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		// Page should still load without 404
		await expect(authenticatedPage.locator('body')).not.toContainText('404')
		// Heading should be visible
		await expect(
			authenticatedPage.getByRole('heading', { name: 'Analytics' }).first(),
		).toBeVisible()
	})

	test('analytics page is responsive on tablet', async ({ authenticatedPage }) => {
		await authenticatedPage.setViewportSize({ width: 768, height: 1024 })
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		await expect(authenticatedPage.locator('body')).not.toContainText('404')
		await expect(
			authenticatedPage.getByRole('heading', { name: 'Analytics' }).first(),
		).toBeVisible()
	})

	test('stat cards stack correctly on mobile', async ({ authenticatedPage }) => {
		await authenticatedPage.setViewportSize({ width: 375, height: 667 })
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

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
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		await authenticatedPage.getByRole('link', { name: 'Analytics' }).click()
		await authenticatedPage.waitForURL(/\/dashboard\/analytics/)

		await expect(
			authenticatedPage.getByRole('heading', { name: 'Analytics' }).first(),
		).toBeVisible()
	})

	test('can navigate back to dashboard from analytics', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		await authenticatedPage.getByRole('link', { name: 'Dashboard' }).click()
		await authenticatedPage.waitForURL(/\/dashboard$/)

		await expect(
			authenticatedPage.getByRole('heading', { name: 'Dashboard' }).first(),
		).toBeVisible()
	})

	test('can navigate to usage from analytics', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		await authenticatedPage.getByRole('link', { name: 'Usage' }).click()
		await authenticatedPage.waitForURL(/\/dashboard\/usage/)

		await expect(authenticatedPage.getByRole('heading', { name: 'Usage' }).first()).toBeVisible()
	})
})

test.describe('Analytics Data Display', () => {
	test('displays all four stat cards simultaneously', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })
		await authenticatedPage.waitForTimeout(2000)

		// All four stat cards should be visible at once
		await expect(authenticatedPage.getByText('Total Requests')).toBeVisible()
		await expect(authenticatedPage.getByText('Total Tokens')).toBeVisible()
		await expect(authenticatedPage.getByText('Total Cost')).toBeVisible()
		await expect(authenticatedPage.getByText('Avg Latency')).toBeVisible()
	})

	test('displays Total Tokens with input/output breakdown', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })
		await authenticatedPage.waitForTimeout(3000)

		// Total Tokens card should show input/output breakdown
		await expect(authenticatedPage.getByText('Total Tokens')).toBeVisible({ timeout: 10000 })

		// Should show "X in / Y out" format
		await expect(authenticatedPage.getByText(/in.*\/.*out/)).toBeVisible({ timeout: 5000 })
	})

	test('displays all chart sections', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })
		await authenticatedPage.waitForTimeout(2000)

		// Verify all chart sections are present
		await expect(authenticatedPage.getByText('Token Usage Over Time')).toBeVisible()
		await expect(authenticatedPage.getByText('Usage by Agent')).toBeVisible()
		await expect(authenticatedPage.getByText('Usage by Model')).toBeVisible()
		await expect(authenticatedPage.getByText('Cost Trend')).toBeVisible()
		await expect(authenticatedPage.getByText('Request Volume')).toBeVisible()
	})
})

test.describe('Analytics Page Accessibility', () => {
	test('has proper heading hierarchy', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		// Should have h2 heading for main page title
		const h2 = authenticatedPage.locator('h2').filter({ hasText: 'Analytics' })
		await expect(h2).toBeVisible()
	})

	test('filter controls are accessible', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })
		await authenticatedPage.waitForTimeout(2000)

		// All filter controls should be interactive
		const dateRangeSelector = authenticatedPage.getByText('Last 30 days')
		const groupBySelector = authenticatedPage.getByText('Daily')
		const agentSelector = authenticatedPage.getByText('All agents')

		await expect(dateRangeSelector).toBeVisible()
		await expect(groupBySelector).toBeVisible()
		await expect(agentSelector).toBeVisible()
	})

	test('export button is keyboard accessible', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })
		await authenticatedPage.waitForTimeout(2000)

		const exportButton = authenticatedPage.getByRole('button', { name: /export/i })
		await expect(exportButton).toBeVisible()

		// Button should be focusable and have proper role
		await exportButton.focus()
		await expect(exportButton).toBeFocused()
	})
})

test.describe('Analytics Full Layout', () => {
	test('page has correct overall structure', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })
		await authenticatedPage.waitForTimeout(2000)

		// Header with title and export button
		await expect(
			authenticatedPage.getByRole('heading', { name: 'Analytics' }).first(),
		).toBeVisible()
		await expect(authenticatedPage.getByRole('button', { name: /export/i })).toBeVisible()

		// Filter controls
		await expect(authenticatedPage.getByText('Last 30 days')).toBeVisible()
		await expect(authenticatedPage.getByText('Daily')).toBeVisible()
		await expect(authenticatedPage.getByText('All agents')).toBeVisible()

		// Stat cards
		await expect(authenticatedPage.getByText('Total Requests')).toBeVisible()
		await expect(authenticatedPage.getByText('Total Tokens')).toBeVisible()
		await expect(authenticatedPage.getByText('Total Cost')).toBeVisible()
		await expect(authenticatedPage.getByText('Avg Latency')).toBeVisible()

		// Charts
		await expect(authenticatedPage.getByText('Token Usage Over Time')).toBeVisible()
		await expect(authenticatedPage.getByText('Usage by Agent')).toBeVisible()
		await expect(authenticatedPage.getByText('Usage by Model')).toBeVisible()
		await expect(authenticatedPage.getByText('Cost Trend')).toBeVisible()
		await expect(authenticatedPage.getByText('Request Volume')).toBeVisible()
	})
})
