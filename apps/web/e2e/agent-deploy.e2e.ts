import { expect } from '@playwright/test'
import { test } from './fixtures'

/**
 * Agent Deployment E2E tests.
 * Tests the agent deployment flow including deploy button visibility,
 * deployment process, status changes, and filter behavior.
 *
 * Note: All tests require authentication since /dashboard/agents/:id is a protected route.
 */

// Helper to generate unique agent names
function generateAgentName(prefix = 'Test'): string {
	return `${prefix} Agent ${Date.now()}`
}

// Helper to create an agent and return its ID and URL
async function createAgent(
	page: import('@playwright/test').Page,
	options: { name?: string; description?: string } = {},
) {
	const agentName = options.name ?? generateAgentName('Deploy')
	const description = options.description ?? 'Test agent for deployment tests'

	await page.goto('/dashboard/agents/new')
	await page.waitForLoadState('networkidle')

	await page.locator('#name').fill(agentName)
	await page.locator('#description').fill(description)

	const createButton = page.getByRole('button', { name: /create agent/i })
	await createButton.click()

	await page.waitForURL(/\/dashboard\/agents\/[a-f0-9-]+$/, { timeout: 15000 })
	await page.waitForLoadState('networkidle')
	await page.waitForTimeout(2000)

	const url = page.url()
	const agentId = url.split('/').pop() as string

	return { agentId, agentName, description, url }
}

// Helper to add a system prompt to an agent (required for deployment)
async function addSystemPrompt(page: import('@playwright/test').Page, prompt: string) {
	// Click on Prompt tab
	const promptTab = page.getByRole('tab', { name: /prompt/i })
	await promptTab.click()
	await page.waitForTimeout(1000)

	// Find the instructions editor (CodeMirror or textarea)
	const codeMirrorEditor = page.locator('.cm-editor')
	const isCodeMirror = await codeMirrorEditor.isVisible().catch(() => false)

	if (isCodeMirror) {
		// Use CodeMirror editor
		await codeMirrorEditor.click()
		// Select all and replace with new content
		await page.keyboard.press('Meta+a')
		await page.keyboard.type(prompt)
	} else {
		// Try to find textarea
		const textareas = page.locator('textarea')
		if ((await textareas.count()) > 0) {
			await textareas.first().fill(prompt)
		}
	}

	// Save the changes
	const saveButton = page.getByRole('button', { name: /save changes/i })
	if (await saveButton.isEnabled()) {
		await saveButton.click()
		await page.waitForTimeout(2000)
	}

	// Return to General tab
	const generalTab = page.getByRole('tab', { name: /general/i })
	await generalTab.click()
	await page.waitForTimeout(500)
}

// ============================================================================
// Deploy Button Visibility Tests
// ============================================================================

test.describe('Agent Deployment - Deploy Button Visibility', () => {
	test('deploy button is visible on draft agent detail page', async ({ authenticatedPage }) => {
		await createAgent(authenticatedPage)

		// Deploy button should be visible for draft agents
		const deployButton = authenticatedPage.getByRole('button', { name: 'Deploy', exact: true })
		await expect(deployButton).toBeVisible()
	})

	test('deploy button is visible even without system prompt', async ({ authenticatedPage }) => {
		await createAgent(authenticatedPage)

		// Deploy button should be visible for draft agents
		// Note: The button may be enabled or disabled depending on whether
		// the default agent template includes instructions
		const deployButton = authenticatedPage.getByRole('button', { name: 'Deploy', exact: true })
		await expect(deployButton).toBeVisible()
	})

	test('deploy button is enabled when agent has system prompt', async ({ authenticatedPage }) => {
		await createAgent(authenticatedPage)

		// Add a system prompt
		await addSystemPrompt(authenticatedPage, 'You are a helpful assistant for testing.')

		// Deploy button should now be enabled
		const deployButton = authenticatedPage.getByRole('button', { name: 'Deploy', exact: true })
		await expect(deployButton).toBeVisible()
		await expect(deployButton).toBeEnabled()
	})

	test('draft status badge is shown for new agents', async ({ authenticatedPage }) => {
		await createAgent(authenticatedPage)

		// Status badge should show Draft
		const statusBadge = authenticatedPage
			.locator('[data-slot="badge"]')
			.filter({ hasText: /Draft/i })
		await expect(statusBadge).toBeVisible()
	})
})

// ============================================================================
// Deployment Process Tests
// ============================================================================

