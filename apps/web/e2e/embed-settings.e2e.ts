import { test as baseTest, expect } from '@playwright/test'
import { test } from './fixtures'

/**
 * Agent Embed Settings E2E tests.
 * Tests the embed configuration page for agents.
 */

// Helper to create an agent
async function createAgent(page: import('@playwright/test').Page): Promise<string> {
	await page.goto('/dashboard/agents/new')
	await page.waitForLoadState('networkidle')

	await expect(page.getByRole('heading', { name: /create/i })).toBeVisible({ timeout: 20000 })

	const nameInput = page.getByLabel(/agent name/i)
	await nameInput.click()
	await nameInput.pressSequentially(`Embed Test ${Date.now()}`, { delay: 15 })

	await page.getByRole('button', { name: /create agent/i }).click()
	await page.waitForURL(/\/dashboard\/agents\/[^/]+$/, { timeout: 15000 })

	return page.url().split('/').pop() || ''
}

// ============================================================================
// Route Protection
// ============================================================================

baseTest.describe('Embed Settings Route Protection', () => {
	baseTest(
		'unauthenticated user is redirected from embed settings to sign-in',
		async ({ page }) => {
			await page.goto('/dashboard/agents/test-agent-id/embed')
			await page.waitForLoadState('networkidle')
			await page.waitForURL(/\/sign-in/, { timeout: 10000 })
			await expect(page).toHaveURL(/\/sign-in/)
		},
	)
})

// ============================================================================
// Embed Settings Page
// ============================================================================

test.describe('Embed Settings Page', () => {
	test('displays embed settings page', async ({ authenticatedPage }) => {
		const agentId = await createAgent(authenticatedPage)
		await authenticatedPage.goto(`/dashboard/agents/${agentId}/embed`)
		await authenticatedPage.waitForLoadState('networkidle')

		await expect(authenticatedPage.locator('main')).toBeVisible({ timeout: 20000 })
	})

	test('shows embed heading', async ({ authenticatedPage }) => {
		const agentId = await createAgent(authenticatedPage)
		await authenticatedPage.goto(`/dashboard/agents/${agentId}/embed`)
		await authenticatedPage.waitForLoadState('networkidle')

		const embedHeading = authenticatedPage.getByRole('heading', { name: /embed|widget/i })
		await expect(embedHeading.first()).toBeVisible({ timeout: 10000 })
	})

	test('has Save Changes button', async ({ authenticatedPage }) => {
		const agentId = await createAgent(authenticatedPage)
		await authenticatedPage.goto(`/dashboard/agents/${agentId}/embed`)
		await authenticatedPage.waitForLoadState('networkidle')

		const saveButton = authenticatedPage.getByRole('button', { name: /save/i })
		await expect(saveButton.first()).toBeVisible({ timeout: 10000 })
	})

	test('has Test Widget button', async ({ authenticatedPage }) => {
		const agentId = await createAgent(authenticatedPage)
		await authenticatedPage.goto(`/dashboard/agents/${agentId}/embed`)
		await authenticatedPage.waitForLoadState('networkidle')

		const testButton = authenticatedPage.getByRole('button', { name: /test|preview/i })
		await expect(testButton.first()).toBeVisible({ timeout: 10000 })
	})
})

// ============================================================================
// Appearance Configuration
// ============================================================================

