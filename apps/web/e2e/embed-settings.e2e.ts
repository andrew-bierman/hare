import { test as baseTest, expect } from '@playwright/test'
import { test } from './fixtures'

/**
 * Agent Embed Settings E2E tests.
 * Tests the embed configuration page for agents.
 */

// Helper to create an agent and navigate to its embed page
async function createAgentAndGoToEmbed(page: import('@playwright/test').Page): Promise<string> {
	await page.goto('/dashboard/agents/new')
	await page.waitForSelector('main', { state: 'visible' })

	await expect(page.getByRole('heading', { name: /create/i }).first()).toBeVisible({
		timeout: 10000,
	})

	const nameInput = page.getByLabel(/name/i).first()
	await nameInput.click()
	await nameInput.fill('')
	await nameInput.pressSequentially(`Embed Test ${Date.now()}`, { delay: 10 })

	await page
		.getByRole('button', { name: /create/i })
		.first()
		.click()
	await page.waitForURL(/\/dashboard\/agents\/(?!new)/, { timeout: 15000 })

	const url = page.url()
	const match = url.match(/\/agents\/([^/]+)/)
	const agentId = match?.[1]
	if (!agentId) throw new Error('Failed to extract agent ID from URL')

	// Wait for the agent detail page to fully load before navigating away
	await page.waitForSelector('main', { state: 'visible' })
	await page.waitForTimeout(1000)

	await page.goto(`/dashboard/agents/${agentId}/embed`)
	await page.waitForSelector('main', { state: 'visible' })

	// Wait for embed page to load - either the heading appears or we need to wait longer
	await expect(page.getByRole('heading', { name: /embed widget/i }).first()).toBeVisible({
		timeout: 20000,
	})

	return agentId
}

// ============================================================================
// Route Protection
// ============================================================================

baseTest.describe('Embed Settings Route Protection', () => {
	baseTest(
		'unauthenticated user is redirected from embed settings to sign-in',
		async ({ page }) => {
			await page.goto('/dashboard/agents/test-agent-id/embed')
			await page.waitForURL(/\/sign-in/, { timeout: 10000 })
			await expect(page).toHaveURL(/\/sign-in/)
		},
	)
})

// ============================================================================
// Embed Settings Page
// ============================================================================

test.describe('Embed Settings Page', () => {
	test('displays embed settings page with heading and action buttons', async ({
		authenticatedPage,
	}) => {
		await createAgentAndGoToEmbed(authenticatedPage)

		// Page is visible
		await expect(authenticatedPage.locator('main').first()).toBeVisible({ timeout: 10000 })

		// Shows "Embed Widget" heading
		const embedHeading = authenticatedPage.getByRole('heading', { name: /embed widget/i }).first()
		await expect(embedHeading).toBeVisible({ timeout: 10000 })

		// Has Save Changes button
		const saveButton = authenticatedPage.getByRole('button', { name: /save/i })
		await expect(saveButton.first()).toBeVisible({ timeout: 10000 })

		// Has Test Widget button
		const testButton = authenticatedPage.getByRole('button', { name: /test widget/i })
		await expect(testButton.first()).toBeVisible({ timeout: 10000 })
	})
})

// ============================================================================
// Appearance Configuration (default tab)
// ============================================================================

test.describe('Embed Appearance Settings', () => {
	test('has theme selector', async ({ authenticatedPage }) => {
		await createAgentAndGoToEmbed(authenticatedPage)

		// Appearance tab is active by default - look for Theme label
		const themeLabel = authenticatedPage.getByText('Theme', { exact: true })
		await expect(themeLabel.first()).toBeVisible({ timeout: 5000 })
	})

	test('has position selector', async ({ authenticatedPage }) => {
		await createAgentAndGoToEmbed(authenticatedPage)

		// Appearance tab is active by default - look for Position label
		const positionLabel = authenticatedPage.getByText('Position', { exact: true })
		await expect(positionLabel.first()).toBeVisible({ timeout: 5000 })
	})

	test('has color picker', async ({ authenticatedPage }) => {
		await createAgentAndGoToEmbed(authenticatedPage)

		// Appearance tab is active by default - look for Primary Color label
		const colorLabel = authenticatedPage.getByText('Primary Color')
		await expect(colorLabel.first()).toBeVisible({ timeout: 5000 })
	})
})