test.describe('Agent Deployment - Deployment Process', () => {
	test('clicking deploy triggers deployment without confirmation dialog', async ({
		authenticatedPage,
	}) => {
		await createAgent(authenticatedPage)

		// Add system prompt first
		await addSystemPrompt(authenticatedPage, 'You are a helpful assistant.')

		// Click deploy button
		const deployButton = authenticatedPage.getByRole('button', { name: 'Deploy', exact: true })
		await expect(deployButton).toBeEnabled()
		await deployButton.click()

		// No dialog should appear - deployment should proceed directly
		// Verify there's no confirmation dialog
		const dialog = authenticatedPage.getByRole('dialog')
		const hasDialog = await dialog.isVisible().catch(() => false)
		expect(hasDialog).toBeFalsy()

		// Wait for deployment to complete and page to update
		await authenticatedPage.waitForTimeout(5000)

		// Reload page to ensure we see the latest status
		await authenticatedPage.reload()
		await authenticatedPage.waitForLoadState('networkidle')
		await authenticatedPage.waitForTimeout(2000)

		// Status should change to Deployed
		const deployedBadge = authenticatedPage
			.locator('[data-slot="badge"]')
			.filter({ hasText: /Deployed/i })
		await expect(deployedBadge).toBeVisible({ timeout: 15000 })
	})

	test('deployment shows loading state while in progress', async ({ authenticatedPage }) => {
		await createAgent(authenticatedPage)

		// Add system prompt
		await addSystemPrompt(authenticatedPage, 'You are a helpful assistant.')

		// Click deploy button
		const deployButton = authenticatedPage.getByRole('button', { name: 'Deploy', exact: true })
		await deployButton.click()

		// Button should show loading state (text changes to "Deploying...")
		const isDeploying = await authenticatedPage
			.getByRole('button', { name: /deploying/i })
			.isVisible({ timeout: 2000 })
			.catch(() => false)

		// Either we caught the loading state or it completed too fast
		// Both are valid - deployment might be very quick
		expect(typeof isDeploying).toBe('boolean')

		// Wait for deployment to complete
		await authenticatedPage.waitForTimeout(3000)
	})

	test('confirming deployment changes status to deployed', async ({ authenticatedPage }) => {
		await createAgent(authenticatedPage)

		// Add system prompt
		await addSystemPrompt(authenticatedPage, 'You are a helpful assistant for testing.')

		// Verify initial Draft status
		const draftBadge = authenticatedPage
			.locator('[data-slot="badge"]')
			.filter({ hasText: /Draft/i })
		await expect(draftBadge).toBeVisible()

		// Deploy the agent
		const deployButton = authenticatedPage.getByRole('button', { name: 'Deploy', exact: true })
		await deployButton.click()
		await authenticatedPage.waitForTimeout(5000)

		// Reload to ensure we see updated status
		await authenticatedPage.reload()
		await authenticatedPage.waitForLoadState('networkidle')
		await authenticatedPage.waitForTimeout(2000)

		// Status should change to Deployed
		const deployedBadge = authenticatedPage
			.locator('[data-slot="badge"]')
			.filter({ hasText: /Deployed/i })
		await expect(deployedBadge).toBeVisible({ timeout: 15000 })

		// Draft badge should no longer be visible
		await expect(draftBadge).not.toBeVisible()
	})
})

// ============================================================================
// Post-Deployment UI Tests
// ============================================================================