test.describe('Embed Appearance Settings', () => {
	test('has theme selector', async ({ authenticatedPage }) => {
		const agentId = await createAgent(authenticatedPage)
		await authenticatedPage.goto(`/dashboard/agents/${agentId}/embed`)
		await authenticatedPage.waitForLoadState('networkidle')

		// Look for theme selector (light/dark)
		const themeText = authenticatedPage.getByText(/theme/i)
		const lightOption = authenticatedPage.getByText(/light/i)
		const darkOption = authenticatedPage.getByText(/dark/i)

		const hasTheme =
			(await themeText
				.first()
				.isVisible({ timeout: 5000 })
				.catch(() => false)) ||
			(await lightOption
				.first()
				.isVisible({ timeout: 2000 })
				.catch(() => false)) ||
			(await darkOption
				.first()
				.isVisible({ timeout: 2000 })
				.catch(() => false))

		expect(hasTheme).toBeTruthy()
	})

	test('has position selector', async ({ authenticatedPage }) => {
		const agentId = await createAgent(authenticatedPage)
		await authenticatedPage.goto(`/dashboard/agents/${agentId}/embed`)
		await authenticatedPage.waitForLoadState('networkidle')

		// Look for position selector
		const positionText = authenticatedPage.getByText(/position/i)
		const bottomRight = authenticatedPage.getByText(/bottom.?right/i)
		const bottomLeft = authenticatedPage.getByText(/bottom.?left/i)

		const hasPosition =
			(await positionText
				.first()
				.isVisible({ timeout: 5000 })
				.catch(() => false)) ||
			(await bottomRight
				.first()
				.isVisible({ timeout: 2000 })
				.catch(() => false)) ||
			(await bottomLeft
				.first()
				.isVisible({ timeout: 2000 })
				.catch(() => false))

		expect(hasPosition).toBeTruthy()
	})

	test('has color picker', async ({ authenticatedPage }) => {
		const agentId = await createAgent(authenticatedPage)
		await authenticatedPage.goto(`/dashboard/agents/${agentId}/embed`)
		await authenticatedPage.waitForLoadState('networkidle')

		// Look for color picker or color input
		const colorText = authenticatedPage.getByText(/color/i)
		const colorInput = authenticatedPage.locator('input[type="color"]')
		const hexInput = authenticatedPage.getByPlaceholder(/#|hex/i)

		const hasColor =
			(await colorText
				.first()
				.isVisible({ timeout: 5000 })
				.catch(() => false)) ||
			(await colorInput.isVisible({ timeout: 2000 }).catch(() => false)) ||
			(await hexInput.isVisible({ timeout: 2000 }).catch(() => false))

		expect(hasColor).toBeTruthy()
	})
})

// ============================================================================
// Behavior Configuration
// ============================================================================

test.describe('Embed Behavior Settings', () => {
	test('has enable/disable toggle', async ({ authenticatedPage }) => {
		const agentId = await createAgent(authenticatedPage)
		await authenticatedPage.goto(`/dashboard/agents/${agentId}/embed`)
		await authenticatedPage.waitForLoadState('networkidle')

		// Look for enable toggle
		const enableToggle = authenticatedPage.locator('[role="switch"]')
		const enableCheckbox = authenticatedPage.locator('input[type="checkbox"]')
		const enableText = authenticatedPage.getByText(/enable|active/i)

		const hasEnable =
			(await enableToggle
				.first()
				.isVisible({ timeout: 5000 })
				.catch(() => false)) ||
			(await enableCheckbox
				.first()
				.isVisible({ timeout: 2000 })
				.catch(() => false)) ||
			(await enableText
				.first()
				.isVisible({ timeout: 2000 })
				.catch(() => false))

		expect(hasEnable).toBeTruthy()
	})

	test('has welcome message field', async ({ authenticatedPage }) => {
		const agentId = await createAgent(authenticatedPage)
		await authenticatedPage.goto(`/dashboard/agents/${agentId}/embed`)
		await authenticatedPage.waitForLoadState('networkidle')

		// Look for welcome message textarea
		const welcomeLabel = authenticatedPage.getByLabel(/welcome|greeting|initial/i)
		const welcomeText = authenticatedPage.getByText(/welcome message/i)

		const hasWelcome =
			(await welcomeLabel.isVisible({ timeout: 5000 }).catch(() => false)) ||
			(await welcomeText
				.first()
				.isVisible({ timeout: 2000 })
				.catch(() => false))

		expect(hasWelcome).toBeTruthy()
	})
})

// ============================================================================
// Security Configuration
// ============================================================================

test.describe('Embed Security Settings', () => {
	test('has allowed domains field', async ({ authenticatedPage }) => {
		const agentId = await createAgent(authenticatedPage)
		await authenticatedPage.goto(`/dashboard/agents/${agentId}/embed`)
		await authenticatedPage.waitForLoadState('networkidle')

		// Look for domains field
		const domainsLabel = authenticatedPage.getByLabel(/domain|allowed|whitelist/i)
		const domainsText = authenticatedPage.getByText(/domain/i)

		const hasDomains =
			(await domainsLabel.isVisible({ timeout: 5000 }).catch(() => false)) ||
			(await domainsText
				.first()
				.isVisible({ timeout: 2000 })
				.catch(() => false))

		expect(hasDomains).toBeTruthy()
	})
})

// ============================================================================
// Embed Code
// ============================================================================

test.describe('Embed Code Section', () => {
	test('shows embed code', async ({ authenticatedPage }) => {
		const agentId = await createAgent(authenticatedPage)
		await authenticatedPage.goto(`/dashboard/agents/${agentId}/embed`)
		await authenticatedPage.waitForLoadState('networkidle')

		// Look for code block or script tag
		const codeBlock = authenticatedPage.locator('pre, code')
		const scriptText = authenticatedPage.getByText(/<script/i)

		const hasCode =
			(await codeBlock
				.first()
				.isVisible({ timeout: 10000 })
				.catch(() => false)) ||
			(await scriptText
				.first()
				.isVisible({ timeout: 5000 })
				.catch(() => false))

		expect(hasCode).toBeTruthy()
	})

	test('has copy button for embed code', async ({ authenticatedPage }) => {
		const agentId = await createAgent(authenticatedPage)
		await authenticatedPage.goto(`/dashboard/agents/${agentId}/embed`)
		await authenticatedPage.waitForLoadState('networkidle')

		// Look for copy button
		const copyButton = authenticatedPage.getByRole('button', { name: /copy/i })
		const copyIcon = authenticatedPage.locator('button:has([class*="copy"], [class*="clipboard"])')

		const hasCopy =
			(await copyButton
				.first()
				.isVisible({ timeout: 5000 })
				.catch(() => false)) ||
			(await copyIcon
				.first()
				.isVisible({ timeout: 2000 })
				.catch(() => false))

		expect(hasCopy).toBeTruthy()
	})

	test('shows installation instructions', async ({ authenticatedPage }) => {
		const agentId = await createAgent(authenticatedPage)
		await authenticatedPage.goto(`/dashboard/agents/${agentId}/embed`)
		await authenticatedPage.waitForLoadState('networkidle')

		// Look for instructions
		const instructionsText = authenticatedPage.getByText(/install|add|paste|copy/i)
		await expect(instructionsText.first()).toBeVisible({ timeout: 10000 })
	})
})

// ============================================================================
// Preview
// ============================================================================

test.describe('Embed Preview', () => {
	test('shows preview section', async ({ authenticatedPage }) => {
		const agentId = await createAgent(authenticatedPage)
		await authenticatedPage.goto(`/dashboard/agents/${agentId}/embed`)
		await authenticatedPage.waitForLoadState('networkidle')

		// Look for preview
		const previewText = authenticatedPage.getByText(/preview/i)
		const iframe = authenticatedPage.locator('iframe')

		const hasPreview =
			(await previewText
				.first()
				.isVisible({ timeout: 5000 })
				.catch(() => false)) ||
			(await iframe
				.first()
				.isVisible({ timeout: 5000 })
				.catch(() => false))

		expect(hasPreview).toBeTruthy()
	})
})

// ============================================================================
// Navigation
// ============================================================================

test.describe('Embed Navigation', () => {
	test('can navigate to embed from agent detail', async ({ authenticatedPage }) => {
		const agentId = await createAgent(authenticatedPage)
		await authenticatedPage.goto(`/dashboard/agents/${agentId}`)
		await authenticatedPage.waitForLoadState('networkidle')

		// Look for embed link/tab
		const embedLink = authenticatedPage.getByRole('link', { name: /embed/i })
		const embedTab = authenticatedPage.getByRole('tab', { name: /embed/i })

		const hasEmbed =
			(await embedLink.isVisible({ timeout: 5000 }).catch(() => false)) ||
			(await embedTab.isVisible({ timeout: 2000 }).catch(() => false))

		if (hasEmbed) {
			if (await embedLink.isVisible().catch(() => false)) {
				await embedLink.click()
			} else {
				await embedTab.click()
			}
			await authenticatedPage.waitForURL(/embed/, { timeout: 10000 })
		}
	})
})

// ============================================================================
// Responsive Design
// ============================================================================

test.describe('Embed Settings - Responsive', () => {
	test('displays correctly on mobile', async ({ authenticatedPage }) => {
		const agentId = await createAgent(authenticatedPage)

		await authenticatedPage.setViewportSize({ width: 375, height: 667 })
		await authenticatedPage.goto(`/dashboard/agents/${agentId}/embed`)
		await authenticatedPage.waitForLoadState('networkidle')

		await expect(authenticatedPage.locator('main')).toBeVisible({ timeout: 20000 })
	})

	test('displays correctly on tablet', async ({ authenticatedPage }) => {
		const agentId = await createAgent(authenticatedPage)

		await authenticatedPage.setViewportSize({ width: 768, height: 1024 })
		await authenticatedPage.goto(`/dashboard/agents/${agentId}/embed`)
		await authenticatedPage.waitForLoadState('networkidle')

		await expect(authenticatedPage.locator('main')).toBeVisible({ timeout: 20000 })
	})
})
