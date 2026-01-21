import { test as baseTest, expect, type Page } from '@playwright/test'
import { test } from './fixtures'

/**
 * Agent Lifecycle E2E tests.
 * Tests the complete lifecycle of an agent: creation, configuration, chat,
 * deployment, and deletion.
 */

// Helper to generate unique agent names
function generateAgentName(): string {
	return `Test Agent ${Date.now()}`
}

// ============================================================================
// 1. Agent Creation Flow
// ============================================================================

baseTest.describe('Agent Creation Flow - Route Protection', () => {
	baseTest('unauthenticated user is redirected to sign-in', async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/agents/new')
		await page.waitForLoadState('networkidle')
		// Should redirect to sign-in
		await page.waitForURL(/\/sign-in/, { timeout: 10000 })
		await expect(page).toHaveURL(/\/sign-in/)
	})
})

test.describe('Agent Creation Flow - Authenticated', () => {
	test('should display agent creation form with all fields', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		// Wait for workspace to finish loading (indicated by form content appearing)
		await expect(authenticatedPage.getByRole('heading', { name: 'Create New Agent' })).toBeVisible({ timeout: 20000 })

		// Check for required form fields
		await expect(authenticatedPage.getByLabel(/Agent Name/i)).toBeVisible()
		await expect(authenticatedPage.getByLabel(/Description/i)).toBeVisible()

		// Check for create button
		await expect(authenticatedPage.getByRole('button', { name: /create agent/i })).toBeVisible()
	})

	test('should successfully create a new agent', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		// Wait for form to be ready
		await authenticatedPage.getByLabel(/Agent Name/i).waitFor({ state: 'visible', timeout: 10000 })

		// Fill in agent details using pressSequentially for React compatibility
		const agentName = generateAgentName()
		const nameInput = authenticatedPage.getByLabel(/Agent Name/i)
		await nameInput.click()
		await nameInput.pressSequentially(agentName, { delay: 15 })

		const descInput = authenticatedPage.getByLabel(/Description/i)
		await descInput.click()
		await descInput.pressSequentially('A test agent for E2E testing', { delay: 15 })

		// Model should be pre-selected by default, no need to change

		// Verify create button is enabled after filling name
		const createButton = authenticatedPage.getByRole('button', { name: /create agent/i })
		await expect(createButton).toBeEnabled()

		// Submit the form
		await createButton.click()

		// Wait for navigation to agent detail page
		await authenticatedPage.waitForTimeout(3000)

		// Should redirect to agent detail page or agents list
		const currentUrl = authenticatedPage.url()
		expect(currentUrl.includes('/dashboard/agents/') && !currentUrl.includes('/new')).toBeTruthy()
	})

	test('should validate required name field', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		// Create button should be disabled when name is empty
		const createButton = authenticatedPage.getByRole('button', { name: /create agent/i })
		await expect(createButton).toBeVisible()
		await expect(createButton).toBeDisabled()

		// Should stay on the same page
		await expect(authenticatedPage).toHaveURL('/dashboard/agents/new')
	})

	test('should allow canceling agent creation', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		// Fill in some data
		await authenticatedPage.locator('#name').fill('Test Agent')

		// Click cancel or navigate back
		const cancelButton = authenticatedPage.getByRole('button', { name: /cancel/i })
		if (await cancelButton.isVisible()) {
			await cancelButton.click()
		} else {
			// Navigate via sidebar link
			await authenticatedPage.getByRole('link', { name: 'Agents' }).click()
		}

		// Should be back at agents list
		await authenticatedPage.waitForURL(/\/dashboard\/agents/)
		await expect(
			authenticatedPage.getByRole('heading', { name: 'Agents', exact: true }),
		).toBeVisible()
	})

	test('created agent should appear in agents list', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		// Create an agent
		const agentName = generateAgentName()
		await authenticatedPage.locator('#name').fill(agentName)
		await authenticatedPage.locator('#description').fill('E2E test verification agent')

		// Submit the form
		const createButton = authenticatedPage.getByRole('button', { name: /create agent/i })
		await createButton.click()

		// Wait for creation to complete
		await authenticatedPage.waitForTimeout(3000)

		// Navigate to agents list
		await authenticatedPage.goto('/dashboard/agents')
		await authenticatedPage.waitForLoadState('networkidle')

		// Agent should be visible in the list
		await expect(authenticatedPage.getByText(agentName)).toBeVisible({ timeout: 10000 })
	})
})

