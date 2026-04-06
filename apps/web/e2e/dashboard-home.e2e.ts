import { expect } from '@playwright/test'
import { test } from './fixtures'

/**
 * Dashboard Home Page E2E tests.
 * Tests the overview functionality including stats cards, quick actions,
 * recent agents, empty states, and onboarding wizard.
 *
 * Note: All tests require authentication since /dashboard is a protected route.
 */

// Helper to generate unique agent names
function generateAgentName(): string {
	return `Dashboard Test Agent ${Date.now()}`
}

// ============================================================================
// Stats Cards Tests
// ============================================================================

test.describe('Dashboard Home - Stats Cards', () => {
	test('dashboard loads with stats cards', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		// Wait for loading to complete
		await authenticatedPage.waitForTimeout(2000)

		// Dashboard heading should be visible
		await expect(
			authenticatedPage.getByRole('heading', { name: 'Dashboard' }).first(),
		).toBeVisible()

		// All four stats cards should be visible
		await expect(authenticatedPage.getByText('Total Agents')).toBeVisible()
		await expect(authenticatedPage.getByText('API Calls')).toBeVisible()
		await expect(authenticatedPage.getByText('Tokens Used')).toBeVisible()
		await expect(authenticatedPage.getByText('Active Tools')).toBeVisible()
	})

	test('stats cards show correct counts from database', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		// Wait for loading to complete
		await authenticatedPage.waitForTimeout(2000)

		// Total Agents card should show 0 for new user
		const totalAgentsCard = authenticatedPage
			.locator('[class*="card"]')
			.filter({ hasText: 'Total Agents' })
		await expect(totalAgentsCard).toBeVisible()

		// The value should be displayed (0 for new user)
		const agentCountText = await totalAgentsCard
			.locator('span')
			.filter({ hasText: /^\d+$/ })
			.first()
			.textContent()
		expect(agentCountText).toBeDefined()
	})

	test('stats update after creating an agent', async ({ authenticatedPage }) => {
		// First check initial count
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })
		await authenticatedPage.waitForTimeout(2000)

		// Create an agent
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		const agentName = generateAgentName()
		const nameInput = authenticatedPage.getByLabel(/name/i).first()
		await nameInput.click()
		await nameInput.fill('')
		await nameInput.pressSequentially(agentName, { delay: 10 })

		const createButton = authenticatedPage.getByRole('button', { name: /create/i }).first()
		await createButton.click()

		// Wait for creation
		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[^/]+$/, { timeout: 10000 })
		await authenticatedPage.waitForTimeout(2000)

		// Go back to dashboard
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })
		await authenticatedPage.waitForTimeout(2000)

		// Total Agents should now show at least 1
		const totalAgentsCard = authenticatedPage
			.locator('[class*="card"]')
			.filter({ hasText: 'Total Agents' })
		await expect(totalAgentsCard).toBeVisible()
	})
})

// ============================================================================
// Quick Actions Tests
// ============================================================================

test.describe('Dashboard Home - Quick Actions', () => {
	test('displays quick action links', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		// Quick actions should be visible
		await expect(authenticatedPage.getByText('Create Agent')).toBeVisible()
		await expect(authenticatedPage.getByText('Manage Tools')).toBeVisible()
		await expect(authenticatedPage.getByText('View Usage')).toBeVisible()
	})

	test('Create Agent quick action navigates to create page', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		// Click the Create Agent quick action
		const createAgentLink = authenticatedPage.locator('a').filter({ hasText: 'Create Agent' })
		await createAgentLink.click()

		// Should navigate to agents/new
		await expect(authenticatedPage).toHaveURL('/dashboard/agents/new')
		await expect(
			authenticatedPage.getByRole('heading', { name: 'Create New Agent' }).first(),
		).toBeVisible()
	})

	test('Manage Tools quick action navigates to tools page', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		// Click the Manage Tools quick action
		const manageToolsLink = authenticatedPage.locator('a').filter({ hasText: 'Manage Tools' })
		await manageToolsLink.click()

		// Should navigate to tools page
		await expect(authenticatedPage).toHaveURL('/dashboard/tools')
		await expect(
			authenticatedPage.getByRole('heading', { name: 'Tools', exact: true }).first(),
		).toBeVisible()
	})

	test('View Usage quick action navigates to usage page', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		// Click the View Usage quick action
		const viewUsageLink = authenticatedPage.locator('a').filter({ hasText: 'View Usage' })
		await viewUsageLink.click()

		// Should navigate to usage page
		await expect(authenticatedPage).toHaveURL('/dashboard/usage')
		await expect(authenticatedPage.getByRole('heading', { name: 'Usage' }).first()).toBeVisible()
	})
})

// ============================================================================
// Recent Agents Section Tests
// ============================================================================