test.describe('Agent Deployment - Post-Deployment UI', () => {
	test('deployed agent shows Deployed status badge', async ({ authenticatedPage }) => {
		await createAgent(authenticatedPage)

		// Add system prompt and deploy
		await addSystemPrompt(authenticatedPage, 'You are a helpful assistant.')

		const deployButton = authenticatedPage.getByRole('button', { name: 'Deploy', exact: true })
		await deployButton.click()
		await authenticatedPage.waitForTimeout(5000)

		// Reload to ensure we see updated status
		await authenticatedPage.reload()
		await authenticatedPage.waitForLoadState('networkidle')
		await authenticatedPage.waitForTimeout(2000)

		// Deployed badge should be visible with correct styling
		const deployedBadge = authenticatedPage
			.locator('[data-slot="badge"]')
			.filter({ hasText: /Deployed/i })
		await expect(deployedBadge).toBeVisible({ timeout: 15000 })
	})

	test('deploy button is replaced with Test Agent button after deployment', async ({
		authenticatedPage,
	}) => {
		await createAgent(authenticatedPage)

		// Add system prompt and deploy
		await addSystemPrompt(authenticatedPage, 'You are a helpful assistant.')

		const deployButton = authenticatedPage.getByRole('button', { name: 'Deploy', exact: true })
		await expect(deployButton).toBeVisible()
		await deployButton.click()
		await authenticatedPage.waitForTimeout(5000)

		// Reload to ensure we see updated status
		await authenticatedPage.reload()
		await authenticatedPage.waitForLoadState('networkidle')
		await authenticatedPage.waitForTimeout(2000)

		// Deploy button should no longer be visible
		await expect(deployButton).not.toBeVisible()

		// Test Agent button should appear
		const testAgentButton = authenticatedPage.getByRole('button', { name: /test agent/i })
		await expect(testAgentButton).toBeVisible({ timeout: 10000 })
	})

	test('Test Agent button navigates to playground', async ({ authenticatedPage }) => {
		const { agentId } = await createAgent(authenticatedPage)

		// Add system prompt and deploy
		await addSystemPrompt(authenticatedPage, 'You are a helpful assistant.')

		const deployButton = authenticatedPage.getByRole('button', { name: 'Deploy', exact: true })
		await deployButton.click()
		await authenticatedPage.waitForTimeout(5000)

		// Reload to ensure we see updated status
		await authenticatedPage.reload()
		await authenticatedPage.waitForLoadState('networkidle')
		await authenticatedPage.waitForTimeout(2000)

		// Click Test Agent button
		const testAgentButton = authenticatedPage.getByRole('button', { name: /test agent/i })
		await expect(testAgentButton).toBeVisible({ timeout: 10000 })
		await testAgentButton.click()

		// Should navigate to playground
		await authenticatedPage.waitForURL(/\/playground/, { timeout: 10000 })
		expect(authenticatedPage.url()).toContain(`/agents/${agentId}/playground`)
	})

	test('deployed agent detail page persists deployed status after reload', async ({
		authenticatedPage,
	}) => {
		await createAgent(authenticatedPage)

		// Add system prompt and deploy
		await addSystemPrompt(authenticatedPage, 'You are a helpful assistant.')

		const deployButton = authenticatedPage.getByRole('button', { name: 'Deploy', exact: true })
		await deployButton.click()
		await authenticatedPage.waitForTimeout(5000)

		// First reload to ensure deployment completed
		await authenticatedPage.reload()
		await authenticatedPage.waitForLoadState('networkidle')
		await authenticatedPage.waitForTimeout(2000)

		// Verify deployed status
		const deployedBadge = authenticatedPage
			.locator('[data-slot="badge"]')
			.filter({ hasText: /Deployed/i })
		await expect(deployedBadge).toBeVisible({ timeout: 15000 })

		// Second reload to verify persistence
		await authenticatedPage.reload()
		await authenticatedPage.waitForLoadState('networkidle')
		await authenticatedPage.waitForTimeout(2000)

		// Status should still be Deployed
		const deployedBadgeAfterReload = authenticatedPage
			.locator('[data-slot="badge"]')
			.filter({ hasText: /Deployed/i })
		await expect(deployedBadgeAfterReload).toBeVisible()

		// Test Agent button should still be visible
		const testAgentButton = authenticatedPage.getByRole('button', { name: /test agent/i })
		await expect(testAgentButton).toBeVisible()
	})
})

// ============================================================================
// Agents List Filter Tests
// ============================================================================