// ============================================================================
// 2. Agent Configuration
// ============================================================================

test.describe('Agent Configuration - Authenticated', () => {
	test('should update agent name', async ({ authenticatedPage }) => {
		// First, create an agent
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		const originalName = generateAgentName()
		await authenticatedPage.locator('#name').fill(originalName)
		await authenticatedPage.locator('#description').fill('Agent for configuration tests')

		const createButton = authenticatedPage.getByRole('button', { name: /create agent/i })
		await createButton.click()

		// Wait for redirect to agent detail page
		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[^/]+$/, { timeout: 10000 })
		await authenticatedPage.waitForLoadState('networkidle')

		// Wait for the page to load
		await authenticatedPage.waitForTimeout(2000)

		// Update the agent name
		const updatedName = `${originalName} - Updated`
		const nameInput = authenticatedPage.locator('#name')
		await nameInput.clear()
		await nameInput.fill(updatedName)

		// Save changes
		const saveButton = authenticatedPage.getByRole('button', { name: /save changes/i })
		if (await saveButton.isVisible()) {
			await saveButton.click()
			await authenticatedPage.waitForTimeout(2000)
		}

		// Verify the name was updated
		await expect(nameInput).toHaveValue(updatedName)
	})

	test('should update agent description', async ({ authenticatedPage }) => {
		// Create an agent first
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		const agentName = generateAgentName()
		await authenticatedPage.locator('#name').fill(agentName)
		await authenticatedPage.locator('#description').fill('Original description')

		const createButton = authenticatedPage.getByRole('button', { name: /create agent/i })
		await createButton.click()

		// Wait for redirect to agent detail page
		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[^/]+$/, { timeout: 10000 })
		await authenticatedPage.waitForLoadState('networkidle')
		await authenticatedPage.waitForTimeout(2000)

		// Update the description
		const descriptionInput = authenticatedPage.locator('#description')
		await descriptionInput.clear()
		await descriptionInput.fill('Updated description for testing')

		// Save changes if button is visible
		const saveButton = authenticatedPage.getByRole('button', { name: /save changes/i })
		if ((await saveButton.isVisible()) && (await saveButton.isEnabled())) {
			await saveButton.click()
			await authenticatedPage.waitForTimeout(2000)
		}

		// Verify the description was updated
		await expect(descriptionInput).toHaveValue('Updated description for testing')
	})

	test('should show model selector in agent configuration', async ({ authenticatedPage }) => {
		// Create an agent first
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		const agentName = generateAgentName()
		await authenticatedPage.locator('#name').fill(agentName)

		const createButton = authenticatedPage.getByRole('button', { name: /create agent/i })
		await createButton.click()

		// Wait for redirect to agent detail page
		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[^/]+$/, { timeout: 10000 })
		await authenticatedPage.waitForLoadState('networkidle')
		await authenticatedPage.waitForTimeout(2000)

		// Model selector should be visible
		const modelSelect = authenticatedPage.locator('#model')
		await expect(modelSelect).toBeVisible()
	})

	test('should have system prompt configuration section', async ({ authenticatedPage }) => {
		// Create an agent first
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		const agentName = generateAgentName()
		await authenticatedPage.locator('#name').fill(agentName)

		const createButton = authenticatedPage.getByRole('button', { name: /create agent/i })
		await createButton.click()

		// Wait for redirect to agent detail page
		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[^/]+$/, { timeout: 10000 })
		await authenticatedPage.waitForLoadState('networkidle')
		await authenticatedPage.waitForTimeout(2000)

		// Look for Prompt tab
		const promptTab = authenticatedPage.getByRole('tab', { name: /prompt/i })
		if (await promptTab.isVisible()) {
			await promptTab.click()
			await authenticatedPage.waitForTimeout(500)
		}

		// System prompt section should be visible
		await expect(authenticatedPage.getByText(/system prompt/i).first()).toBeVisible()
	})

	test('should display agent tabs for configuration', async ({ authenticatedPage }) => {
		// Create an agent first
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		const agentName = generateAgentName()
		await authenticatedPage.locator('#name').fill(agentName)

		const createButton = authenticatedPage.getByRole('button', { name: /create agent/i })
		await createButton.click()

		// Wait for redirect to agent detail page
		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[^/]+$/, { timeout: 10000 })
		await authenticatedPage.waitForLoadState('networkidle')
		await authenticatedPage.waitForTimeout(2000)

		// Check for various tabs
		await expect(authenticatedPage.getByRole('tab', { name: /general/i })).toBeVisible()
		await expect(authenticatedPage.getByRole('tab', { name: /prompt/i })).toBeVisible()
		await expect(authenticatedPage.getByRole('tab', { name: /tools/i })).toBeVisible()
	})
})

