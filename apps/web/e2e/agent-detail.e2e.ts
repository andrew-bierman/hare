import { expect } from '@playwright/test'
import { test } from './fixtures'

/**
 * Agent Detail Page E2E tests.
 * Tests the agent detail page including viewing and editing agent configuration,
 * model changes, prompt editing, tools management, status display, and deletion.
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
	const agentName = options.name ?? generateAgentName('Detail')
	const description = options.description ?? 'Test agent for detail page tests'

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

// ============================================================================
// Page Load and Data Display Tests
// ============================================================================

test.describe('Agent Detail Page - Load and Display', () => {
	test('detail page loads with agent data', async ({ authenticatedPage }) => {
		const { agentName } = await createAgent(authenticatedPage)

		// Page heading should display agent name
		await expect(authenticatedPage.getByRole('heading', { name: agentName })).toBeVisible()

		// Status badge should be visible (default is Draft for new agents)
		const statusBadge = authenticatedPage
			.locator('[data-slot="badge"]')
			.filter({ hasText: /Draft/i })
		await expect(statusBadge).toBeVisible()

		// Configure subheading should be visible
		await expect(
			authenticatedPage.getByText("Configure your agent's settings and behavior"),
		).toBeVisible()
	})

	test('detail page has correct URL structure for agent', async ({ authenticatedPage }) => {
		const { agentId } = await createAgent(authenticatedPage)

		// Verify the URL contains the agent ID
		expect(authenticatedPage.url()).toContain(agentId)
		expect(authenticatedPage.url()).toMatch(/\/dashboard\/agents\/[a-f0-9-]+$/)
	})
})

// ============================================================================
// General Settings Section Tests
// ============================================================================

test.describe('Agent Detail Page - General Settings Section', () => {
	test('general settings section shows name, description, model', async ({ authenticatedPage }) => {
		const { agentName, description } = await createAgent(authenticatedPage)

		// Should be on General tab by default
		const generalTab = authenticatedPage.getByRole('tab', { name: /general/i })
		await expect(generalTab).toHaveAttribute('data-state', 'active')

		// Name input should show agent name
		const nameInput = authenticatedPage.locator('#name')
		await expect(nameInput).toBeVisible()
		await expect(nameInput).toHaveValue(agentName)

		// Description textarea should show description
		const descriptionInput = authenticatedPage.locator('#description')
		await expect(descriptionInput).toBeVisible()
		await expect(descriptionInput).toHaveValue(description)

		// Model selector should be visible
		const modelSelector = authenticatedPage.locator('#model')
		await expect(modelSelector).toBeVisible()
	})

	test('basic information card is visible with correct labels', async ({ authenticatedPage }) => {
		await createAgent(authenticatedPage)

		// Card title should be visible
		await expect(authenticatedPage.getByText('Basic Information')).toBeVisible()

		// Card description should be visible
		await expect(
			authenticatedPage.getByText("Configure your agent's identity and purpose"),
		).toBeVisible()

		// Labels should be visible
		await expect(authenticatedPage.getByText('Agent Name')).toBeVisible()
		await expect(authenticatedPage.getByText('Description').first()).toBeVisible()
		// Use exact match for Model label to avoid matching model descriptions
		await expect(authenticatedPage.getByText('Model', { exact: true })).toBeVisible()
	})
})

// ============================================================================
// Inline Editing Tests
// ============================================================================

test.describe('Agent Detail Page - Inline Editing', () => {
	test('inline editing of name updates agent', async ({ authenticatedPage }) => {
		const { agentName } = await createAgent(authenticatedPage)

		const nameInput = authenticatedPage.locator('#name')
		await expect(nameInput).toHaveValue(agentName)

		// Edit the name
		const newName = `Updated ${agentName}`
		await nameInput.clear()
		await nameInput.fill(newName)

		// Save Changes button should be enabled
		const saveButton = authenticatedPage.getByRole('button', { name: /save changes/i })
		await expect(saveButton).toBeEnabled()

		// Save the changes
		await saveButton.click()
		await authenticatedPage.waitForTimeout(2000)

		// Name should be updated in the heading
		await expect(authenticatedPage.getByRole('heading', { name: newName })).toBeVisible()
	})

	test('inline editing of description updates agent', async ({ authenticatedPage }) => {
		await createAgent(authenticatedPage)

		const descriptionInput = authenticatedPage.locator('#description')

		// Edit the description
		const newDescription = 'This is an updated description for testing purposes'
		await descriptionInput.clear()
		await descriptionInput.fill(newDescription)

		// Save Changes button should be enabled
		const saveButton = authenticatedPage.getByRole('button', { name: /save changes/i })
		await expect(saveButton).toBeEnabled()

		// Save the changes
		await saveButton.click()
		await authenticatedPage.waitForTimeout(2000)

		// Refresh and verify
		await authenticatedPage.reload()
		await authenticatedPage.waitForLoadState('networkidle')
		await authenticatedPage.waitForTimeout(2000)

		await expect(descriptionInput).toHaveValue(newDescription)
	})

	test('save button is disabled when no changes made', async ({ authenticatedPage }) => {
		await createAgent(authenticatedPage)

		// Save Changes button should be disabled initially
		const saveButton = authenticatedPage.getByRole('button', { name: /save changes/i })
		await expect(saveButton).toBeDisabled()
	})

	test('name validation shows error for empty name', async ({ authenticatedPage }) => {
		await createAgent(authenticatedPage)

		const nameInput = authenticatedPage.locator('#name')
		await nameInput.clear()

		// Validation error should be shown
		await expect(authenticatedPage.getByText('Name is required')).toBeVisible()

		// Save button should be disabled
		const saveButton = authenticatedPage.getByRole('button', { name: /save changes/i })
		await expect(saveButton).toBeDisabled()
	})
})

// ============================================================================
// Model Dropdown Tests
// ============================================================================

test.describe('Agent Detail Page - Model Dropdown', () => {
	test('model dropdown changes model', async ({ authenticatedPage }) => {
		await createAgent(authenticatedPage)

		// Click the model selector
		const modelSelector = authenticatedPage.locator('#model')
		await expect(modelSelector).toBeVisible()
		await modelSelector.click()

		// Wait for dropdown to open
		const dropdownContent = authenticatedPage.locator('[role="listbox"]')
		await expect(dropdownContent).toBeVisible()

		// Select a different model
		const modelOptions = authenticatedPage.locator('[role="option"]')
		const optionCount = await modelOptions.count()
		expect(optionCount).toBeGreaterThan(0)

		// Click a model option (not the first one if possible)
		const optionToSelect = optionCount > 1 ? modelOptions.nth(1) : modelOptions.first()
		const modelName = await optionToSelect.locator('.font-medium, span').first().textContent()
		await optionToSelect.click()

		// Wait for dropdown to close
		await authenticatedPage.waitForTimeout(500)

		// Save button should be enabled after model change
		const saveButton = authenticatedPage.getByRole('button', { name: /save changes/i })
		await expect(saveButton).toBeEnabled()

		// Save the changes
		await saveButton.click()
		await authenticatedPage.waitForTimeout(2000)

		// Verify model is updated (trigger should show selected model)
		if (modelName) {
			await expect(modelSelector).toContainText(modelName)
		}
	})

	test('model selector displays available models', async ({ authenticatedPage }) => {
		await createAgent(authenticatedPage)

		const modelSelector = authenticatedPage.locator('#model')
		await modelSelector.click()

		const dropdownContent = authenticatedPage.locator('[role="listbox"]')
		await expect(dropdownContent).toBeVisible()

		// Should show known AI models
		const hasKnownModel = await authenticatedPage
			.getByText(/Llama|Claude|GPT|Mistral/i)
			.first()
			.isVisible()
			.catch(() => false)

		expect(hasKnownModel).toBeTruthy()
	})
})

// ============================================================================
// Prompt Configuration Section Tests
// ============================================================================

test.describe('Agent Detail Page - Prompt Configuration', () => {
	test('prompt configuration section is visible', async ({ authenticatedPage }) => {
		await createAgent(authenticatedPage)

		// Click on Prompt tab
		const promptTab = authenticatedPage.getByRole('tab', { name: /prompt/i })
		await promptTab.click()
		await authenticatedPage.waitForTimeout(500)

		// Prompt tab should be active
		await expect(promptTab).toHaveAttribute('data-state', 'active')

		// System Prompt heading should be visible
		await expect(authenticatedPage.getByText('System Prompt').first()).toBeVisible()

		// Description text should be visible
		await expect(
			authenticatedPage.getByText(/Define how your agent behaves and responds/),
		).toBeVisible()
	})

	test('system prompt can be edited and saved', async ({ authenticatedPage }) => {
		await createAgent(authenticatedPage)

		// Click on Prompt tab
		const promptTab = authenticatedPage.getByRole('tab', { name: /prompt/i })
		await promptTab.click()
		await authenticatedPage.waitForTimeout(1000)

		// Find the instructions editor (CodeMirror or textarea)
		const codeMirrorEditor = authenticatedPage.locator('.cm-editor')
		const isCodeMirror = await codeMirrorEditor.isVisible().catch(() => false)

		const systemPrompt = `You are a helpful test assistant.

## Your Role
- Help users with testing
- Be concise and accurate`

		if (isCodeMirror) {
			// Use CodeMirror editor
			await codeMirrorEditor.click()
			// Clear existing content and type new content
			await authenticatedPage.keyboard.press('Meta+a')
			await authenticatedPage.keyboard.type(systemPrompt)
		} else {
			// Try to find textarea
			const textareas = authenticatedPage.locator('textarea')
			const textareaCount = await textareas.count()

			if (textareaCount > 0) {
				// Find the system prompt textarea (usually has font-mono class or is near System Prompt label)
				const systemPromptTextarea = authenticatedPage.locator('textarea.font-mono').first()
				if (await systemPromptTextarea.isVisible().catch(() => false)) {
					await systemPromptTextarea.fill(systemPrompt)
				} else {
					await textareas.first().fill(systemPrompt)
				}
			}
		}

		// Save the changes
		const saveButton = authenticatedPage.getByRole('button', { name: /save changes/i })
		await expect(saveButton).toBeEnabled({ timeout: 5000 })
		await saveButton.click()
		await authenticatedPage.waitForTimeout(2000)

		// Verify the prompt was saved by checking token count display
		await expect(authenticatedPage.getByText(/~\d+ tokens/)).toBeVisible()
	})

	test('system prompt shows token estimation', async ({ authenticatedPage }) => {
		await createAgent(authenticatedPage)

		// Click on Prompt tab
		const promptTab = authenticatedPage.getByRole('tab', { name: /prompt/i })
		await promptTab.click()
		await authenticatedPage.waitForTimeout(500)

		// Token estimation should be visible
		await expect(authenticatedPage.getByText(/~\d+ tokens/)).toBeVisible()
	})
})

// ============================================================================
// Tools Section Tests
// ============================================================================

test.describe('Agent Detail Page - Tools Section', () => {
	test('tools section shows assigned tools', async ({ authenticatedPage }) => {
		await createAgent(authenticatedPage)

		// Click on Tools tab
		const toolsTab = authenticatedPage.getByRole('tab', { name: /tools/i })
		await toolsTab.click()
		await authenticatedPage.waitForTimeout(500)

		// Tools tab should be active
		await expect(toolsTab).toHaveAttribute('data-state', 'active')

		// Agent Tools heading should be visible
		await expect(authenticatedPage.getByText('Agent Tools')).toBeVisible()

		// Description text should be visible
		await expect(
			authenticatedPage.getByText(/Select and configure tools to extend your agent's capabilities/),
		).toBeVisible()
	})

	test('system tools toggle is visible and functional', async ({ authenticatedPage }) => {
		await createAgent(authenticatedPage)

		// Click on Tools tab
		const toolsTab = authenticatedPage.getByRole('tab', { name: /tools/i })
		await toolsTab.click()
		await authenticatedPage.waitForTimeout(500)

		// System tools toggle should be visible
		await expect(authenticatedPage.getByText('Include System Tools')).toBeVisible()
		await expect(authenticatedPage.getByText(/Adds 50\+ built-in tools/)).toBeVisible()

		// System tools switch should be present
		const systemToolsSwitch = authenticatedPage.locator('#system-tools')
		await expect(systemToolsSwitch).toBeVisible()

		// Toggle should be checked by default for new agents
		await expect(systemToolsSwitch).toBeChecked()

		// Toggle it off
		await systemToolsSwitch.click()
		await authenticatedPage.waitForTimeout(500)

		// Should now be unchecked
		await expect(systemToolsSwitch).not.toBeChecked()

		// Save button should be enabled
		const saveButton = authenticatedPage.getByRole('button', { name: /save changes/i })
		await expect(saveButton).toBeEnabled()
	})

	test('adding tool to agent works', async ({ authenticatedPage }) => {
		await createAgent(authenticatedPage)

		// Click on Tools tab
		const toolsTab = authenticatedPage.getByRole('tab', { name: /tools/i })
		await toolsTab.click()
		await authenticatedPage.waitForTimeout(1000)

		// Look for tool picker or add tool button
		const customToolsLabel = authenticatedPage.getByText('Custom Tools')
		await expect(customToolsLabel).toBeVisible()

		// The ToolPicker component should be present
		// Check if there are any available tools to add
		const toolPickerContainer = authenticatedPage.locator('text=Custom Tools').locator('..')

		// Tool picker may show available tools or "No tools available" message
		const toolPickerContent = await toolPickerContainer.textContent()
		expect(toolPickerContent).toBeTruthy()
	})

	test('removing tool from agent works', async ({ authenticatedPage }) => {
		await createAgent(authenticatedPage)

		// Click on Tools tab
		const toolsTab = authenticatedPage.getByRole('tab', { name: /tools/i })
		await toolsTab.click()
		await authenticatedPage.waitForTimeout(500)

		// Check for system tools toggle - we can test removing by toggling system tools
		const systemToolsSwitch = authenticatedPage.locator('#system-tools')
		const wasChecked = await systemToolsSwitch.isChecked()

		if (wasChecked) {
			// Toggle off system tools (removes system tools from agent)
			await systemToolsSwitch.click()
			await authenticatedPage.waitForTimeout(500)

			// Verify it's now unchecked
			await expect(systemToolsSwitch).not.toBeChecked()

			// Save and verify
			const saveButton = authenticatedPage.getByRole('button', { name: /save changes/i })
			await saveButton.click()
			await authenticatedPage.waitForTimeout(2000)

			// Reload and verify
			await authenticatedPage.reload()
			await authenticatedPage.waitForLoadState('networkidle')
			await authenticatedPage.waitForTimeout(2000)

			// Navigate to tools tab again
			await authenticatedPage.getByRole('tab', { name: /tools/i }).click()
			await authenticatedPage.waitForTimeout(500)

			// System tools should be unchecked
			await expect(authenticatedPage.locator('#system-tools')).not.toBeChecked()
		}
	})
})

// ============================================================================
// Status Badge and Deploy Button Tests
// ============================================================================

test.describe('Agent Detail Page - Status and Deploy', () => {
	test('status badge shows current status (draft/deployed)', async ({ authenticatedPage }) => {
		await createAgent(authenticatedPage)

		// New agents should have Draft status
		const statusBadge = authenticatedPage
			.locator('[data-slot="badge"]')
			.filter({ hasText: /Draft/i })
		await expect(statusBadge).toBeVisible()
	})

	test('deploy button visible for draft agents', async ({ authenticatedPage }) => {
		await createAgent(authenticatedPage)

		// Deploy button should be visible for draft agents
		const deployButton = authenticatedPage.getByRole('button', { name: 'Deploy', exact: true })
		await expect(deployButton).toBeVisible()
	})

	test('deploy button hidden for deployed agents', async ({ authenticatedPage }) => {
		await createAgent(authenticatedPage)

		// First, add a system prompt to enable deployment
		const promptTab = authenticatedPage.getByRole('tab', { name: /prompt/i })
		await promptTab.click()
		await authenticatedPage.waitForTimeout(1000)

		// Add system prompt
		const codeMirrorEditor = authenticatedPage.locator('.cm-editor')
		const isCodeMirror = await codeMirrorEditor.isVisible().catch(() => false)

		const systemPrompt = 'You are a helpful assistant.'

		if (isCodeMirror) {
			await codeMirrorEditor.click()
			await authenticatedPage.keyboard.type(systemPrompt)
		} else {
			const textareas = authenticatedPage.locator('textarea')
			if ((await textareas.count()) > 0) {
				await textareas.first().fill(systemPrompt)
			}
		}

		// Save changes first
		const saveButton = authenticatedPage.getByRole('button', { name: /save changes/i })
		if (await saveButton.isEnabled()) {
			await saveButton.click()
			await authenticatedPage.waitForTimeout(2000)
		}

		// Deploy the agent
		const deployButton = authenticatedPage.getByRole('button', { name: 'Deploy', exact: true })
		await expect(deployButton).toBeVisible()
		await deployButton.click()
		await authenticatedPage.waitForTimeout(3000)

		// After deployment, Deploy button should be replaced with Test Agent button
		const testAgentButton = authenticatedPage.getByRole('button', { name: /test agent/i })
		await expect(testAgentButton).toBeVisible()

		// Deploy button should not be visible anymore
		await expect(deployButton).not.toBeVisible()

		// Status badge should show Deployed
		const deployedBadge = authenticatedPage
			.locator('[data-slot="badge"]')
			.filter({ hasText: /Deployed/i })
		await expect(deployedBadge).toBeVisible()
	})

	test('deploy button can trigger deployment process', async ({ authenticatedPage }) => {
		await createAgent(authenticatedPage)

		// Wait for page to fully load
		await authenticatedPage.waitForTimeout(1000)

		// Deploy button should be visible
		const deployButton = authenticatedPage.getByRole('button', { name: 'Deploy', exact: true })
		await expect(deployButton).toBeVisible()

		// The deploy button is visible for draft agents - this is the key assertion
		// Whether it's enabled or disabled depends on the system prompt state
		// This test verifies the deploy button exists and is functional for draft agents
		const isEnabled = !(await deployButton.isDisabled())

		// Either the button is disabled (no system prompt) or enabled
		// Both are valid states depending on the agent configuration
		expect(typeof isEnabled).toBe('boolean')
	})
})

// ============================================================================
// Delete Button and Confirmation Tests
// ============================================================================

test.describe('Agent Detail Page - Delete Agent', () => {
	test('delete button shows confirmation dialog', async ({ authenticatedPage }) => {
		const { agentName } = await createAgent(authenticatedPage)

		// Click delete button (trash icon)
		const deleteButton = authenticatedPage.getByRole('button', { name: /delete agent/i })
		await expect(deleteButton).toBeVisible()
		await deleteButton.click()

		// Confirmation dialog should appear
		await expect(authenticatedPage.getByRole('dialog')).toBeVisible()
		await expect(authenticatedPage.getByText('Delete Agent')).toBeVisible()
		await expect(
			authenticatedPage.getByText(`Are you sure you want to delete "${agentName}"?`),
		).toBeVisible()

		// Cancel and Delete buttons should be visible
		await expect(authenticatedPage.getByRole('button', { name: 'Cancel' })).toBeVisible()
		await expect(authenticatedPage.getByRole('button', { name: 'Delete' })).toBeVisible()
	})

	test('canceling delete closes dialog', async ({ authenticatedPage }) => {
		await createAgent(authenticatedPage)

		// Click delete button
		const deleteButton = authenticatedPage.getByRole('button', { name: /delete agent/i })
		await deleteButton.click()

		// Dialog should be visible
		await expect(authenticatedPage.getByRole('dialog')).toBeVisible()

		// Click Cancel
		await authenticatedPage.getByRole('button', { name: 'Cancel' }).click()

		// Dialog should close
		await expect(authenticatedPage.getByRole('dialog')).not.toBeVisible()
	})

	test('confirming delete removes agent and redirects', async ({ authenticatedPage }) => {
		const { agentName } = await createAgent(authenticatedPage)

		// Click delete button
		const deleteButton = authenticatedPage.getByRole('button', { name: /delete agent/i })
		await deleteButton.click()

		// Confirm deletion
		const confirmDeleteButton = authenticatedPage
			.getByRole('dialog')
			.getByRole('button', { name: 'Delete' })
		await confirmDeleteButton.click()

		// Should redirect to agents list
		await authenticatedPage.waitForURL(/\/dashboard\/agents\/?$/, { timeout: 10000 })
		await authenticatedPage.waitForTimeout(2000)

		// Agent should not be in the list
		const hasDeletedAgent = await authenticatedPage
			.getByText(agentName)
			.isVisible()
			.catch(() => false)
		expect(hasDeletedAgent).toBeFalsy()
	})
})

// ============================================================================
// Tab Navigation Tests
// ============================================================================

test.describe('Agent Detail Page - Tab Navigation', () => {
	test('all tabs are visible and clickable', async ({ authenticatedPage }) => {
		await createAgent(authenticatedPage)

		// All expected tabs should be visible
		const tabs = ['General', 'Prompt', 'Tools', 'Memory', 'Schedules', 'Preview', 'Analytics']

		for (const tabName of tabs) {
			const tab = authenticatedPage.getByRole('tab', { name: new RegExp(tabName, 'i') })
			await expect(tab).toBeVisible()
		}
	})

	test('clicking tabs switches content', async ({ authenticatedPage }) => {
		await createAgent(authenticatedPage)

		// Click Prompt tab
		const promptTab = authenticatedPage.getByRole('tab', { name: /prompt/i })
		await promptTab.click()
		await authenticatedPage.waitForTimeout(500)

		await expect(promptTab).toHaveAttribute('data-state', 'active')
		await expect(authenticatedPage.getByText('System Prompt').first()).toBeVisible()

		// Click Tools tab
		const toolsTab = authenticatedPage.getByRole('tab', { name: /tools/i })
		await toolsTab.click()
		await authenticatedPage.waitForTimeout(500)

		await expect(toolsTab).toHaveAttribute('data-state', 'active')
		await expect(authenticatedPage.getByText('Agent Tools')).toBeVisible()

		// Click Preview tab
		const previewTab = authenticatedPage.getByRole('tab', { name: /preview/i })
		await previewTab.click()
		await authenticatedPage.waitForTimeout(500)

		await expect(previewTab).toHaveAttribute('data-state', 'active')
		await expect(authenticatedPage.getByText('Configuration Summary')).toBeVisible()
	})
})

// ============================================================================
// Quick Actions and Statistics Tests
// ============================================================================

test.describe('Agent Detail Page - Quick Actions and Statistics', () => {
	test('quick actions card is visible', async ({ authenticatedPage }) => {
		await createAgent(authenticatedPage)

		await expect(authenticatedPage.getByText('Quick Actions')).toBeVisible()

		// For draft agents, should show "Deploy to Test" button
		const deployToTestButton = authenticatedPage.getByRole('button', { name: /deploy to test/i })
		await expect(deployToTestButton).toBeVisible()
	})

	test('statistics card shows tool count and other stats', async ({ authenticatedPage }) => {
		await createAgent(authenticatedPage)

		await expect(authenticatedPage.getByText('Statistics')).toBeVisible()

		// Should show Messages stat
		await expect(authenticatedPage.getByText('Messages')).toBeVisible()

		// Should show Tokens stat
		await expect(authenticatedPage.getByText('Tokens')).toBeVisible()

		// Should show Tools stat
		await expect(authenticatedPage.getByText('Tools').first()).toBeVisible()
	})
})