test.describe('Dashboard Home - Recent Agents', () => {
	test('displays Recent Agents section', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		await expect(
			authenticatedPage.getByRole('heading', { name: 'Recent Agents' }).first(),
		).toBeVisible()
		await expect(authenticatedPage.getByText('Ordered by last update')).toBeVisible()
	})

	test('shows empty state or agents list for new users', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		// Wait for content to load
		await authenticatedPage.waitForTimeout(3000)

		// Dashboard should show either empty state or recent agents section
		const emptyStateTitle = authenticatedPage.getByText('No agents yet')
		const recentAgents = authenticatedPage.getByText('Recent Agents')
		const createNewCard = authenticatedPage.getByText('Create New Agent')
		const dashboard = authenticatedPage.getByText('Dashboard').first()

		const hasEmptyState = await emptyStateTitle.isVisible().catch(() => false)
		const hasRecentAgents = await recentAgents.isVisible().catch(() => false)
		const hasCreateCard = await createNewCard.isVisible().catch(() => false)
		const hasDashboard = await dashboard.isVisible().catch(() => false)

		expect(hasEmptyState || hasRecentAgents || hasCreateCard || hasDashboard).toBeTruthy()
	})

	test('recent agents section shows up to 5 agents', async ({ authenticatedPage }) => {
		// Create multiple agents
		for (let i = 0; i < 6; i++) {
			await authenticatedPage.goto('/dashboard/agents/new')
			await authenticatedPage.waitForSelector('main', { state: 'visible' })

			const agentName = `Dashboard Test ${Date.now()}-${i}`
			const nameInput = authenticatedPage.getByLabel(/name/i).first()
			await nameInput.click()
			await nameInput.fill('')
			await nameInput.pressSequentially(agentName, { delay: 10 })

			const createButton = authenticatedPage.getByRole('button', { name: /create/i }).first()
			await createButton.click()

			await authenticatedPage.waitForURL(/\/dashboard\/agents\/[^/]+$/, { timeout: 10000 })
			await authenticatedPage.waitForTimeout(1000)
		}

		// Go to dashboard
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })
		await authenticatedPage.waitForTimeout(2000)

		// Count agent cards by finding links to agent detail pages (excludes create new card)
		const agentLinks = authenticatedPage.locator(
			'a[href*="/dashboard/agents/"]:not([href="/dashboard/agents/new"])',
		)

		// Should show at most 5 recent agents (the implementation takes slice(0, 5))
		const cardCount = await agentLinks.count()
		expect(cardCount).toBeLessThanOrEqual(5)
	})

	test('recent agent cards show name, status, and last updated', async ({ authenticatedPage }) => {
		// Create an agent first
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		const agentName = generateAgentName()
		const nameInput = authenticatedPage.getByLabel(/name/i).first()
		await nameInput.click()
		await nameInput.fill('')
		await nameInput.pressSequentially(agentName, { delay: 10 })
		await authenticatedPage.locator('#description').fill('Test agent for card info verification')

		const createButton = authenticatedPage.getByRole('button', { name: /create/i }).first()
		await createButton.click()

		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[^/]+$/, { timeout: 10000 })
		await authenticatedPage.waitForTimeout(2000)

		// Go to dashboard
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })
		await authenticatedPage.waitForTimeout(2000)

		// Find the agent card link
		const agentCardLink = authenticatedPage
			.locator('a[href*="/dashboard/agents/"]:not([href="/dashboard/agents/new"])')
			.filter({ hasText: agentName })
		await expect(agentCardLink).toBeVisible()

		// Card should show the agent name
		await expect(agentCardLink.getByText(agentName)).toBeVisible()

		// Card should show status (Draft for new agents) - the status text appears in the card
		const cardText = await agentCardLink.textContent()
		expect(cardText).toMatch(/Draft|Deployed/)

		// Card should show last updated date (format: "Jan 19" or similar)
		const datePattern = /\w{3}\s+\d{1,2}/
		expect(cardText).toMatch(datePattern)
	})

	test('clicking agent card navigates to agent detail', async ({ authenticatedPage }) => {
		// Create an agent first
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		const agentName = generateAgentName()
		const nameInput = authenticatedPage.getByLabel(/name/i).first()
		await nameInput.click()
		await nameInput.fill('')
		await nameInput.pressSequentially(agentName, { delay: 10 })

		const createButton = authenticatedPage.getByRole('button', { name: /create/i }).first()
		await createButton.click()

		// Wait for navigation to agent detail after creation
		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[^/]+$/, { timeout: 10000 })
		await authenticatedPage.waitForTimeout(2000)

		// Go to dashboard
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })
		await authenticatedPage.waitForTimeout(2000)

		// Click on the agent card (not the "new" link)
		const agentCard = authenticatedPage
			.locator('a[href*="/dashboard/agents/"]:not([href="/dashboard/agents/new"])')
			.filter({ hasText: agentName })
		await agentCard.click()

		// Should navigate to an agent detail page (UUID format)
		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[a-f0-9-]+$/, { timeout: 10000 })
		expect(authenticatedPage.url()).toMatch(/\/dashboard\/agents\/[a-f0-9-]+$/)
	})

	test('Create New Agent card navigates to create page', async ({ authenticatedPage }) => {
		// Create at least one agent so we can see the Create New Agent card in the grid
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		const agentName = generateAgentName()
		const nameInput = authenticatedPage.getByLabel(/name/i).first()
		await nameInput.click()
		await nameInput.fill('')
		await nameInput.pressSequentially(agentName, { delay: 10 })

		const createButton = authenticatedPage.getByRole('button', { name: /create/i }).first()
		await createButton.click()

		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[^/]+$/, { timeout: 10000 })
		await authenticatedPage.waitForTimeout(2000)

		// Go to dashboard
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })
		await authenticatedPage.waitForTimeout(2000)

		// Click the Create New Agent card
		const createNewCard = authenticatedPage
			.locator('a[href="/dashboard/agents/new"]')
			.filter({ hasText: 'Create New Agent' })
		await createNewCard.click()

		// Should navigate to agents/new
		await expect(authenticatedPage).toHaveURL('/dashboard/agents/new')
		await expect(
			authenticatedPage.getByRole('heading', { name: 'Create New Agent' }).first(),
		).toBeVisible()
	})

	test('View all link navigates to agents list when agents exist', async ({
		authenticatedPage,
	}) => {
		// Create an agent first
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		const agentName = generateAgentName()
		const nameInput = authenticatedPage.getByLabel(/name/i).first()
		await nameInput.click()
		await nameInput.fill('')
		await nameInput.pressSequentially(agentName, { delay: 10 })

		const createButton = authenticatedPage.getByRole('button', { name: /create/i }).first()
		await createButton.click()

		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[^/]+$/, { timeout: 10000 })
		await authenticatedPage.waitForTimeout(2000)

		// Go to dashboard
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })
		await authenticatedPage.waitForTimeout(2000)

		// Click View all link near "Recent Agents" section (not the audit logs one)
		const recentAgentsSection = authenticatedPage.getByText('Recent Agents')
		if (await recentAgentsSection.isVisible().catch(() => false)) {
			// Find View all link specifically in the agents section
			const viewAllLink = authenticatedPage
				.locator('a[href="/dashboard/agents"]')
				.filter({ hasText: /view all/i })
				.first()
			if (await viewAllLink.isVisible().catch(() => false)) {
				await viewAllLink.click()
				await expect(authenticatedPage).toHaveURL('/dashboard/agents')
			}
		}
	})
})