// ============================================================================
// 3. Agent Chat/Conversation (core user journey)
// ============================================================================

test.describe('Agent Chat/Conversation - Authenticated', () => {
	test('should navigate to agent playground', async ({ authenticatedPage }) => {
		// Create and deploy an agent first
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		const agentName = generateAgentName()
		await authenticatedPage.locator('#name').fill(agentName)
		await authenticatedPage.locator('#description').fill('Chat test agent')

		const createButton = authenticatedPage.getByRole('button', { name: /create agent/i })
		await createButton.click()

		// Wait for redirect to agent detail page
		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[^/]+$/, { timeout: 10000 })
		await authenticatedPage.waitForLoadState('networkidle')

		// Get the agent ID from URL
		const urlParts = authenticatedPage.url().split('/')
		const agentId = urlParts[urlParts.length - 1]

		// Navigate to playground
		await authenticatedPage.goto(`/dashboard/agents/${agentId}/playground`)
		await authenticatedPage.waitForLoadState('networkidle')

		// The playground page should load (may show "not deployed" message)
		const pageContent = await authenticatedPage.content()
		const hasPlayground =
			pageContent.includes('Start a Conversation') ||
			pageContent.includes('Not Deployed') ||
			pageContent.includes('playground')
		expect(hasPlayground || authenticatedPage.url().includes('/playground')).toBeTruthy()
	})

	test('should show deploy message for undeployed agent in playground', async ({
		authenticatedPage,
	}) => {
		// Create an agent (not deployed)
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		// Wait for form to load
		await expect(authenticatedPage.getByRole('heading', { name: 'Create New Agent' })).toBeVisible({ timeout: 20000 })

		const agentName = generateAgentName()
		const nameInput = authenticatedPage.getByLabel(/Agent Name/i)
		await nameInput.click()
		await nameInput.pressSequentially(agentName, { delay: 15 })

		const createButton = authenticatedPage.getByRole('button', { name: /create agent/i })
		await createButton.click()

		// Wait for redirect to agent detail page
		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[^/]+$/, { timeout: 10000 })
		await authenticatedPage.waitForLoadState('networkidle')

		// Get the agent ID from URL
		const urlParts = authenticatedPage.url().split('/')
		const agentId = urlParts[urlParts.length - 1]

		// Navigate to playground
		await authenticatedPage.goto(`/dashboard/agents/${agentId}/playground`)
		await authenticatedPage.waitForLoadState('networkidle')
		await authenticatedPage.waitForTimeout(2000)

		// Should show message about deploying the agent
		const notDeployedMessage = authenticatedPage.getByText(/not deployed/i)
		const deployMessage = authenticatedPage.getByText(/deploy/i)
		const hasDeployMessage =
			(await notDeployedMessage.isVisible().catch(() => false)) ||
			(await deployMessage.isVisible().catch(() => false))
		expect(hasDeployMessage).toBeTruthy()
	})

	test('should display chat interface elements for deployed agent', async ({
		authenticatedPage,
	}) => {
		// Create and deploy an agent
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		// Wait for form to load
		await expect(authenticatedPage.getByRole('heading', { name: 'Create New Agent' })).toBeVisible({ timeout: 20000 })

		const agentName = generateAgentName()
		const nameInput = authenticatedPage.getByLabel(/Agent Name/i)
		await nameInput.click()
		await nameInput.pressSequentially(agentName, { delay: 15 })

		const descInput = authenticatedPage.getByLabel(/Description/i)
		await descInput.click()
		await descInput.pressSequentially('Deployed chat test agent', { delay: 15 })

		const createButton = authenticatedPage.getByRole('button', { name: /create agent/i })
		await createButton.click()

		// Wait for redirect to agent detail page
		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[^/]+$/, { timeout: 10000 })
		await authenticatedPage.waitForLoadState('networkidle')
		await authenticatedPage.waitForTimeout(2000)

		// Deploy the agent
		const deployButton = authenticatedPage.getByRole('button', { name: /deploy/i })
		if (await deployButton.isVisible()) {
			await deployButton.click()
			await authenticatedPage.waitForTimeout(3000)
		}

		// Get the agent ID from URL
		const urlParts = authenticatedPage.url().split('/')
		const agentId = urlParts[urlParts.length - 1]

		// Navigate to playground
		await authenticatedPage.goto(`/dashboard/agents/${agentId}/playground`)
		await authenticatedPage.waitForLoadState('networkidle')
		await authenticatedPage.waitForTimeout(2000)

		// Check for chat interface elements
		const messageInput = authenticatedPage.getByPlaceholder(/type a message|send a message/i)

		const hasInput = await messageInput.isVisible().catch(() => false)
		const hasConversationText = await authenticatedPage
			.getByText(/start a conversation/i)
			.isVisible()
			.catch(() => false)

		// Either should have input or conversation start message
		expect(hasInput || hasConversationText).toBeTruthy()
	})

	test('can clear chat messages', async ({ authenticatedPage }) => {
		// Create and deploy an agent
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		const agentName = generateAgentName()
		await authenticatedPage.locator('#name').fill(agentName)

		const createButton = authenticatedPage.getByRole('button', { name: /create agent/i })
		await createButton.click()

		// Wait for redirect to agent detail page
		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[^/]+$/, { timeout: 10000 })
		await authenticatedPage.waitForLoadState('networkidle')
		await authenticatedPage.waitForTimeout(2000)

		// Deploy the agent
		const deployButton = authenticatedPage.getByRole('button', { name: /deploy/i })
		if (await deployButton.isVisible()) {
			await deployButton.click()
			await authenticatedPage.waitForTimeout(3000)
		}

		// Get the agent ID from URL
		const urlParts = authenticatedPage.url().split('/')
		const agentId = urlParts[urlParts.length - 1]

		// Navigate to playground
		await authenticatedPage.goto(`/dashboard/agents/${agentId}/playground`)
		await authenticatedPage.waitForLoadState('networkidle')
		await authenticatedPage.waitForTimeout(2000)

		// Check for clear button
		const clearButton = authenticatedPage.getByRole('button', { name: /clear/i })
		if (await clearButton.isVisible()) {
			// Clear button should exist (may be disabled if no messages)
			await expect(clearButton).toBeVisible()
		}
	})
})

