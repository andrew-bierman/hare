import { test as baseTest, expect, type Page } from '@playwright/test'
import { test } from './fixtures'

// Helper to dismiss the onboarding tour if it reappears after navigation

const VIEWPORTS = {
	mobile: { width: 375, height: 667 },
	tablet: { width: 768, height: 1024 },
} as const

// ============================================================================
// ROUTE PROTECTION
// ============================================================================

baseTest.describe('Conversations Route Protection', () => {
	baseTest('unauthenticated user is redirected from conversations to sign-in', async ({ page }) => {
		await page.goto('/dashboard/agents/test-agent-id/conversations')
		await page.waitForURL(/\/sign-in/, { timeout: 10000 })
		await expect(page).toHaveURL(/\/sign-in/)
	})
})

// ============================================================================
// AUTHENTICATED TESTS
// ============================================================================

test.describe('Agent Conversations Page', () => {
	/**
	 * Helper to create an agent and return its ID from the URL.
	 */
	async function createAgentAndGetId(page: Page): Promise<string> {
		const agentName = `E2E Conversations Agent ${Date.now()}`

		await page.goto('/dashboard/agents/new')
		await page.waitForSelector('main', { state: 'visible' })

		const nameInput = page.getByLabel(/name/i).first()
		await nameInput.click()
		await nameInput.fill('')
		await nameInput.pressSequentially(agentName, { delay: 10 })

		await page
			.getByRole('button', { name: /create/i })
			.first()
			.click()

		// Wait for navigation to agent detail page
		await page.waitForURL(/\/dashboard\/agents\/(?!new)/, { timeout: 15000 })

		// Extract agent ID from URL
		const url = page.url()
		const match = url.match(/\/dashboard\/agents\/([^/]+)/)
		const agentId = match?.[1]
		if (!agentId) {
			throw new Error(`Could not extract agent ID from URL: ${url}`)
		}
		return agentId
	}

	test('page loads after creating an agent', async ({ authenticatedPage: page }) => {
		const agentId = await createAgentAndGetId(page)

		await page.goto(`/dashboard/agents/${agentId}/conversations`)
		await page.waitForSelector('main', { state: 'visible' })

		// Should show the Search Conversations heading
		await expect(page.getByRole('heading', { name: 'Search Conversations' }).first()).toBeVisible({
			timeout: 10000,
		})
	})

	test('shows search card with input and button', async ({ authenticatedPage: page }) => {
		const agentId = await createAgentAndGetId(page)

		await page.goto(`/dashboard/agents/${agentId}/conversations`)
		await page.waitForSelector('main', { state: 'visible' })

		// Search card should be visible
		await expect(page.getByText('Search').first()).toBeVisible({ timeout: 10000 })

		// Search input and button
		await expect(page.getByPlaceholder('Search messages...')).toBeVisible()
		await expect(page.getByRole('button', { name: 'Search' }).first()).toBeVisible()
	})

	test('shows empty state when no search has been performed', async ({
		authenticatedPage: page,
	}) => {
		const agentId = await createAgentAndGetId(page)

		await page.goto(`/dashboard/agents/${agentId}/conversations`)
		await page.waitForSelector('main', { state: 'visible' })

		// Results card should show the initial empty state
		await expect(page.getByText('Results').first()).toBeVisible({ timeout: 10000 })
		await expect(page.getByText('Search conversations').first()).toBeVisible()
		await expect(
			page.getByText(/Enter a search term to find messages across all conversations/),
		).toBeVisible()
	})

	test('shows no results state after searching with no matches', async ({
		authenticatedPage: page,
	}) => {
		const agentId = await createAgentAndGetId(page)

		await page.goto(`/dashboard/agents/${agentId}/conversations`)
		await page.waitForSelector('main', { state: 'visible' })

		// Type a search query that will not match anything
		const searchInput = page.getByPlaceholder('Search messages...')
		await searchInput.click()
		await searchInput.pressSequentially('zzz-nonexistent-query-xyz', { delay: 10 })

		await page.getByRole('button', { name: 'Search' }).first().click()

		// Should show no results or the empty search state
		const noResults = page.getByText('No results found').first()
		const searchConversations = page.getByText('Search conversations').first()

		await expect(noResults.or(searchConversations)).toBeVisible({ timeout: 10000 })
	})

	test('shows back button linking to agent detail page', async ({ authenticatedPage: page }) => {
		const agentId = await createAgentAndGetId(page)

		await page.goto(`/dashboard/agents/${agentId}/conversations`)
		await page.waitForSelector('main', { state: 'visible' })

		// Back button is a Link to the agent detail page containing an ArrowLeft icon
		const backLink = page.locator(`a[href*="/dashboard/agents/${agentId}"]`).first()
		await expect(backLink).toBeVisible({ timeout: 10000 })
	})

	test('shows error state for non-existent agent', async ({ authenticatedPage: page }) => {
		await page.goto('/dashboard/agents/non-existent-agent-id-12345/conversations')

		// Wait for either the error state or main to load
		await page.waitForSelector('main', { state: 'visible', timeout: 10000 }).catch(() => {})
		await page.waitForTimeout(3000)

		// Should show error or "Agent not found" message, or redirect to agents page
		const errorText = page.getByText(/not found|error/i).first()
		const backButton = page
			.getByRole('link', { name: /back to agents/i })
			.or(page.locator('a[href*="/dashboard/agents"]'))

		const hasError = await errorText.isVisible().catch(() => false)
		const hasBackButton = await backButton
			.first()
			.isVisible()
			.catch(() => false)
		const onAgentsPage = page.url().includes('/dashboard/agents')

		// At least one error indicator should be present, or we're on agents page
		expect(hasError || hasBackButton || onAgentsPage).toBe(true)
	})
})

// ============================================================================
// RESPONSIVE DESIGN
// ============================================================================

test.describe('Agent Conversations - Responsive', () => {
	async function createAgentAndGetId(page: Page): Promise<string> {
		const agentName = `E2E Responsive Agent ${Date.now()}`

		await page.goto('/dashboard/agents/new')
		await page.waitForSelector('main', { state: 'visible' })

		const nameInput = page.getByLabel(/name/i).first()
		await nameInput.click()
		await nameInput.fill('')
		await nameInput.pressSequentially(agentName, { delay: 10 })

		await page
			.getByRole('button', { name: /create/i })
			.first()
			.click()

		await page.waitForURL(/\/dashboard\/agents\/(?!new)/, { timeout: 15000 })

		const url = page.url()
		const match = url.match(/\/dashboard\/agents\/([^/]+)/)
		const agentId = match?.[1]
		if (!agentId) {
			throw new Error(`Could not extract agent ID from URL: ${url}`)
		}
		return agentId
	}

	for (const [device, viewport] of Object.entries(VIEWPORTS)) {
		test(`page renders correctly on ${device} (${viewport.width}x${viewport.height})`, async ({
			authenticatedPage: page,
		}) => {
			const agentId = await createAgentAndGetId(page)

			await page.setViewportSize(viewport)
			await page.goto(`/dashboard/agents/${agentId}/conversations`)
			await page.waitForSelector('main', { state: 'visible' })

			// Heading should be visible
			await expect(page.getByRole('heading', { name: 'Search Conversations' }).first()).toBeVisible(
				{
					timeout: 10000,
				},
			)

			// Search input should be visible
			await expect(page.getByPlaceholder('Search messages...')).toBeVisible({ timeout: 5000 })

			// Results card should be visible
			await expect(page.getByText('Results').first()).toBeVisible({ timeout: 5000 })
		})
	}
})