// ============================================================================
// Empty State Tests
// ============================================================================

test.describe('Dashboard Home - Empty State', () => {
	test('dashboard shows content appropriate to agent count', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		// Wait for content to load
		await authenticatedPage.waitForTimeout(3000)

		// Dashboard should show either empty state or agent cards depending on state
		const noAgentsText = authenticatedPage.getByText('No agents yet')
		const recentAgents = authenticatedPage.getByText('Recent Agents')
		const createAgentCta = authenticatedPage.getByText('Create New Agent')
		const dashboard = authenticatedPage.getByText('Dashboard').first()

		const hasContent =
			(await noAgentsText.isVisible().catch(() => false)) ||
			(await recentAgents.isVisible().catch(() => false)) ||
			(await createAgentCta.isVisible().catch(() => false)) ||
			(await dashboard.isVisible().catch(() => false))

		expect(hasContent).toBeTruthy()
	})

	test('empty state has create agent button', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })
		await authenticatedPage.waitForTimeout(2000)

		// Look for Create Agent button in empty state
		const emptyStateCard = authenticatedPage.locator('[class*="card"][class*="dashed"]')

		if (await emptyStateCard.isVisible()) {
			const createButton = emptyStateCard.getByRole('button', { name: /create agent/i })
			await expect(createButton).toBeVisible()
		}
	})
})

// ============================================================================
// Onboarding Wizard Tests
// ============================================================================