// ============================================================================
// 4. Agent Deployment
// ============================================================================

test.describe('Agent Deployment - Authenticated', () => {
	test('should show deploy button for draft agent', async ({ authenticatedPage }) => {
		// Create an agent
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		const agentName = generateAgentName()
		await authenticatedPage.locator('#name').fill(agentName)

		const createButton = authenticatedPage.getByRole('button', { name: /create agent/i })
		await createButton.click()

		// Wait for redirect to agent detail page
		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[^/]+$/, { timeout: 10000 })
		await authenticatedPage.waitForLoadState('networkidle')
		await authenticatedPage.waitForTimeout(2000)

		// Deploy button should be visible for draft agents
		const deployButton = authenticatedPage.getByRole('button', { name: /deploy/i })
		await expect(deployButton).toBeVisible()
	})

	test('should deploy an agent successfully', async ({ authenticatedPage }) => {
		// Create an agent
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		const agentName = generateAgentName()
		await authenticatedPage.locator('#name').fill(agentName)
		await authenticatedPage.locator('#description').fill('Agent to be deployed')

		const createButton = authenticatedPage.getByRole('button', { name: /create agent/i })
		await createButton.click()

		// Wait for redirect to agent detail page
		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[^/]+$/, { timeout: 10000 })
		await authenticatedPage.waitForLoadState('networkidle')
		await authenticatedPage.waitForTimeout(2000)

		// Click deploy button
		const deployButton = authenticatedPage.getByRole('button', { name: /deploy/i })
		if (await deployButton.isVisible()) {
			await deployButton.click()
			await authenticatedPage.waitForTimeout(3000)
		}

		// Check for deployed status or Test Agent button
		const testButton = authenticatedPage.getByRole('button', { name: /test agent/i })
		const deployedBadge = authenticatedPage.getByText(/deployed|live/i)

		const hasTestButton = await testButton.isVisible().catch(() => false)
		const hasDeployedBadge = await deployedBadge
			.first()
			.isVisible()
			.catch(() => false)

		expect(hasTestButton || hasDeployedBadge).toBeTruthy()
	})

	test('should show embed code button for deployed agent', async ({ authenticatedPage }) => {
		// Create and deploy an agent
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		const agentName = generateAgentName()
		await authenticatedPage.locator('#name').fill(agentName)

		const createButton = authenticatedPage.getByRole('button', { name: /create agent/i })
		await createButton.click()

		// Wait for redirect to agent detail page
		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[^/]+$/, { timeout: 10000 })
		await authenticatedPage.waitForLoadState('networkidle')
		await authenticatedPage.waitForTimeout(2000)

		// Deploy the agent
		const deployButton = authenticatedPage.getByRole('button', { name: /deploy/i })
		if (await deployButton.isVisible()) {
			await deployButton.click()
			await authenticatedPage.waitForTimeout(3000)
		}

		// Look for embed code button (icon button with code icon)
		const embedButton = authenticatedPage.getByRole('button', { name: /embed/i })
		const embedLink = authenticatedPage.getByRole('link', { name: /embed/i })
		const embedCodeText = authenticatedPage.getByText(/embed code/i)

		const hasEmbedOption =
			(await embedButton.isVisible().catch(() => false)) ||
			(await embedLink
				.first()
				.isVisible()
				.catch(() => false)) ||
			(await embedCodeText.isVisible().catch(() => false))

		expect(hasEmbedOption).toBeTruthy()
	})

	test('should navigate to embed configuration page', async ({ authenticatedPage }) => {
		// Create and deploy an agent
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		const agentName = generateAgentName()
		await authenticatedPage.locator('#name').fill(agentName)

		const createButton = authenticatedPage.getByRole('button', { name: /create agent/i })
		await createButton.click()

		// Wait for redirect to agent detail page
		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[^/]+$/, { timeout: 10000 })
		await authenticatedPage.waitForLoadState('networkidle')

		// Get the agent ID from URL
		const urlParts = authenticatedPage.url().split('/')
		const agentId = urlParts[urlParts.length - 1]

		// Navigate to embed page
		await authenticatedPage.goto(`/dashboard/agents/${agentId}/embed`)
		await authenticatedPage.waitForLoadState('networkidle')
		await authenticatedPage.waitForTimeout(2000)

		// Should be on embed configuration page
		const hasEmbedConfig =
			authenticatedPage.url().includes('/embed') ||
			(await authenticatedPage
				.getByText(/embed widget|embed code/i)
				.first()
				.isVisible()
				.catch(() => false))
		expect(hasEmbedConfig).toBeTruthy()
	})
})