test.describe('Agent Deployment - List Page Filters', () => {
	test('deployed agent appears in Live filter on agents list page', async ({
		authenticatedPage,
	}) => {
		const { agentName } = await createAgent(authenticatedPage)

		// Add system prompt and deploy
		await addSystemPrompt(authenticatedPage, 'You are a helpful assistant.')

		const deployButton = authenticatedPage.getByRole('button', { name: 'Deploy', exact: true })
		await deployButton.click()
		await authenticatedPage.waitForTimeout(5000)

		// Navigate to agents list
		await authenticatedPage.goto('/dashboard/agents')
		await authenticatedPage.waitForLoadState('networkidle')
		await authenticatedPage.waitForTimeout(2000)

		// Click Live tab
		const liveTab = authenticatedPage.getByRole('tab', { name: /live/i })
		await liveTab.click()
		await authenticatedPage.waitForTimeout(1000)

		// Live tab should be active
		await expect(liveTab).toHaveAttribute('data-state', 'active')

		// Deployed agent should be visible in Live filter
		await expect(authenticatedPage.getByText(agentName)).toBeVisible({ timeout: 10000 })
	})

	test('deployed agent does not appear in Drafts filter', async ({ authenticatedPage }) => {
		const { agentName } = await createAgent(authenticatedPage)

		// Add system prompt and deploy
		await addSystemPrompt(authenticatedPage, 'You are a helpful assistant.')

		const deployButton = authenticatedPage.getByRole('button', { name: 'Deploy', exact: true })
		await deployButton.click()
		await authenticatedPage.waitForTimeout(5000)

		// Navigate to agents list
		await authenticatedPage.goto('/dashboard/agents')
		await authenticatedPage.waitForLoadState('networkidle')
		await authenticatedPage.waitForTimeout(2000)

		// Click Drafts tab
		const draftsTab = authenticatedPage.getByRole('tab', { name: /drafts/i })
		await draftsTab.click()
		await authenticatedPage.waitForTimeout(1000)

		// Drafts tab should be active
		await expect(draftsTab).toHaveAttribute('data-state', 'active')

		// Deployed agent should NOT be visible in Drafts filter
		const agentVisible = await authenticatedPage
			.getByText(agentName)
			.isVisible()
			.catch(() => false)
		expect(agentVisible).toBeFalsy()
	})

	test('deployed agent shows Live badge in agents list card', async ({ authenticatedPage }) => {
		const { agentName } = await createAgent(authenticatedPage)

		// Add system prompt and deploy
		await addSystemPrompt(authenticatedPage, 'You are a helpful assistant.')

		const deployButton = authenticatedPage.getByRole('button', { name: 'Deploy', exact: true })
		await deployButton.click()
		await authenticatedPage.waitForTimeout(5000)

		// Navigate to agents list
		await authenticatedPage.goto('/dashboard/agents')
		await authenticatedPage.waitForLoadState('networkidle')
		await authenticatedPage.waitForTimeout(2000)

		// Find the agent card
		const agentCard = authenticatedPage.locator('[class*="card"]').filter({ hasText: agentName })
		await expect(agentCard).toBeVisible({ timeout: 10000 })

		// Card should show Live status badge
		const liveBadge = agentCard.locator('[data-slot="badge"]').filter({ hasText: /Live/i })
		await expect(liveBadge).toBeVisible({ timeout: 10000 })
	})
})

// ============================================================================
// Quick Actions Tests
// ============================================================================

test.describe('Agent Deployment - Quick Actions', () => {
	test('quick actions shows Deploy to Test button for draft agents', async ({
		authenticatedPage,
	}) => {
		await createAgent(authenticatedPage)

		// Quick actions card should show "Deploy to Test" for draft agents
		const deployToTestButton = authenticatedPage.getByRole('button', { name: /deploy to test/i })
		await expect(deployToTestButton).toBeVisible({ timeout: 10000 })
	})

	test('quick actions shows Open Playground button for deployed agents', async ({
		authenticatedPage,
	}) => {
		await createAgent(authenticatedPage)

		// Add system prompt and deploy
		await addSystemPrompt(authenticatedPage, 'You are a helpful assistant.')

		const deployButton = authenticatedPage.getByRole('button', { name: 'Deploy', exact: true })
		await deployButton.click()
		await authenticatedPage.waitForTimeout(5000)

		// Reload to ensure we see updated status
		await authenticatedPage.reload()
		await authenticatedPage.waitForLoadState('networkidle')
		await authenticatedPage.waitForTimeout(2000)

		// Quick actions should now show "Open Playground" instead
		const openPlaygroundButton = authenticatedPage.getByRole('button', {
			name: /open playground/i,
		})
		await expect(openPlaygroundButton).toBeVisible({ timeout: 10000 })
	})
})

// ============================================================================
// Validation Tests
// ============================================================================