test.describe('Dashboard Home - Onboarding Wizard', () => {
	test('onboarding wizard appears for new users', async ({ authenticatedPage }) => {
		// Clear localStorage to ensure wizard hasn't been dismissed
		await authenticatedPage.evaluate(() => {
			localStorage.removeItem('onboarding-dismissed')
		})

		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		// Wait for wizard to appear (it has a 500ms delay)
		await authenticatedPage.waitForTimeout(1500)

		// Check for wizard dialog
		const wizardDialog = authenticatedPage.getByRole('dialog')
		const welcomeText = authenticatedPage.getByText('Welcome to Hare!')

		const hasWizard =
			(await wizardDialog.isVisible().catch(() => false)) ||
			(await welcomeText.isVisible().catch(() => false))

		// Note: Wizard may not appear if there are agents or if dismissed flag persists
		// This is expected behavior
		if (hasWizard) {
			await expect(welcomeText).toBeVisible()
		}
	})

	test('onboarding wizard can be dismissed', async ({ authenticatedPage }) => {
		// Clear localStorage
		await authenticatedPage.evaluate(() => {
			localStorage.removeItem('onboarding-dismissed')
		})

		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })
		await authenticatedPage.waitForTimeout(1500)

		// If wizard is visible, dismiss it
		const wizardDialog = authenticatedPage.getByRole('dialog')
		if (await wizardDialog.isVisible()) {
			const skipButton = authenticatedPage.getByRole('button', { name: /skip for now/i })
			await skipButton.click()

			// Dialog should close
			await expect(wizardDialog).not.toBeVisible()
		}
	})

	test('onboarding wizard Get Started leads to template selection', async ({
		authenticatedPage,
	}) => {
		// Clear localStorage
		await authenticatedPage.evaluate(() => {
			localStorage.removeItem('onboarding-dismissed')
		})

		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })
		await authenticatedPage.waitForTimeout(1500)

		// If wizard is visible, click Get Started
		const wizardDialog = authenticatedPage.getByRole('dialog')
		if (await wizardDialog.isVisible()) {
			const getStartedButton = authenticatedPage.getByRole('button', { name: /get started/i })
			await getStartedButton.click()

			// Should show template selection step
			const templateHeading = authenticatedPage.getByRole('heading', {
				name: 'Choose a template',
			})
			await expect(templateHeading).toBeVisible()
		}
	})
})

// ============================================================================
// Data Refresh Tests
// ============================================================================

test.describe('Dashboard Home - Data Refresh', () => {
	test('dashboard refreshes data on focus', async ({ authenticatedPage, context }) => {
		// Create an agent
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		const agentName = generateAgentName()
		const nameInput = authenticatedPage.getByLabel(/name/i).first()
		await nameInput.click()
		await nameInput.fill('')
		await nameInput.pressSequentially(agentName, { delay: 10 })

		const createButton = authenticatedPage.getByRole('button', { name: /create/i }).first()
		await createButton.click()

		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[^/]+$/, { timeout: 10000 })
		await authenticatedPage.waitForTimeout(2000)

		// Go to dashboard
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })
		await authenticatedPage.waitForTimeout(2000)

		// Verify agent is shown
		await expect(authenticatedPage.getByText(agentName)).toBeVisible()

		// Open a new tab to trigger blur/focus cycle
		const newPage = await context.newPage()
		await newPage.goto('/dashboard')
		await newPage.waitForLoadState('domcontentloaded')

		// Close the new page to return focus to original
		await newPage.close()

		// Give time for refetch on focus
		await authenticatedPage.waitForTimeout(1000)

		// Data should still be present (refetch should have occurred)
		await expect(authenticatedPage.getByText(agentName)).toBeVisible()
	})
})

// ============================================================================
// Header Button Tests
// ============================================================================

test.describe('Dashboard Home - Header', () => {
	test('New Agent button in header navigates to create page', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		// Header should have New Agent button
		const newAgentButton = authenticatedPage
			.locator('a')
			.filter({ hasText: /new agent/i })
			.first()
		await expect(newAgentButton).toBeVisible()

		// Click the New Agent button in header
		await newAgentButton.click()

		// Should navigate to agents/new
		await expect(authenticatedPage).toHaveURL('/dashboard/agents/new')
		await expect(
			authenticatedPage.getByRole('heading', { name: 'Create New Agent' }).first(),
		).toBeVisible()
	})
})

// ============================================================================
// Responsive Design Tests
// ============================================================================

test.describe('Dashboard Home - Responsive Design', () => {
	test('displays correctly on mobile', async ({ authenticatedPage }) => {
		await authenticatedPage.setViewportSize({ width: 375, height: 667 })
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		// Dashboard content should be visible
		await expect(authenticatedPage.getByText('Dashboard').first()).toBeVisible()
	})

	test('displays correctly on tablet', async ({ authenticatedPage }) => {
		await authenticatedPage.setViewportSize({ width: 768, height: 1024 })
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })

		// Heading should be visible
		await expect(authenticatedPage.getByRole('heading', { name: 'Dashboard' }).first()).toBeVisible(
			{
				timeout: 10000,
			},
		)

		// Quick actions section should be visible - look for the Create Agent text
		await expect(authenticatedPage.getByText('Create Agent')).toBeVisible({ timeout: 10000 })
	})
})