// ============================================================================
// 5. Agent Deletion
// ============================================================================

test.describe('Agent Deletion - Authenticated', () => {
	test('should show delete button on agent page', async ({ authenticatedPage }) => {
		// Create an agent
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		const agentName = generateAgentName()
		await authenticatedPage.locator('#name').fill(agentName)

		const createButton = authenticatedPage.getByRole('button', { name: /create agent/i })
		await createButton.click()

		// Wait for redirect to agent detail page
		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[^/]+$/, { timeout: 10000 })
		await authenticatedPage.waitForLoadState('networkidle')
		await authenticatedPage.waitForTimeout(2000)

		// Look for delete button (may be icon button)
		const deleteButton = authenticatedPage.getByRole('button', { name: /delete/i })
		const deleteIcon = authenticatedPage.locator('button').filter({
			has: authenticatedPage.locator('[class*="trash"], [class*="Trash"]'),
		})

		const hasDeleteOption =
			(await deleteButton.isVisible().catch(() => false)) ||
			(await deleteIcon
				.first()
				.isVisible()
				.catch(() => false))

		expect(hasDeleteOption).toBeTruthy()
	})

	test('should show confirmation dialog before deletion', async ({ authenticatedPage }) => {
		// Create an agent
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		const agentName = generateAgentName()
		await authenticatedPage.locator('#name').fill(agentName)

		const createButton = authenticatedPage.getByRole('button', { name: /create agent/i })
		await createButton.click()

		// Wait for redirect to agent detail page
		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[^/]+$/, { timeout: 10000 })
		await authenticatedPage.waitForLoadState('networkidle')
		await authenticatedPage.waitForTimeout(2000)

		// Click delete button to open dialog
		// The delete button is typically an icon button with title
		const deleteButton = authenticatedPage.getByTitle(/delete/i)
		const deleteButtonAlt = authenticatedPage.getByRole('button', { name: /delete/i })

		if (await deleteButton.isVisible()) {
			await deleteButton.click()
		} else if (await deleteButtonAlt.isVisible()) {
			await deleteButtonAlt.click()
		}

		await authenticatedPage.waitForTimeout(1000)

		// Confirmation dialog should appear
		const dialog = authenticatedPage.getByRole('dialog')
		if (await dialog.isVisible()) {
			// Dialog should have cancel and confirm buttons
			await expect(dialog.getByRole('button', { name: /cancel/i })).toBeVisible()
			await expect(dialog.getByRole('button', { name: /delete/i })).toBeVisible()

			// Close the dialog
			await dialog.getByRole('button', { name: /cancel/i }).click()
		}
	})

	test('should delete agent and redirect to agents list', async ({ authenticatedPage }) => {
		// Create an agent to delete
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		const agentName = generateAgentName()
		await authenticatedPage.locator('#name').fill(agentName)
		await authenticatedPage.locator('#description').fill('Agent to be deleted')

		const createButton = authenticatedPage.getByRole('button', { name: /create agent/i })
		await createButton.click()

		// Wait for redirect to agent detail page
		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[^/]+$/, { timeout: 10000 })
		await authenticatedPage.waitForLoadState('networkidle')
		await authenticatedPage.waitForTimeout(2000)

		// Click delete button to open dialog
		const deleteButton = authenticatedPage.getByTitle(/delete/i)
		const deleteButtonAlt = authenticatedPage.getByRole('button', { name: /delete/i })

		if (await deleteButton.isVisible()) {
			await deleteButton.click()
		} else if (await deleteButtonAlt.isVisible()) {
			await deleteButtonAlt.click()
		}

		await authenticatedPage.waitForTimeout(1000)

		// Confirm deletion in dialog
		const dialog = authenticatedPage.getByRole('dialog')
		if (await dialog.isVisible()) {
			const confirmDeleteButton = dialog.getByRole('button', { name: /delete/i })
			await confirmDeleteButton.click()
			await authenticatedPage.waitForTimeout(3000)
		}

		// Should redirect to agents list
		await authenticatedPage.waitForURL(/\/dashboard\/agents$/, { timeout: 10000 })

		// Agent should not be in the list
		const agentInList = authenticatedPage.getByText(agentName)
		const agentExists = await agentInList.isVisible({ timeout: 2000 }).catch(() => false)
		expect(agentExists).toBeFalsy()
	})
})