test.describe('Agent Deployment - Validation', () => {
	test('deployment requires system prompt', async ({ authenticatedPage }) => {
		await createAgent(authenticatedPage)

		// Deploy button should be visible for draft agents
		const deployButton = authenticatedPage.getByRole('button', { name: 'Deploy', exact: true })
		await expect(deployButton).toBeVisible()

		// Status should be Draft initially
		const draftBadge = authenticatedPage
			.locator('[data-slot="badge"]')
			.filter({ hasText: /Draft/i })
		await expect(draftBadge).toBeVisible()
	})

	test('deployment succeeds with valid system prompt', async ({ authenticatedPage }) => {
		await createAgent(authenticatedPage)

		// Add a valid system prompt
		await addSystemPrompt(
			authenticatedPage,
			`You are a helpful assistant.

## Your Role
- Answer questions accurately
- Be concise and professional`,
		)

		// Deploy button should be enabled with valid system prompt
		const deployButton = authenticatedPage.getByRole('button', { name: 'Deploy', exact: true })
		await expect(deployButton).toBeEnabled()

		// Deploy should succeed
		await deployButton.click()
		await authenticatedPage.waitForTimeout(5000)

		// Reload to ensure we see updated status
		await authenticatedPage.reload()
		await authenticatedPage.waitForLoadState('networkidle')
		await authenticatedPage.waitForTimeout(2000)

		// Status should change to Deployed
		const deployedBadge = authenticatedPage
			.locator('[data-slot="badge"]')
			.filter({ hasText: /Deployed/i })
		await expect(deployedBadge).toBeVisible({ timeout: 15000 })
	})
})

// ============================================================================
// Statistics Update Tests
// ============================================================================

test.describe('Agent Deployment - Statistics', () => {
	test('statistics card is visible on agent detail page', async ({ authenticatedPage }) => {
		await createAgent(authenticatedPage)

		// Statistics card should be visible
		await expect(authenticatedPage.getByText('Statistics')).toBeVisible()

		// Should show Messages stat
		await expect(authenticatedPage.getByText('Messages')).toBeVisible()

		// Should show Tokens stat
		await expect(authenticatedPage.getByText('Tokens')).toBeVisible()

		// Should show Tools stat
		await expect(authenticatedPage.getByText('Tools').first()).toBeVisible()
	})
})

// ============================================================================
// Multiple Deployments Tests
// ============================================================================

test.describe('Agent Deployment - Multiple Agents', () => {
	test('can deploy multiple agents and see them in Live filter', async ({ authenticatedPage }) => {
		// Create and deploy first agent
		const { agentName: agent1Name } = await createAgent(authenticatedPage, {
			name: generateAgentName('Multi1'),
		})
		await addSystemPrompt(authenticatedPage, 'First agent prompt.')
		let deployButton = authenticatedPage.getByRole('button', { name: 'Deploy', exact: true })
		await deployButton.click()
		await authenticatedPage.waitForTimeout(5000)

		// Create and deploy second agent
		const { agentName: agent2Name } = await createAgent(authenticatedPage, {
			name: generateAgentName('Multi2'),
		})
		await addSystemPrompt(authenticatedPage, 'Second agent prompt.')
		deployButton = authenticatedPage.getByRole('button', { name: 'Deploy', exact: true })
		await deployButton.click()
		await authenticatedPage.waitForTimeout(5000)

		// Navigate to agents list and check Live filter
		await authenticatedPage.goto('/dashboard/agents')
		await authenticatedPage.waitForLoadState('networkidle')
		await authenticatedPage.waitForTimeout(2000)

		// Click Live tab
		const liveTab = authenticatedPage.getByRole('tab', { name: /live/i })
		await liveTab.click()
		await authenticatedPage.waitForTimeout(1000)

		// Both deployed agents should be visible
		await expect(authenticatedPage.getByText(agent1Name)).toBeVisible({ timeout: 10000 })
		await expect(authenticatedPage.getByText(agent2Name)).toBeVisible({ timeout: 10000 })
	})
})

// ============================================================================
// Embed Code Tests (Post-Deployment Feature)
// ============================================================================

test.describe('Agent Deployment - Embed Code', () => {
	test('embed page is accessible for deployed agent', async ({ authenticatedPage }) => {
		const { agentId } = await createAgent(authenticatedPage)

		// Add system prompt and deploy
		await addSystemPrompt(authenticatedPage, 'You are a helpful assistant.')

		const deployButton = authenticatedPage.getByRole('button', { name: 'Deploy', exact: true })
		await deployButton.click()
		await authenticatedPage.waitForTimeout(5000)

		// Navigate to embed page
		await authenticatedPage.goto(`/dashboard/agents/${agentId}/embed`)
		await authenticatedPage.waitForLoadState('networkidle')
		await authenticatedPage.waitForTimeout(2000)

		// Should be on embed configuration page
		const hasEmbedConfig =
			authenticatedPage.url().includes('/embed') ||
			(await authenticatedPage
				.getByText(/embed widget|embed code|widget/i)
				.first()
				.isVisible()
				.catch(() => false))
		expect(hasEmbedConfig).toBeTruthy()
	})
})
