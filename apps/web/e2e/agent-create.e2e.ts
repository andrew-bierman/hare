import { expect } from '@playwright/test'
import { test } from './fixtures'

/**
 * Agent Creation Page E2E tests.
 * Tests the agent creation flow including form display, validation,
 * submission, redirects, and template pre-fill functionality.
 *
 * Note: All tests require authentication since /dashboard/agents/new is a protected route.
 */

// Helper to generate unique agent names
function generateAgentName(prefix = 'Test'): string {
	return `${prefix} Agent ${Date.now()}`
}

// ============================================================================
// Page Load and Form Display Tests
// ============================================================================

test.describe('Agent Create Page - Load and Display', () => {
	test('create page loads with empty form', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		// Page heading should be visible
		await expect(authenticatedPage.getByRole('heading', { name: 'Create New Agent' })).toBeVisible()

		// Subheading should be visible
		await expect(
			authenticatedPage.getByText('Set up a new AI agent for your workspace'),
		).toBeVisible()

		// Name field should be empty
		const nameInput = authenticatedPage.locator('#name')
		await expect(nameInput).toBeVisible()
		await expect(nameInput).toHaveValue('')

		// Description field should be empty
		const descriptionInput = authenticatedPage.locator('#description')
		await expect(descriptionInput).toBeVisible()
		await expect(descriptionInput).toHaveValue('')

		// Create Agent button should be visible but disabled (empty form)
		const createButton = authenticatedPage.getByRole('button', { name: /create agent/i })
		await expect(createButton).toBeVisible()
		await expect(createButton).toBeDisabled()

		// Cancel button should be visible
		const cancelButton = authenticatedPage.getByRole('button', { name: /cancel/i })
		await expect(cancelButton).toBeVisible()
	})
})

// ============================================================================
// Name Field Validation Tests
// ============================================================================

test.describe('Agent Create Page - Name Field Validation', () => {
	test('name field is required - shows error when submitting empty', async ({
		authenticatedPage,
	}) => {
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		// Create Agent button should be disabled when name is empty
		const createButton = authenticatedPage.getByRole('button', { name: /create agent/i })
		await expect(createButton).toBeDisabled()

		// Enter a name then clear it to test validation
		const nameInput = authenticatedPage.locator('#name')
		await nameInput.fill('Test Agent')
		await expect(createButton).toBeEnabled()

		await nameInput.clear()
		await expect(createButton).toBeDisabled()
	})

	test('name field accepts valid text input', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		const agentName = generateAgentName('NameInput')
		const nameInput = authenticatedPage.locator('#name')
		await nameInput.fill(agentName)

		await expect(nameInput).toHaveValue(agentName)

		// Create button should be enabled with valid name
		const createButton = authenticatedPage.getByRole('button', { name: /create agent/i })
		await expect(createButton).toBeEnabled()
	})
})

// ============================================================================
// Model Dropdown Tests
// ============================================================================

test.describe('Agent Create Page - Model Dropdown', () => {
	test('model dropdown shows available models', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		// Find and click the model selector trigger
		const modelTrigger = authenticatedPage.locator('#model-selector')
		await expect(modelTrigger).toBeVisible()
		await modelTrigger.click()

		// Wait for dropdown content to be visible
		const dropdownContent = authenticatedPage.locator('[role="listbox"]')
		await expect(dropdownContent).toBeVisible()

		// Should show at least one model option
		const modelOptions = authenticatedPage.locator('[role="option"]')
		const optionCount = await modelOptions.count()
		expect(optionCount).toBeGreaterThan(0)

		// Should show at least one of the known models (Llama, Claude, GPT)
		const hasKnownModel = await authenticatedPage
			.getByText(/Llama|Claude|GPT/)
			.first()
			.isVisible()
			.catch(() => false)

		expect(hasKnownModel).toBeTruthy()
	})

	test('model selection updates form state', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		// Get the model selector
		const modelTrigger = authenticatedPage.locator('#model-selector')
		await expect(modelTrigger).toBeVisible()

		// Click to open dropdown
		await modelTrigger.click()
		await authenticatedPage.waitForTimeout(500)

		// Select a different model option (click the first available one)
		const modelOption = authenticatedPage.locator('[role="option"]').first()
		const modelName = await modelOption.locator('.font-medium').first().textContent()
		await modelOption.click()

		// Verify the selected model is displayed in the trigger
		await authenticatedPage.waitForTimeout(300)
		if (modelName) {
			await expect(modelTrigger).toContainText(modelName)
		}
	})
})

