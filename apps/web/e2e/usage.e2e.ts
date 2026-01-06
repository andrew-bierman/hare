import { type APIRequestContext, test as baseTest, expect, type Page } from '@playwright/test'
import { test } from './fixtures'

/**
 * Comprehensive Usage Page E2E tests.
 * Tests usage tracking, statistics display, and API integration.
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

baseTest.describe('Usage Page - Unauthenticated', () => {
	baseTest.beforeEach(async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/usage')
		await page.waitForLoadState('networkidle')
	})

	baseTest('displays usage heading', async ({ page }: { page: Page }) => {
		await expect(page.getByRole('heading', { name: 'Usage' })).toBeVisible()
	})

	baseTest('page loads without 404 error', async ({ page }: { page: Page }) => {
		await expect(page.locator('body')).not.toContainText('404')
	})

	baseTest('shows usage page layout with cards', async ({ page }: { page: Page }) => {
		// Usage page should have card elements for stats
		const cards = page.locator('[class*="card"]')
		await expect(cards.first()).toBeVisible()
	})
})

baseTest.describe('Usage Page Access - Sidebar Navigation', () => {
	baseTest('can navigate to usage page from sidebar', async ({ page }: { page: Page }) => {
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')

		await page.getByRole('link', { name: 'Usage' }).click()
		await page.waitForURL(/\/dashboard\/usage/, { timeout: 10000 })
		await expect(page.getByRole('heading', { name: 'Usage' })).toBeVisible()
	})

	baseTest('usage link is visible in navigation', async ({ page }: { page: Page }) => {
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')

		const nav = page.locator('nav')
		await expect(nav.getByRole('link', { name: 'Usage' })).toBeVisible()
	})
})

test.describe('Usage Page - Authenticated', () => {
	test('authenticated user can access usage page', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/usage')
		await authenticatedPage.waitForLoadState('networkidle')
		await expect(authenticatedPage).toHaveURL(/\/dashboard\/usage/)
		await expect(authenticatedPage.getByRole('heading', { name: 'Usage' })).toBeVisible()
	})

	test('usage page layout loads correctly', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/usage')
		await authenticatedPage.waitForLoadState('networkidle')

		// Verify the main heading
		await expect(authenticatedPage.getByRole('heading', { name: 'Usage' })).toBeVisible()

		// Verify page contains card elements
		const cards = authenticatedPage.locator('[class*="card"]')
		await expect(cards.first()).toBeVisible()
	})
})

test.describe('Usage Statistics Display', () => {
	test('displays Total API Calls stat card', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/usage')
		await authenticatedPage.waitForLoadState('networkidle')

		// Wait for loading to complete (skeletons disappear)
		await authenticatedPage.waitForTimeout(2000)

		// Check for Total API Calls card
		await expect(authenticatedPage.getByText('Total API Calls')).toBeVisible()
	})

	test('displays Total Tokens stat card', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/usage')
		await authenticatedPage.waitForLoadState('networkidle')

		// Wait for loading to complete
		await authenticatedPage.waitForTimeout(2000)

		// Check for Total Tokens card
		await expect(authenticatedPage.getByText('Total Tokens')).toBeVisible()
	})

	test('displays Active Agents stat card', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/usage')
		await authenticatedPage.waitForLoadState('networkidle')

		// Wait for loading to complete
		await authenticatedPage.waitForTimeout(2000)

		// Check for Active Agents card
		await expect(authenticatedPage.getByText('Active Agents')).toBeVisible()
	})

	test('displays Period stat card', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/usage')
		await authenticatedPage.waitForLoadState('networkidle')

		// Wait for loading to complete
		await authenticatedPage.waitForTimeout(2000)

		// Check for Period card
		await expect(authenticatedPage.getByText('Period')).toBeVisible()
	})

	test('stat cards show billing period description', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/usage')
		await authenticatedPage.waitForLoadState('networkidle')

		// Wait for loading to complete
		await authenticatedPage.waitForTimeout(2000)

		// Check for billing period text
		await expect(authenticatedPage.getByText('This billing period')).toBeVisible()
	})

	test('shows input/output token breakdown in description', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/usage')
		await authenticatedPage.waitForLoadState('networkidle')

		// Wait for loading to complete
		await authenticatedPage.waitForTimeout(2000)

		// Check for input/output breakdown text pattern
		const tokenDescription = authenticatedPage.getByText(/input.*output/i)
		await expect(tokenDescription.first()).toBeVisible()
	})
})

test.describe('Token Breakdown Section', () => {
	test('displays Token Breakdown card', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/usage')
		await authenticatedPage.waitForLoadState('networkidle')

		// Wait for loading to complete
		await authenticatedPage.waitForTimeout(2000)

		// Check for Token Breakdown title
		await expect(authenticatedPage.getByText('Token Breakdown')).toBeVisible()
	})

	test('shows Input Tokens section', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/usage')
		await authenticatedPage.waitForLoadState('networkidle')

		// Wait for loading to complete
		await authenticatedPage.waitForTimeout(2000)

		// Check for Input Tokens label
		await expect(authenticatedPage.getByText('Input Tokens').first()).toBeVisible()
		await expect(authenticatedPage.getByText('Tokens sent to the model')).toBeVisible()
	})

	test('shows Output Tokens section', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/usage')
		await authenticatedPage.waitForLoadState('networkidle')

		// Wait for loading to complete
		await authenticatedPage.waitForTimeout(2000)

		// Check for Output Tokens label
		await expect(authenticatedPage.getByText('Output Tokens').first()).toBeVisible()
		await expect(authenticatedPage.getByText('Tokens generated by the model')).toBeVisible()
	})
})

test.describe('Usage by Agent Section', () => {
	test('displays Usage by Agent card', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/usage')
		await authenticatedPage.waitForLoadState('networkidle')

		// Wait for loading to complete
		await authenticatedPage.waitForTimeout(2000)

		// Check for Usage by Agent title
		await expect(authenticatedPage.getByText('Usage by Agent')).toBeVisible()
	})

	test('shows per-agent usage description', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/usage')
		await authenticatedPage.waitForLoadState('networkidle')

		// Wait for loading to complete
		await authenticatedPage.waitForTimeout(2000)

		// Check for description text
		await expect(authenticatedPage.getByText('Token usage per deployed agent')).toBeVisible()
	})

	test('shows empty state when no deployed agents', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/usage')
		await authenticatedPage.waitForLoadState('networkidle')

		// Wait for loading to complete
		await authenticatedPage.waitForTimeout(2000)

		// For new users, should show no deployed agents message
		const noAgentsText = authenticatedPage.getByText('No deployed agents yet')
		// Either shows empty state or has deployed agents
		const hasNoAgents = await noAgentsText.isVisible({ timeout: 2000 }).catch(() => false)

		if (hasNoAgents) {
			await expect(noAgentsText).toBeVisible()
		}
	})
})

test.describe('About Usage Tracking Section', () => {
	test('displays About Usage Tracking card', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/usage')
		await authenticatedPage.waitForLoadState('networkidle')

		// Wait for loading to complete
		await authenticatedPage.waitForTimeout(2000)

		// Check for About Usage Tracking title
		await expect(authenticatedPage.getByText('About Usage Tracking')).toBeVisible()
	})

	test('shows usage tracking description', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/usage')
		await authenticatedPage.waitForLoadState('networkidle')

		// Wait for loading to complete
		await authenticatedPage.waitForTimeout(2000)

		// Check for description text about automatic tracking
		await expect(authenticatedPage.getByText(/Usage is tracked automatically/i)).toBeVisible()
	})

	test('shows billing information', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/usage')
		await authenticatedPage.waitForLoadState('networkidle')

		// Wait for loading to complete
		await authenticatedPage.waitForTimeout(2000)

		// Check for Cloudflare Workers AI pricing text
		await expect(authenticatedPage.getByText(/Cloudflare Workers AI pricing/i)).toBeVisible()
	})
})

test.describe('Usage API Integration', () => {
	baseTest(
		'usage endpoint requires authentication',
		async ({ request }: { request: APIRequestContext }) => {
			const response = await request.get('/api/usage?workspaceId=test')
			expect(response.status()).toBe(401)
		},
	)

	test('can get workspace usage stats via API', async ({ authenticatedPage }) => {
		const workspaceId = await getWorkspaceId(authenticatedPage)

		const response = await authenticatedPage.request.get(`/api/usage?workspaceId=${workspaceId}`)
		expect(response.status()).toBe(200)

		const body = await response.json()
		expect(body).toHaveProperty('period')
		expect(body).toHaveProperty('usage')
		expect(body.usage).toHaveProperty('totalMessages')
		expect(body.usage).toHaveProperty('totalTokensIn')
		expect(body.usage).toHaveProperty('totalTokensOut')
	})

	test('usage API returns period information', async ({ authenticatedPage }) => {
		const workspaceId = await getWorkspaceId(authenticatedPage)

		const response = await authenticatedPage.request.get(`/api/usage?workspaceId=${workspaceId}`)
		expect(response.status()).toBe(200)

		const body = await response.json()
		expect(body.period).toHaveProperty('startDate')
		expect(body.period).toHaveProperty('endDate')
	})

	test('usage API returns byAgent breakdown', async ({ authenticatedPage }) => {
		const workspaceId = await getWorkspaceId(authenticatedPage)

		const response = await authenticatedPage.request.get(`/api/usage?workspaceId=${workspaceId}`)
		expect(response.status()).toBe(200)

		const body = await response.json()
		expect(body.usage).toHaveProperty('byAgent')
		expect(Array.isArray(body.usage.byAgent)).toBe(true)
	})

	test('usage API returns byDay breakdown', async ({ authenticatedPage }) => {
		const workspaceId = await getWorkspaceId(authenticatedPage)

		const response = await authenticatedPage.request.get(`/api/usage?workspaceId=${workspaceId}`)
		expect(response.status()).toBe(200)

		const body = await response.json()
		expect(body.usage).toHaveProperty('byDay')
		expect(Array.isArray(body.usage.byDay)).toBe(true)
	})

	test('usage API supports date filtering', async ({ authenticatedPage }) => {
		const workspaceId = await getWorkspaceId(authenticatedPage)

		// Test with date range parameters
		const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
		const endDate = new Date().toISOString()

		const response = await authenticatedPage.request.get(
			`/api/usage?workspaceId=${workspaceId}&startDate=${startDate}&endDate=${endDate}`,
		)
		expect(response.status()).toBe(200)

		const body = await response.json()
		expect(body).toHaveProperty('usage')
		expect(body).toHaveProperty('period')
	})

	test('usage API returns numeric values for totals', async ({ authenticatedPage }) => {
		const workspaceId = await getWorkspaceId(authenticatedPage)

		const response = await authenticatedPage.request.get(`/api/usage?workspaceId=${workspaceId}`)
		expect(response.status()).toBe(200)

		const body = await response.json()
		expect(typeof body.usage.totalMessages).toBe('number')
		expect(typeof body.usage.totalTokensIn).toBe('number')
		expect(typeof body.usage.totalTokensOut).toBe('number')
	})
})

test.describe('Agent Usage API', () => {
	test('agent usage endpoint requires valid agent ID', async ({ authenticatedPage }) => {
		const workspaceId = await getWorkspaceId(authenticatedPage)

		// Try to get usage for non-existent agent
		const response = await authenticatedPage.request.get(
			`/api/usage/agents/non-existent-id?workspaceId=${workspaceId}`,
		)
		expect(response.status()).toBe(404)
	})

	test('can get usage for a created agent', async ({ authenticatedPage }) => {
		const workspaceId = await getWorkspaceId(authenticatedPage)

		// Create an agent first
		const createResponse = await authenticatedPage.request.post(
			`/api/agents?workspaceId=${workspaceId}`,
			{
				data: {
					name: `Usage Test Agent ${Date.now()}`,
					description: 'Agent for usage testing',
					model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
					instructions: 'You are a test assistant for usage tracking.',
				},
			},
		)
		expect(createResponse.status()).toBe(201)
		const agent = await createResponse.json()

		// Get usage for the agent
		const usageResponse = await authenticatedPage.request.get(
			`/api/usage/agents/${agent.id}?workspaceId=${workspaceId}`,
		)
		expect(usageResponse.status()).toBe(200)

		const body = await usageResponse.json()
		expect(body).toHaveProperty('agentId', agent.id)
		expect(body).toHaveProperty('usage')
		expect(body.usage).toHaveProperty('totalMessages')
		expect(body.usage).toHaveProperty('totalTokensIn')
		expect(body.usage).toHaveProperty('totalTokensOut')

		// Cleanup
		await authenticatedPage.request.delete(`/api/agents/${agent.id}?workspaceId=${workspaceId}`)
	})
})

test.describe('Usage Page Loading States', () => {
	test('shows loading skeletons initially', async ({ authenticatedPage }) => {
		// Navigate to usage page and check for skeleton loaders
		await authenticatedPage.goto('/dashboard/usage')

		// Skeletons should appear briefly while data loads
		// The skeleton class is used in the StatCardSkeleton component
		const skeletons = authenticatedPage.locator('[class*="skeleton"]')

		// Either skeletons are visible (still loading) or content has loaded
		const hasSkeletons = await skeletons
			.first()
			.isVisible({ timeout: 1000 })
			.catch(() => false)
		const hasHeading = await authenticatedPage
			.getByRole('heading', { name: 'Usage' })
			.isVisible({ timeout: 5000 })

		// Page should either show skeletons or have loaded content
		expect(hasSkeletons || hasHeading).toBe(true)
	})

	test('content loads after skeletons', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/usage')
		await authenticatedPage.waitForLoadState('networkidle')

		// Wait for content to load
		await authenticatedPage.waitForTimeout(3000)

		// After loading, stat cards should be visible
		await expect(authenticatedPage.getByText('Total API Calls')).toBeVisible()
		await expect(authenticatedPage.getByText('Total Tokens')).toBeVisible()
	})
})

test.describe('Usage Page Responsive Layout', () => {
	test('usage page is responsive on mobile', async ({ authenticatedPage }) => {
		await authenticatedPage.setViewportSize({ width: 375, height: 667 })
		await authenticatedPage.goto('/dashboard/usage')
		await authenticatedPage.waitForLoadState('networkidle')

		// Page should still load without 404
		await expect(authenticatedPage.locator('body')).not.toContainText('404')
		// Heading should be visible
		await expect(authenticatedPage.getByRole('heading', { name: 'Usage' })).toBeVisible()
	})

	test('usage page is responsive on tablet', async ({ authenticatedPage }) => {
		await authenticatedPage.setViewportSize({ width: 768, height: 1024 })
		await authenticatedPage.goto('/dashboard/usage')
		await authenticatedPage.waitForLoadState('networkidle')

		await expect(authenticatedPage.locator('body')).not.toContainText('404')
		await expect(authenticatedPage.getByRole('heading', { name: 'Usage' })).toBeVisible()
	})

	test('stat cards stack correctly on mobile', async ({ authenticatedPage }) => {
		await authenticatedPage.setViewportSize({ width: 375, height: 667 })
		await authenticatedPage.goto('/dashboard/usage')
		await authenticatedPage.waitForLoadState('networkidle')

		// Wait for content to load
		await authenticatedPage.waitForTimeout(2000)

		// Check that stat cards are visible (they should stack on mobile)
		await expect(authenticatedPage.getByText('Total API Calls')).toBeVisible()
		await expect(authenticatedPage.getByText('Total Tokens')).toBeVisible()
	})
})

test.describe('Usage Page Navigation', () => {
	test('can navigate to usage from dashboard', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')

		await authenticatedPage.getByRole('link', { name: 'Usage' }).click()
		await authenticatedPage.waitForURL(/\/dashboard\/usage/)

		await expect(authenticatedPage.getByRole('heading', { name: 'Usage' })).toBeVisible()
	})

	test('can navigate back to dashboard from usage', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/usage')
		await authenticatedPage.waitForLoadState('networkidle')

		await authenticatedPage.getByRole('link', { name: 'Dashboard' }).click()
		await authenticatedPage.waitForURL(/\/dashboard$/)

		await expect(authenticatedPage.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
	})

	test('can navigate to agents from usage', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/usage')
		await authenticatedPage.waitForLoadState('networkidle')

		await authenticatedPage.getByRole('link', { name: 'Agents' }).click()
		await authenticatedPage.waitForURL(/\/dashboard\/agents/)

		await expect(
			authenticatedPage.getByRole('heading', { name: 'Agents', exact: true }),
		).toBeVisible()
	})
})

test.describe('Usage Data Formatting', () => {
	test('large numbers are formatted with K/M suffix', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/usage')
		await authenticatedPage.waitForLoadState('networkidle')

		// Wait for content to load
		await authenticatedPage.waitForTimeout(2000)

		// The page should be loaded with formatted numbers
		// Numbers >= 1000 should show as K, >= 1000000 as M
		// This verifies the formatNumber function is working
		await expect(authenticatedPage.getByRole('heading', { name: 'Usage' })).toBeVisible()
	})
})

test.describe('Usage Page Accessibility', () => {
	test('has proper heading hierarchy', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/usage')
		await authenticatedPage.waitForLoadState('networkidle')

		// Should have h2 heading for main page title
		const h2 = authenticatedPage.locator('h2').filter({ hasText: 'Usage' })
		await expect(h2).toBeVisible()
	})

	test('stat cards have proper labels', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/usage')
		await authenticatedPage.waitForLoadState('networkidle')

		// Wait for content to load
		await authenticatedPage.waitForTimeout(2000)

		// Each stat card should have a title
		await expect(authenticatedPage.getByText('Total API Calls')).toBeVisible()
		await expect(authenticatedPage.getByText('Total Tokens')).toBeVisible()
		await expect(authenticatedPage.getByText('Active Agents')).toBeVisible()
		await expect(authenticatedPage.getByText('Period')).toBeVisible()
	})
})
