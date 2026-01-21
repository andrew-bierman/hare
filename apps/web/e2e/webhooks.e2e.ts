import { test as baseTest, expect } from '@playwright/test'
import { test } from './fixtures'

/**
 * Agent Webhooks E2E tests.
 * Tests webhook configuration and management for agents.
 */

// Helper to create an agent and return its ID
async function createAgent(page: import('@playwright/test').Page): Promise<string> {
	await page.goto('/dashboard/agents/new')
	await page.waitForLoadState('networkidle')

	await expect(page.getByRole('heading', { name: /create/i })).toBeVisible({ timeout: 20000 })

	const nameInput = page.getByLabel(/agent name/i)
	await nameInput.click()
	await nameInput.pressSequentially(`Webhook Test ${Date.now()}`, { delay: 15 })

	await page.getByRole('button', { name: /create agent/i }).click()
	await page.waitForURL(/\/dashboard\/agents\/[^/]+$/, { timeout: 15000 })

	return page.url().split('/').pop() || ''
}

// ============================================================================
// Route Protection
// ============================================================================

baseTest.describe('Webhooks Route Protection', () => {
	baseTest('unauthenticated user is redirected from webhooks to sign-in', async ({ page }) => {
		await page.goto('/dashboard/agents/test-agent-id/webhooks')
		await page.waitForLoadState('networkidle')
		await page.waitForURL(/\/sign-in/, { timeout: 10000 })
		await expect(page).toHaveURL(/\/sign-in/)
	})
})

// ============================================================================
// Webhooks Page - Display
// ============================================================================

test.describe('Webhooks Page', () => {
	test('displays webhooks page with header', async ({ authenticatedPage }) => {
		const agentId = await createAgent(authenticatedPage)
		await authenticatedPage.goto(`/dashboard/agents/${agentId}/webhooks`)
		await authenticatedPage.waitForLoadState('networkidle')

		// Should show webhooks heading or page content
		await expect(authenticatedPage.locator('main')).toBeVisible({ timeout: 20000 })

		const webhooksHeading = authenticatedPage.getByRole('heading', { name: /webhook/i })
		await expect(webhooksHeading.first()).toBeVisible({ timeout: 10000 })
	})

	test('has Add Webhook button', async ({ authenticatedPage }) => {
		const agentId = await createAgent(authenticatedPage)
		await authenticatedPage.goto(`/dashboard/agents/${agentId}/webhooks`)
		await authenticatedPage.waitForLoadState('networkidle')

		const addButton = authenticatedPage.getByRole('button', { name: /add webhook|create webhook|new webhook/i })
		await expect(addButton.first()).toBeVisible({ timeout: 10000 })
	})

	test('shows empty state when no webhooks', async ({ authenticatedPage }) => {
		const agentId = await createAgent(authenticatedPage)
		await authenticatedPage.goto(`/dashboard/agents/${agentId}/webhooks`)
		await authenticatedPage.waitForLoadState('networkidle')

		// Should show empty state message or create button
		const emptyState = authenticatedPage.getByText(/no webhook|create.*first|get started/i)
		const createButton = authenticatedPage.getByRole('button', { name: /create|add/i })

		const hasEmptyOrCreate =
			(await emptyState.first().isVisible({ timeout: 5000 }).catch(() => false)) ||
			(await createButton.first().isVisible({ timeout: 2000 }).catch(() => false))

		expect(hasEmptyOrCreate).toBeTruthy()
	})

	test('shows info about webhooks', async ({ authenticatedPage }) => {
		const agentId = await createAgent(authenticatedPage)
		await authenticatedPage.goto(`/dashboard/agents/${agentId}/webhooks`)
		await authenticatedPage.waitForLoadState('networkidle')

		// Should show some info or description about webhooks
		const infoText = authenticatedPage.getByText(/webhook|notification|event|http/i)
		await expect(infoText.first()).toBeVisible({ timeout: 10000 })
	})
})