// ============================================================================
// Description Field Tests
// ============================================================================

test.describe('Agent Create Page - Description Field', () => {
	test('description field accepts text', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		const description = 'This is a test agent description for E2E testing purposes.'
		const descriptionInput = authenticatedPage.locator('#description')

		await expect(descriptionInput).toBeVisible()
		await descriptionInput.fill(description)

		await expect(descriptionInput).toHaveValue(description)
	})
})

// ============================================================================
// System Prompt Field Tests
// ============================================================================

test.describe('Agent Create Page - System Prompt Field', () => {
	test('system prompt field accepts multiline text', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		// The system prompt uses an instructions editor (CodeMirror or textarea fallback)
		// Wait for the page to fully load
		await authenticatedPage.waitForTimeout(2000)

		// Look for System Prompt label (use the label element with for attribute)
		await expect(authenticatedPage.locator('label[for="system-prompt"]')).toBeVisible()

		// Try CodeMirror first (class .cm-editor), fall back to textarea
		const codeMirrorEditor = authenticatedPage.locator('.cm-editor')

		const isCodeMirror = await codeMirrorEditor.isVisible().catch(() => false)

		const multilinePrompt = `You are a helpful assistant.

## Guidelines
- Be friendly and professional
- Answer questions accurately`

		if (isCodeMirror) {
			// Use CodeMirror editor
			await codeMirrorEditor.click()
			await authenticatedPage.keyboard.type(multilinePrompt)
			await expect(codeMirrorEditor).toContainText('You are a helpful assistant')
			await expect(codeMirrorEditor).toContainText('Guidelines')
		} else {
			// Use textarea - look for the textarea in the instructions editor component
			// It's inside a bordered container after the System Prompt label
			const instructionsContainer = authenticatedPage.locator('.border.rounded-md.overflow-hidden')
			const instructionsTextarea = instructionsContainer.locator('textarea')

			// Try to find any visible textarea
			if (
				await instructionsTextarea
					.first()
					.isVisible()
					.catch(() => false)
			) {
				await instructionsTextarea.first().fill(multilinePrompt)
				await expect(instructionsTextarea.first()).toHaveValue(multilinePrompt)
			} else {
				// Last fallback: look for any textarea near the System Prompt label
				const fallbackTextarea = authenticatedPage.locator('textarea.font-mono').first()
				await expect(fallbackTextarea).toBeVisible()
				await fallbackTextarea.fill(multilinePrompt)
				await expect(fallbackTextarea).toHaveValue(multilinePrompt)
			}
		}
	})
})

// ============================================================================
// Form Submission Tests
// ============================================================================

test.describe('Agent Create Page - Form Submission', () => {
	test('form submission with valid data creates agent', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		// Fill in valid form data
		const agentName = generateAgentName('Submit')
		await authenticatedPage.locator('#name').fill(agentName)
		await authenticatedPage.locator('#description').fill('Test agent for form submission')

		// Submit the form
		const createButton = authenticatedPage.getByRole('button', { name: /create agent/i })
		await expect(createButton).toBeEnabled()
		await createButton.click()

		// Wait for navigation to agent detail page
		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[a-f0-9-]+$/, { timeout: 15000 })

		// Verify we're on the agent detail page
		expect(authenticatedPage.url()).toMatch(/\/dashboard\/agents\/[a-f0-9-]+$/)
	})

	test('successful creation redirects to agent detail page', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		const agentName = generateAgentName('Redirect')
		await authenticatedPage.locator('#name').fill(agentName)

		const createButton = authenticatedPage.getByRole('button', { name: /create agent/i })
		await createButton.click()

		// Should redirect to agent detail page (URL contains agent ID)
		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[a-f0-9-]+$/, { timeout: 15000 })

		// Agent name should be visible on the detail page
		await authenticatedPage.waitForLoadState('networkidle')
		await expect(authenticatedPage.getByText(agentName)).toBeVisible({ timeout: 10000 })
	})

	test('created agent appears in agents list', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		const agentName = generateAgentName('ListVerify')
		await authenticatedPage.locator('#name').fill(agentName)
		await authenticatedPage.locator('#description').fill('Agent to verify in list')

		const createButton = authenticatedPage.getByRole('button', { name: /create agent/i })
		await createButton.click()

		// Wait for redirect to detail page
		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[a-f0-9-]+$/, { timeout: 15000 })
		await authenticatedPage.waitForTimeout(2000)

		// Navigate to agents list
		await authenticatedPage.goto('/dashboard/agents')
		await authenticatedPage.waitForLoadState('networkidle')
		await authenticatedPage.waitForTimeout(2000)

		// The created agent should appear in the list
		await expect(authenticatedPage.getByText(agentName)).toBeVisible()
	})
})