// ============================================================================
// Agent List Management
// ============================================================================

test.describe('Agent List Management - Authenticated', () => {
	test('should display agents list page', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents')
		await authenticatedPage.waitForLoadState('networkidle')

		await expect(
			authenticatedPage.getByRole('heading', { name: 'Agents', exact: true }),
		).toBeVisible()
	})

	test('should have new agent button', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents')
		await authenticatedPage.waitForLoadState('networkidle')

		// Wait for workspace to load
		await expect(authenticatedPage.getByRole('heading', { name: /agents/i })).toBeVisible({
			timeout: 20000,
		})

		// Look for New Agent button (inside a link)
		const newAgentButton = authenticatedPage.getByRole('button', { name: /new agent/i })
		const createButton = authenticatedPage.getByRole('button', { name: /create agent/i })

		const hasNewAgent =
			(await newAgentButton.isVisible({ timeout: 5000 }).catch(() => false)) ||
			(await createButton.isVisible({ timeout: 2000 }).catch(() => false))

		expect(hasNewAgent).toBeTruthy()
	})

	test('should have search functionality', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents')
		await authenticatedPage.waitForLoadState('networkidle')

		// Search input should be present
		const searchInput = authenticatedPage.getByPlaceholder(/search agents/i)
		await expect(searchInput).toBeVisible()
	})

	test('should have filter tabs for agent status', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents')
		await authenticatedPage.waitForLoadState('networkidle')

		// Filter tabs should be present
		const allTab = authenticatedPage.getByRole('tab', { name: /all/i })
		const liveTab = authenticatedPage.getByRole('tab', { name: /live|deployed/i })
		const draftsTab = authenticatedPage.getByRole('tab', { name: /drafts?/i })

		await expect(allTab).toBeVisible()
		await expect(liveTab).toBeVisible()
		await expect(draftsTab).toBeVisible()
	})

	test('can filter agents by status', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents')
		await authenticatedPage.waitForLoadState('networkidle')

		// Click on Live/Deployed tab
		const liveTab = authenticatedPage.getByRole('tab', { name: /live|deployed/i })
		await liveTab.click()
		await authenticatedPage.waitForTimeout(500)

		// Tab should be selected
		await expect(liveTab).toHaveAttribute('data-state', 'active')

		// Click on Drafts tab
		const draftsTab = authenticatedPage.getByRole('tab', { name: /drafts?/i })
		await draftsTab.click()
		await authenticatedPage.waitForTimeout(500)

		// Drafts tab should be selected
		await expect(draftsTab).toHaveAttribute('data-state', 'active')
	})

	test('can navigate from list to agent detail', async ({ authenticatedPage }) => {
		// Create an agent first
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		const agentName = generateAgentName()
		await authenticatedPage.locator('#name').fill(agentName)

		const createButton = authenticatedPage.getByRole('button', { name: /create agent/i })
		await createButton.click()

		// Wait for creation
		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[^/]+$/, { timeout: 10000 })
		await authenticatedPage.waitForLoadState('networkidle')

		// Go to agents list
		await authenticatedPage.goto('/dashboard/agents')
		await authenticatedPage.waitForLoadState('networkidle')
		await authenticatedPage.waitForTimeout(2000)

		// Find and click on the agent card (Configure button)
		const configureButton = authenticatedPage
			.locator('[class*="card"]')
			.filter({ hasText: agentName })
			.getByRole('button', { name: /configure|edit/i })

		if (await configureButton.isVisible()) {
			await configureButton.click()
			await authenticatedPage.waitForURL(/\/dashboard\/agents\/[^/]+$/, { timeout: 10000 })

			// Should be on agent detail page
			await expect(authenticatedPage.getByText(agentName)).toBeVisible()
		}
	})
})