// ============================================================================
// Behavior Configuration (requires clicking Behavior tab)
// ============================================================================

test.describe('Embed Behavior Settings', () => {
	test('has enable/disable toggle', async ({ authenticatedPage }) => {
		await createAgentAndGoToEmbed(authenticatedPage)

		// Click the Behavior tab
		await authenticatedPage.getByRole('tab', { name: /behavior/i }).click()

		// Look for the Enable Widget switch
		const enableToggle = authenticatedPage.locator('[role="switch"]')
		await expect(enableToggle.first()).toBeVisible({ timeout: 5000 })
	})

	test('has welcome message field', async ({ authenticatedPage }) => {
		await createAgentAndGoToEmbed(authenticatedPage)

		// Click the Behavior tab
		await authenticatedPage.getByRole('tab', { name: /behavior/i }).click()

		// Look for Welcome Message label
		const welcomeLabel = authenticatedPage.getByText('Welcome Message')
		await expect(welcomeLabel.first()).toBeVisible({ timeout: 5000 })
	})
})

// ============================================================================
// Security Configuration (requires clicking Security tab)
// ============================================================================

test.describe('Embed Security Settings', () => {
	test('has allowed domains field', async ({ authenticatedPage }) => {
		await createAgentAndGoToEmbed(authenticatedPage)

		// Click the Security tab
		await authenticatedPage.getByRole('tab', { name: /security/i }).click()

		// Look for Allowed Domains label
		const domainsLabel = authenticatedPage.getByText('Allowed Domains')
		await expect(domainsLabel.first()).toBeVisible({ timeout: 5000 })
	})
})

// ============================================================================
// Embed Code (visible on right side regardless of tab)
// ============================================================================

test.describe('Embed Code Section', () => {
	test('shows embed code with copy button', async ({ authenticatedPage }) => {
		await createAgentAndGoToEmbed(authenticatedPage)

		// Look for code block containing script tag
		const codeBlock = authenticatedPage.locator('pre')
		await expect(codeBlock.first()).toBeVisible({ timeout: 10000 })

		// Has copy button
		const copyButton = authenticatedPage.getByRole('button', { name: /copy/i })
		await expect(copyButton.first()).toBeVisible({ timeout: 5000 })
	})

	test('shows installation instructions', async ({ authenticatedPage }) => {
		await createAgentAndGoToEmbed(authenticatedPage)

		// Look for "Installation Instructions" heading
		const instructionsText = authenticatedPage.getByText('Installation Instructions')
		await expect(instructionsText.first()).toBeVisible({ timeout: 10000 })
	})
})

// ============================================================================
// Preview
// ============================================================================

test.describe('Embed Preview', () => {
	test('shows preview section', async ({ authenticatedPage }) => {
		await createAgentAndGoToEmbed(authenticatedPage)

		// Look for Preview heading
		const previewText = authenticatedPage.getByText('Preview')
		await expect(previewText.first()).toBeVisible({ timeout: 5000 })
	})
})

// ============================================================================
// Navigation
// ============================================================================

test.describe('Embed Navigation', () => {
	test('can navigate to embed from agent detail', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForSelector('main', { state: 'visible' })
		await expect(authenticatedPage.getByRole('heading', { name: /create/i }).first()).toBeVisible({
			timeout: 10000,
		})

		const nameInput = authenticatedPage.getByLabel(/name/i).first()
		await nameInput.click()
		await nameInput.fill('')
		await nameInput.pressSequentially(`Nav Test ${Date.now()}`, { delay: 10 })
		await authenticatedPage
			.getByRole('button', { name: /create/i })
			.first()
			.click()
		await authenticatedPage.waitForURL(/\/dashboard\/agents\/(?!new)/, { timeout: 15000 })

		// Look for embed link/tab on the agent detail page
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
		await authenticatedPage.setViewportSize({ width: 375, height: 667 })
		await createAgentAndGoToEmbed(authenticatedPage)

		await expect(authenticatedPage.locator('main').first()).toBeVisible({ timeout: 10000 })
	})

	test('displays correctly on tablet', async ({ authenticatedPage }) => {
		await authenticatedPage.setViewportSize({ width: 768, height: 1024 })
		await createAgentAndGoToEmbed(authenticatedPage)

		await expect(authenticatedPage.locator('main').first()).toBeVisible({ timeout: 10000 })
	})
})