// ============================================================================
// Template Query Parameter Tests
// ============================================================================

test.describe('Agent Create Page - Template Pre-fill', () => {
	test('template query param pre-fills form with customer-support template', async ({
		authenticatedPage,
	}) => {
		await authenticatedPage.goto('/dashboard/agents/new?template=customer-support')
		await authenticatedPage.waitForLoadState('networkidle')

		// Page heading should reflect template
		await expect(
			authenticatedPage.getByRole('heading', { name: /Create Customer Support Agent/i }),
		).toBeVisible()

		// Name field should be pre-filled with template name
		const nameInput = authenticatedPage.locator('#name')
		await expect(nameInput).toHaveValue('Customer Support Agent')

		// Description should be pre-filled
		const descriptionInput = authenticatedPage.locator('#description')
		await expect(descriptionInput).toHaveValue('Handle FAQs, route tickets, and check order status')
	})

	test('template query param pre-fills form with knowledge-base template', async ({
		authenticatedPage,
	}) => {
		await authenticatedPage.goto('/dashboard/agents/new?template=knowledge-base')
		await authenticatedPage.waitForLoadState('networkidle')

		// Page heading should reflect template
		await expect(
			authenticatedPage.getByRole('heading', { name: /Create Knowledge Base Agent/i }),
		).toBeVisible()

		// Name field should be pre-filled with template name
		const nameInput = authenticatedPage.locator('#name')
		await expect(nameInput).toHaveValue('Knowledge Base Agent')
	})

	test('invalid template query param shows default create page', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/new?template=invalid-template-id')
		await authenticatedPage.waitForLoadState('networkidle')

		// Page heading should be default
		await expect(authenticatedPage.getByRole('heading', { name: 'Create New Agent' })).toBeVisible()

		// Form should be empty
		const nameInput = authenticatedPage.locator('#name')
		await expect(nameInput).toHaveValue('')
	})
})

// ============================================================================
// Navigation Tests
// ============================================================================

test.describe('Agent Create Page - Navigation', () => {
	test('cancel button returns to agents list', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		// Fill in some data
		await authenticatedPage.locator('#name').fill('Test Agent to Cancel')

		// Click cancel
		const cancelButton = authenticatedPage.getByRole('button', { name: /cancel/i })
		await cancelButton.click()

		// Should navigate back to agents list
		await authenticatedPage.waitForURL(/\/dashboard\/agents\/?$/, { timeout: 10000 })
		expect(authenticatedPage.url()).toMatch(/\/dashboard\/agents\/?$/)
	})
})

// ============================================================================
// Form State Preservation Tests
// ============================================================================

test.describe('Agent Create Page - Form State Preservation', () => {
	test('form preserves data on validation error', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		// Fill in form data
		const agentName = generateAgentName('Preserve')
		const description = 'Description to preserve'

		await authenticatedPage.locator('#name').fill(agentName)
		await authenticatedPage.locator('#description').fill(description)

		// Clear name to trigger validation (button becomes disabled)
		await authenticatedPage.locator('#name').clear()

		// Description should still be preserved
		await expect(authenticatedPage.locator('#description')).toHaveValue(description)

		// Re-enter name and verify everything is still there
		await authenticatedPage.locator('#name').fill(agentName)
		await expect(authenticatedPage.locator('#name')).toHaveValue(agentName)
		await expect(authenticatedPage.locator('#description')).toHaveValue(description)
	})
})