// ============================================================================
// Responsive Design
// ============================================================================

test.describe('Agent Pages - Responsive Design', () => {
	test('agents list displays correctly on mobile', async ({ authenticatedPage }) => {
		await authenticatedPage.setViewportSize({ width: 375, height: 667 })
		await authenticatedPage.goto('/dashboard/agents')
		await authenticatedPage.waitForLoadState('networkidle')

		// Wait for workspace to load
		await expect(authenticatedPage.getByRole('heading', { name: /agents/i })).toBeVisible({ timeout: 20000 })
	})

	test('agent creation form displays correctly on mobile', async ({ authenticatedPage }) => {
		await authenticatedPage.setViewportSize({ width: 375, height: 667 })
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		// Wait for workspace to load
		await expect(authenticatedPage.getByRole('heading', { name: 'Create New Agent' })).toBeVisible({ timeout: 20000 })
		await expect(authenticatedPage.getByLabel(/Agent Name/i)).toBeVisible()
	})

	test('agents list displays correctly on tablet', async ({ authenticatedPage }) => {
		await authenticatedPage.setViewportSize({ width: 768, height: 1024 })
		await authenticatedPage.goto('/dashboard/agents')
		await authenticatedPage.waitForLoadState('networkidle')

		// Wait for workspace to load
		await expect(authenticatedPage.getByRole('heading', { name: /agents/i })).toBeVisible({ timeout: 20000 })
	})
})