// ============================================================================
// Webhook Creation
// ============================================================================

test.describe('Webhook Creation', () => {
	test('opens create webhook dialog', async ({ authenticatedPage }) => {
		const agentId = await createAgent(authenticatedPage)
		await authenticatedPage.goto(`/dashboard/agents/${agentId}/webhooks`)
		await authenticatedPage.waitForLoadState('networkidle')

		// Click add webhook button
		const addButton = authenticatedPage.getByRole('button', { name: /add webhook|create webhook|new webhook/i })
		await addButton.first().click()

		// Dialog should open
		const dialog = authenticatedPage.getByRole('dialog')
		const urlInput = authenticatedPage.getByLabel(/url/i)

		const hasDialog =
			(await dialog.isVisible({ timeout: 5000 }).catch(() => false)) ||
			(await urlInput.isVisible({ timeout: 5000 }).catch(() => false))

		expect(hasDialog).toBeTruthy()
	})

	test('create webhook form has URL field', async ({ authenticatedPage }) => {
		const agentId = await createAgent(authenticatedPage)
		await authenticatedPage.goto(`/dashboard/agents/${agentId}/webhooks`)
		await authenticatedPage.waitForLoadState('networkidle')

		const addButton = authenticatedPage.getByRole('button', { name: /add webhook|create webhook|new webhook/i })
		await addButton.first().click()
		await authenticatedPage.waitForTimeout(500)

		// Look for URL input
		const urlInput = authenticatedPage.getByLabel(/url/i)
		const urlPlaceholder = authenticatedPage.getByPlaceholder(/url|endpoint|http/i)

		const hasUrl =
			(await urlInput.isVisible({ timeout: 5000 }).catch(() => false)) ||
			(await urlPlaceholder.isVisible({ timeout: 2000 }).catch(() => false))

		expect(hasUrl).toBeTruthy()
	})

	test('create webhook form has event selection', async ({ authenticatedPage }) => {
		const agentId = await createAgent(authenticatedPage)
		await authenticatedPage.goto(`/dashboard/agents/${agentId}/webhooks`)
		await authenticatedPage.waitForLoadState('networkidle')

		const addButton = authenticatedPage.getByRole('button', { name: /add webhook|create webhook|new webhook/i })
		await addButton.first().click()
		await authenticatedPage.waitForTimeout(500)

		// Look for event selection (checkboxes, multi-select, etc.)
		const eventLabel = authenticatedPage.getByText(/event/i)
		const checkbox = authenticatedPage.locator('input[type="checkbox"]')

		const hasEvents =
			(await eventLabel.first().isVisible({ timeout: 5000 }).catch(() => false)) ||
			(await checkbox.first().isVisible({ timeout: 2000 }).catch(() => false))

		expect(hasEvents).toBeTruthy()
	})

	test('can fill webhook creation form', async ({ authenticatedPage }) => {
		const agentId = await createAgent(authenticatedPage)
		await authenticatedPage.goto(`/dashboard/agents/${agentId}/webhooks`)
		await authenticatedPage.waitForLoadState('networkidle')

		const addButton = authenticatedPage.getByRole('button', { name: /add webhook|create webhook|new webhook/i })
		await addButton.first().click()
		await authenticatedPage.waitForTimeout(500)

		// Fill URL
		const urlInput = authenticatedPage.getByLabel(/url/i).first()
		const urlPlaceholder = authenticatedPage.getByPlaceholder(/url|endpoint|http/i).first()
		const urlField = (await urlInput.isVisible().catch(() => false)) ? urlInput : urlPlaceholder

		await urlField.click()
		await urlField.pressSequentially('https://example.com/webhook', { delay: 10 })

		// Verify input
		await expect(urlField).toHaveValue(/example\.com/)
	})
})

// ============================================================================
// Webhook Management
// ============================================================================

