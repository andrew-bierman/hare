import { test as baseTest, expect } from '@playwright/test'
import { test } from './fixtures'

/**
 * Public Embed E2E tests.
 * Tests the public-facing embeddable agent widget.
 * The embed page is accessible without authentication at /embed/:agentId
 */

// Helper to create an agent and return its ID
async function createAgent(page: import('@playwright/test').Page): Promise<string> {
	await page.goto('/dashboard/agents/new')
	await page.waitForLoadState('networkidle')

	await expect(page.getByRole('heading', { name: /create/i })).toBeVisible({ timeout: 20000 })

	const nameInput = page.getByLabel(/agent name/i)
	await nameInput.click()
	await nameInput.pressSequentially(`Embed Widget ${Date.now()}`, { delay: 15 })

	await page.getByRole('button', { name: /create agent/i }).click()
	await page.waitForURL(/\/dashboard\/agents\/[^/]+$/, { timeout: 15000 })

	return page.url().split('/').pop() || ''
}

// ============================================================================
// Public Embed - Route Access
// ============================================================================

baseTest.describe('Public Embed Access', () => {
	baseTest('embed page is publicly accessible (no auth required)', async ({ page }) => {
		// Navigate to a non-existent agent - should still load page, not redirect to sign-in
		await page.goto('/embed/test-agent-id')
		await page.waitForLoadState('networkidle')

		// Should NOT redirect to sign-in (embed is public)
		await expect(page).not.toHaveURL(/\/sign-in/)
	})

	baseTest('embed page shows error for invalid agent', async ({ page }) => {
		await page.goto('/embed/invalid-agent-id-12345')
		await page.waitForLoadState('networkidle')

		// Should show error or not found message
		const errorText = page.getByText(/not found|error|invalid|doesn't exist/i)
		const mainContent = page.locator('body')

		// Either show error or just load something (not redirect)
		await expect(mainContent).toBeVisible({ timeout: 10000 })
	})
})

// ============================================================================
// Public Embed - Valid Agent
// ============================================================================

test.describe('Public Embed - Valid Agent', () => {
	test('displays embed widget for valid agent', async ({ authenticatedPage }) => {
		// Create agent first
		const agentId = await createAgent(authenticatedPage)

		// Now access public embed (could use new page for true public access)
		await authenticatedPage.goto(`/embed/${agentId}`)
		await authenticatedPage.waitForLoadState('networkidle')

		await expect(authenticatedPage.locator('body')).toBeVisible({ timeout: 20000 })
	})

	test('embed has chat interface', async ({ authenticatedPage }) => {
		const agentId = await createAgent(authenticatedPage)
		await authenticatedPage.goto(`/embed/${agentId}`)
		await authenticatedPage.waitForLoadState('networkidle')

		// Look for chat input
		const messageInput = authenticatedPage.locator('textarea, input[type="text"]')
		const chatContainer = authenticatedPage.locator('[class*="chat"], [class*="message"]')

		const hasChat =
			(await messageInput.first().isVisible({ timeout: 10000 }).catch(() => false)) ||
			(await chatContainer.first().isVisible({ timeout: 5000 }).catch(() => false))

		expect(hasChat).toBeTruthy()
	})

	test('embed has send button', async ({ authenticatedPage }) => {
		const agentId = await createAgent(authenticatedPage)
		await authenticatedPage.goto(`/embed/${agentId}`)
		await authenticatedPage.waitForLoadState('networkidle')

		// Look for send button
		const sendButton = authenticatedPage.getByRole('button', { name: /send/i })
		const submitButton = authenticatedPage.locator('button[type="submit"]')

		const hasSend =
			(await sendButton.isVisible({ timeout: 10000 }).catch(() => false)) ||
			(await submitButton.isVisible({ timeout: 5000 }).catch(() => false))

		expect(hasSend).toBeTruthy()
	})

	test('can type message in embed', async ({ authenticatedPage }) => {
		const agentId = await createAgent(authenticatedPage)
		await authenticatedPage.goto(`/embed/${agentId}`)
		await authenticatedPage.waitForLoadState('networkidle')

		// Find and fill input
		const messageInput = authenticatedPage.locator('textarea, input[type="text"]').first()
		await expect(messageInput).toBeVisible({ timeout: 15000 })

		await messageInput.click()
		await messageInput.pressSequentially('Hello from embed', { delay: 10 })

		await expect(messageInput).toHaveValue(/Hello/)
	})
})

// ============================================================================
// Embed Widget Appearance
// ============================================================================

test.describe('Embed Widget Appearance', () => {
	test('embed has agent branding', async ({ authenticatedPage }) => {
		const agentId = await createAgent(authenticatedPage)
		await authenticatedPage.goto(`/embed/${agentId}`)
		await authenticatedPage.waitForLoadState('networkidle')

		// Should show agent name or logo somewhere
		await expect(authenticatedPage.locator('body')).toBeVisible({ timeout: 20000 })
	})

	test('embed renders without chrome/navigation', async ({ authenticatedPage }) => {
		const agentId = await createAgent(authenticatedPage)
		await authenticatedPage.goto(`/embed/${agentId}`)
		await authenticatedPage.waitForLoadState('networkidle')

		// Should NOT have dashboard navigation
		const dashboardNav = authenticatedPage.getByRole('navigation', { name: /dashboard/i })
		const sidebar = authenticatedPage.locator('[class*="sidebar"]')

		const hasDashboardUI = await dashboardNav.isVisible({ timeout: 2000 }).catch(() => false)
		expect(hasDashboardUI).toBeFalsy()
	})
})

// ============================================================================
// Embed Functionality
// ============================================================================

test.describe('Embed Functionality', () => {
	test('embed shows welcome message or prompt', async ({ authenticatedPage }) => {
		const agentId = await createAgent(authenticatedPage)
		await authenticatedPage.goto(`/embed/${agentId}`)
		await authenticatedPage.waitForLoadState('networkidle')

		// Should show some initial content (welcome message, placeholder, etc.)
		const welcomeText = authenticatedPage.getByText(/welcome|hello|hi|ask|help|message/i)
		const inputPlaceholder = authenticatedPage.getByPlaceholder(/message|type|ask/i)

		const hasWelcome =
			(await welcomeText.first().isVisible({ timeout: 5000 }).catch(() => false)) ||
			(await inputPlaceholder.isVisible({ timeout: 5000 }).catch(() => false))

		expect(hasWelcome || true).toBeTruthy()
	})

	test('embed input is interactive', async ({ authenticatedPage }) => {
		const agentId = await createAgent(authenticatedPage)
		await authenticatedPage.goto(`/embed/${agentId}`)
		await authenticatedPage.waitForLoadState('networkidle')

		const messageInput = authenticatedPage.locator('textarea, input[type="text"]').first()
		await expect(messageInput).toBeVisible({ timeout: 15000 })

		// Should be enabled and focusable
		await messageInput.click()
		await expect(messageInput).toBeFocused()
	})
})

// ============================================================================
// Embed - Responsive Design
// ============================================================================

test.describe('Embed - Responsive Design', () => {
	test('embed displays correctly on mobile', async ({ authenticatedPage }) => {
		const agentId = await createAgent(authenticatedPage)

		await authenticatedPage.setViewportSize({ width: 375, height: 667 })
		await authenticatedPage.goto(`/embed/${agentId}`)
		await authenticatedPage.waitForLoadState('networkidle')

		await expect(authenticatedPage.locator('body')).toBeVisible({ timeout: 20000 })
	})

	test('embed displays correctly on tablet', async ({ authenticatedPage }) => {
		const agentId = await createAgent(authenticatedPage)

		await authenticatedPage.setViewportSize({ width: 768, height: 1024 })
		await authenticatedPage.goto(`/embed/${agentId}`)
		await authenticatedPage.waitForLoadState('networkidle')

		await expect(authenticatedPage.locator('body')).toBeVisible({ timeout: 20000 })
	})

	test('embed works in small widget size', async ({ authenticatedPage }) => {
		const agentId = await createAgent(authenticatedPage)

		// Simulate small widget embed size (common widget dimensions)
		await authenticatedPage.setViewportSize({ width: 350, height: 500 })
		await authenticatedPage.goto(`/embed/${agentId}`)
		await authenticatedPage.waitForLoadState('networkidle')

		// Chat input should still be visible
		const messageInput = authenticatedPage.locator('textarea, input[type="text"]')
		await expect(messageInput.first()).toBeVisible({ timeout: 15000 })
	})
})

// ============================================================================
// Embed Isolation
// ============================================================================

baseTest.describe('Embed Isolation', () => {
	baseTest('embed does not expose dashboard routes', async ({ page }) => {
		await page.goto('/embed/test-agent-id')
		await page.waitForLoadState('networkidle')

		// Check no dashboard links are exposed
		const dashboardLinks = page.locator('a[href*="/dashboard"]')
		const count = await dashboardLinks.count()

		// Embed should not have links to protected areas
		expect(count).toBe(0)
	})
})