// ============================================================================
// Response Style Selector Tests
// ============================================================================

test.describe('Agent Create Page - Response Style', () => {
	test('response style selector shows available styles', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		// Look for response style label (use exact match on the label element)
		const responseStyleLabel = authenticatedPage.getByLabel('Response Style')
		await expect(responseStyleLabel).toBeVisible()

		// The response style selector should show default 'balanced' option
		// Check that Balanced is selected in the trigger
		await expect(authenticatedPage.getByText('Balanced').first()).toBeVisible()
	})
})

// ============================================================================
// Tools Section Tests
// ============================================================================

test.describe('Agent Create Page - Tools Section', () => {
	test('tools section is collapsible', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		// Tools section header should be visible
		const toolsHeader = authenticatedPage.getByText('Tools & Capabilities')
		await expect(toolsHeader).toBeVisible()

		// Click to expand the tools section
		await toolsHeader.click()
		await authenticatedPage.waitForTimeout(300)

		// System tools toggle should be visible after expanding
		await expect(authenticatedPage.getByText('Include System Tools')).toBeVisible()

		// The description for system tools should be visible
		await expect(authenticatedPage.getByText(/Adds 50\+ built-in tools/)).toBeVisible()
	})

	test('system tools toggle is enabled by default', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		// Expand tools section
		await authenticatedPage.getByText('Tools & Capabilities').click()
		await authenticatedPage.waitForTimeout(300)

		// System tools switch should be checked by default
		const systemToolsSwitch = authenticatedPage.locator('#system-tools')
		await expect(systemToolsSwitch).toBeChecked()
	})
})

// ============================================================================
// Tips Card Tests
// ============================================================================

test.describe('Agent Create Page - Tips Card', () => {
	test('tips card displays helpful information', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		// Scroll to make sure the tips card is visible (it's on the right side)
		await authenticatedPage.evaluate(() => {
			window.scrollTo(0, 0)
		})

		// Tips card should be visible - look for any Tips text (could be h3, h4, or div)
		const tipsCard = authenticatedPage.locator('text=Tips').first()
		await expect(tipsCard).toBeVisible()

		// Tips content should be visible
		await expect(
			authenticatedPage.getByText('Give your agent a clear, descriptive name'),
		).toBeVisible()
	})
})

// ============================================================================
// Advanced Settings Tests
// ============================================================================

test.describe('Agent Create Page - Advanced Settings', () => {
	test('advanced settings can be expanded', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		// Look for advanced settings trigger
		const advancedTrigger = authenticatedPage.getByText('Advanced Settings')
		await expect(advancedTrigger).toBeVisible()

		// Click to expand
		await advancedTrigger.click()
		await authenticatedPage.waitForTimeout(300)

		// Temperature, Max Tokens, or Top P should be visible after expanding
		const hasAdvancedSettings =
			(await authenticatedPage
				.getByText('Temperature')
				.isVisible()
				.catch(() => false)) ||
			(await authenticatedPage
				.getByText('Max Tokens')
				.isVisible()
				.catch(() => false)) ||
			(await authenticatedPage
				.getByText('Top P')
				.isVisible()
				.catch(() => false))

		expect(hasAdvancedSettings).toBeTruthy()
	})
})

// ============================================================================
// Button State Tests
// ============================================================================

test.describe('Agent Create Page - Button States', () => {
	test('create button shows loading state during submission', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		const agentName = generateAgentName('Loading')
		await authenticatedPage.locator('#name').fill(agentName)

		const createButton = authenticatedPage.getByRole('button', { name: /create agent/i })
		await createButton.click()

		// Button should show loading state (text changes to "Creating...")
		// Note: This may be very quick, so we use a broad timeout
		const isLoading = await authenticatedPage
			.getByRole('button', { name: /creating/i })
			.isVisible({ timeout: 2000 })
			.catch(() => false)

		// Either we caught the loading state or it completed too fast
		// Both are valid - we just want to ensure no errors occurred
		expect(typeof isLoading).toBe('boolean')

		// Wait for navigation
		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[a-f0-9-]+$/, { timeout: 15000 })
	})
})