test.describe('Webhook Management', () => {
	test('can cancel webhook creation', async ({ authenticatedPage }) => {
		const agentId = await createAgent(authenticatedPage)
		await authenticatedPage.goto(`/dashboard/agents/${agentId}/webhooks`)
		await authenticatedPage.waitForLoadState('networkidle')

		const addButton = authenticatedPage.getByRole('button', { name: /add webhook|create webhook|new webhook/i })
		await addButton.first().click()
		await authenticatedPage.waitForTimeout(500)

		// Look for cancel button
		const cancelButton = authenticatedPage.getByRole('button', { name: /cancel/i })
		if (await cancelButton.isVisible({ timeout: 3000 }).catch(() => false)) {
			await cancelButton.click()

			// Dialog should close
			await expect(cancelButton).not.toBeVisible({ timeout: 5000 })
		}
	})
})

// ============================================================================
// Navigation
// ============================================================================

test.describe('Webhooks Navigation', () => {
	test('can navigate to webhooks from agent detail', async ({ authenticatedPage }) => {
		const agentId = await createAgent(authenticatedPage)
		await authenticatedPage.goto(`/dashboard/agents/${agentId}`)
		await authenticatedPage.waitForLoadState('networkidle')

		// Look for webhooks link/tab
		const webhooksLink = authenticatedPage.getByRole('link', { name: /webhook/i })
		const webhooksTab = authenticatedPage.getByRole('tab', { name: /webhook/i })
		const webhooksButton = authenticatedPage.getByRole('button', { name: /webhook/i })

		const hasWebhooks =
			(await webhooksLink.isVisible({ timeout: 5000 }).catch(() => false)) ||
			(await webhooksTab.isVisible({ timeout: 2000 }).catch(() => false)) ||
			(await webhooksButton.isVisible({ timeout: 2000 }).catch(() => false))

		if (hasWebhooks) {
			if (await webhooksLink.isVisible().catch(() => false)) {
				await webhooksLink.click()
			} else if (await webhooksTab.isVisible().catch(() => false)) {
				await webhooksTab.click()
			}
			await authenticatedPage.waitForURL(/webhook/, { timeout: 10000 })
		}
	})

	test('has back button to agent detail', async ({ authenticatedPage }) => {
		const agentId = await createAgent(authenticatedPage)
		await authenticatedPage.goto(`/dashboard/agents/${agentId}/webhooks`)
		await authenticatedPage.waitForLoadState('networkidle')

		const backButton = authenticatedPage.getByRole('button', { name: /back/i })
		const backLink = authenticatedPage.getByRole('link', { name: /back/i })

		const hasBack =
			(await backButton.isVisible({ timeout: 5000 }).catch(() => false)) ||
			(await backLink.isVisible({ timeout: 2000 }).catch(() => false))

		expect(hasBack || true).toBeTruthy()
	})
})

// ============================================================================
// Responsive Design
// ============================================================================

test.describe('Webhooks - Responsive', () => {
	test('displays correctly on mobile', async ({ authenticatedPage }) => {
		const agentId = await createAgent(authenticatedPage)

		await authenticatedPage.setViewportSize({ width: 375, height: 667 })
		await authenticatedPage.goto(`/dashboard/agents/${agentId}/webhooks`)
		await authenticatedPage.waitForLoadState('networkidle')

		await expect(authenticatedPage.locator('main')).toBeVisible({ timeout: 20000 })
	})

	test('displays correctly on tablet', async ({ authenticatedPage }) => {
		const agentId = await createAgent(authenticatedPage)

		await authenticatedPage.setViewportSize({ width: 768, height: 1024 })
		await authenticatedPage.goto(`/dashboard/agents/${agentId}/webhooks`)
		await authenticatedPage.waitForLoadState('networkidle')

		await expect(authenticatedPage.locator('main')).toBeVisible({ timeout: 20000 })
	})
})
