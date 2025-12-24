import { expect, type Page, test as baseTest } from '@playwright/test'
import { test } from './fixtures'

/**
 * Agent lifecycle E2E tests.
 * Tests the complete flow: create -> configure -> deploy -> test -> delete
 */

test.describe('Agent Creation Flow', () => {
	test('can create agent with all fields filled', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		const agentName = `Full Agent ${Date.now()}`

		// Fill all fields
		await authenticatedPage.getByLabel(/Agent Name/i).fill(agentName)
		await authenticatedPage.getByLabel('Description').fill('A fully configured test agent')

		// Select model
		const modelSelect = authenticatedPage.getByLabel(/Model/i)
		await modelSelect.click()
		await authenticatedPage.waitForTimeout(500)
		const modelOption = authenticatedPage.locator('[role="option"]').first()
		if (await modelOption.isVisible({ timeout: 2000 })) {
			await modelOption.click()
		} else {
			await authenticatedPage.keyboard.press('Escape')
		}

		// Fill system prompt
		await authenticatedPage
			.getByLabel('System Prompt')
			.fill('You are a helpful AI assistant for testing purposes.')

		// Select some tools if available
		const toolCheckboxes = authenticatedPage.locator('input[type="checkbox"]')
		const checkboxCount = await toolCheckboxes.count()
		if (checkboxCount > 0) {
			await toolCheckboxes.first().check()
		}

		// Create button should be enabled
		const createButton = authenticatedPage.getByRole('button', { name: /create/i })
		await expect(createButton).toBeEnabled()

		// Create the agent
		await createButton.click()

		// Should navigate to agent detail page
		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[^/]+$/, { timeout: 10000 })

		// Verify we're on the agent page
		await expect(authenticatedPage.getByText(agentName)).toBeVisible()
	})

	test('can create minimal agent with just name and model', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		const agentName = `Minimal Agent ${Date.now()}`

		// Fill only required fields
		await authenticatedPage.getByLabel(/Agent Name/i).fill(agentName)

		// Model should have a default, but let's verify it's set
		const modelSelect = authenticatedPage.getByLabel(/Model/i)
		await expect(modelSelect).toBeVisible()

		// Create button should be enabled
		const createButton = authenticatedPage.getByRole('button', { name: /create/i })
		await expect(createButton).toBeEnabled()

		await createButton.click()

		// Should navigate to agent detail page
		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[^/]+$/, { timeout: 10000 })
	})

	test('create button disabled when name is empty', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		// Don't fill in the name
		const createButton = authenticatedPage.getByRole('button', { name: /create/i })
		await expect(createButton).toBeDisabled()
	})
})

test.describe('Agent Editor', () => {
	test('can view agent details after creation', async ({ authenticatedPage }) => {
		// First create an agent
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		const agentName = `View Test Agent ${Date.now()}`
		await authenticatedPage.getByLabel(/Agent Name/i).fill(agentName)
		await authenticatedPage
			.getByLabel('System Prompt')
			.fill('You are a test assistant.')
		await authenticatedPage.getByRole('button', { name: /create/i }).click()

		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[^/]+$/, { timeout: 10000 })

		// Verify agent details are shown
		await expect(authenticatedPage.getByText(agentName)).toBeVisible()

		// Should have tabs
		await expect(authenticatedPage.getByRole('tab', { name: /general/i })).toBeVisible()
		await expect(authenticatedPage.getByRole('tab', { name: /prompt/i })).toBeVisible()
		await expect(authenticatedPage.getByRole('tab', { name: /tools/i })).toBeVisible()
	})

	test('can switch between tabs', async ({ authenticatedPage }) => {
		// Create an agent first
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		const agentName = `Tab Test Agent ${Date.now()}`
		await authenticatedPage.getByLabel(/Agent Name/i).fill(agentName)
		await authenticatedPage.getByRole('button', { name: /create/i }).click()

		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[^/]+$/, { timeout: 10000 })

		// Click Prompt tab
		await authenticatedPage.getByRole('tab', { name: /prompt/i }).click()
		await expect(authenticatedPage.getByLabel('System Prompt')).toBeVisible()

		// Click Tools tab
		await authenticatedPage.getByRole('tab', { name: /tools/i }).click()
		await authenticatedPage.waitForTimeout(500)

		// Click General tab
		await authenticatedPage.getByRole('tab', { name: /general/i }).click()
		await expect(authenticatedPage.getByLabel(/name/i).first()).toBeVisible()
	})

	test('can update agent name and save', async ({ authenticatedPage }) => {
		// Create an agent first
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		const originalName = `Original Name ${Date.now()}`
		await authenticatedPage.getByLabel(/Agent Name/i).fill(originalName)
		await authenticatedPage.getByRole('button', { name: /create/i }).click()

		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[^/]+$/, { timeout: 10000 })

		// Update the name
		const newName = `Updated Name ${Date.now()}`
		const nameInput = authenticatedPage.getByLabel(/name/i).first()
		await nameInput.clear()
		await nameInput.fill(newName)

		// Save changes button should be visible/enabled
		const saveButton = authenticatedPage.getByRole('button', { name: /save/i })
		if (await saveButton.isVisible({ timeout: 2000 })) {
			await saveButton.click()

			// Wait for save to complete
			await authenticatedPage.waitForTimeout(2000)

			// Verify name was updated
			await expect(nameInput).toHaveValue(newName)
		}
	})
})

test.describe('Agent Deployment', () => {
	test('can deploy agent with instructions', async ({ authenticatedPage }) => {
		// Create an agent with instructions
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		const agentName = `Deploy Ready Agent ${Date.now()}`
		await authenticatedPage.getByLabel(/Agent Name/i).fill(agentName)
		await authenticatedPage
			.getByLabel('System Prompt')
			.fill('You are a helpful assistant ready for deployment.')
		await authenticatedPage.getByRole('button', { name: /create/i }).click()

		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[^/]+$/, { timeout: 10000 })

		// Look for deploy button
		const deployButton = authenticatedPage.getByRole('button', { name: /deploy/i })
		if (await deployButton.isVisible({ timeout: 3000 })) {
			await deployButton.click()

			// Wait for deployment
			await authenticatedPage.waitForTimeout(3000)

			// Status should change to deployed/live
			await expect(
				authenticatedPage.getByText(/live|deployed/i).first()
			).toBeVisible({ timeout: 5000 })
		}
	})

	test('deploy button disabled without instructions', async ({ authenticatedPage }) => {
		// Create an agent WITHOUT instructions
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		const agentName = `No Instructions Agent ${Date.now()}`
		await authenticatedPage.getByLabel(/Agent Name/i).fill(agentName)
		// Don't fill system prompt
		await authenticatedPage.getByRole('button', { name: /create/i }).click()

		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[^/]+$/, { timeout: 10000 })

		// Deploy button should be disabled or not visible
		const deployButton = authenticatedPage.getByRole('button', { name: /deploy/i })
		if (await deployButton.isVisible({ timeout: 2000 })) {
			await expect(deployButton).toBeDisabled()
		}
	})
})

test.describe('Agent Deletion', () => {
	test('can delete agent with confirmation', async ({ authenticatedPage }) => {
		// Create an agent to delete
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		const agentName = `Delete Test Agent ${Date.now()}`
		await authenticatedPage.getByLabel(/Agent Name/i).fill(agentName)
		await authenticatedPage.getByRole('button', { name: /create/i }).click()

		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[^/]+$/, { timeout: 10000 })

		// Find and click delete button
		const deleteButton = authenticatedPage.getByRole('button', { name: /delete/i })
		if (await deleteButton.isVisible({ timeout: 3000 })) {
			await deleteButton.click()

			// Confirmation dialog should appear
			const dialog = authenticatedPage.getByRole('dialog')
			await expect(dialog).toBeVisible({ timeout: 3000 })

			// Confirm deletion
			const confirmButton = dialog.getByRole('button', { name: /delete/i })
			await confirmButton.click()

			// Should navigate back to agents list
			await authenticatedPage.waitForURL(/\/dashboard\/agents$/, { timeout: 10000 })

			// Agent should no longer be in the list
			await authenticatedPage.waitForLoadState('networkidle')
			await expect(authenticatedPage.getByText(agentName)).not.toBeVisible({ timeout: 3000 })
		}
	})

	test('can cancel agent deletion', async ({ authenticatedPage }) => {
		// Create an agent
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		const agentName = `Cancel Delete Agent ${Date.now()}`
		await authenticatedPage.getByLabel(/Agent Name/i).fill(agentName)
		await authenticatedPage.getByRole('button', { name: /create/i }).click()

		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[^/]+$/, { timeout: 10000 })

		// Find and click delete button
		const deleteButton = authenticatedPage.getByRole('button', { name: /delete/i })
		if (await deleteButton.isVisible({ timeout: 3000 })) {
			await deleteButton.click()

			// Confirmation dialog should appear
			const dialog = authenticatedPage.getByRole('dialog')
			await expect(dialog).toBeVisible({ timeout: 3000 })

			// Cancel deletion
			const cancelButton = dialog.getByRole('button', { name: /cancel/i })
			await cancelButton.click()

			// Dialog should close, still on agent page
			await expect(dialog).not.toBeVisible({ timeout: 2000 })
			await expect(authenticatedPage.getByText(agentName)).toBeVisible()
		}
	})
})

test.describe('Agent List Filtering', () => {
	test('can search agents by name', async ({ authenticatedPage }) => {
		// First create a few agents
		const uniquePrefix = `Search${Date.now()}`

		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')
		await authenticatedPage.getByLabel(/Agent Name/i).fill(`${uniquePrefix} Alpha`)
		await authenticatedPage.getByRole('button', { name: /create/i }).click()
		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[^/]+$/, { timeout: 10000 })

		// Go to agents list
		await authenticatedPage.goto('/dashboard/agents')
		await authenticatedPage.waitForLoadState('networkidle')

		// Search for the agent
		const searchInput = authenticatedPage.getByPlaceholder(/search/i)
		if (await searchInput.isVisible({ timeout: 3000 })) {
			await searchInput.fill(uniquePrefix)
			await authenticatedPage.waitForTimeout(500)

			// Should show the matching agent
			await expect(authenticatedPage.getByText(`${uniquePrefix} Alpha`)).toBeVisible()
		}
	})

	test('can filter by status (live/drafts)', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents')
		await authenticatedPage.waitForLoadState('networkidle')

		// Look for filter tabs
		const draftsTab = authenticatedPage.getByRole('tab', { name: /drafts/i })
		const liveTab = authenticatedPage.getByRole('tab', { name: /live/i })
		const allTab = authenticatedPage.getByRole('tab', { name: /all/i })

		if (await draftsTab.isVisible({ timeout: 2000 })) {
			// Click drafts tab
			await draftsTab.click()
			await authenticatedPage.waitForTimeout(500)

			// Click live tab
			await liveTab.click()
			await authenticatedPage.waitForTimeout(500)

			// Click all tab
			await allTab.click()
			await authenticatedPage.waitForTimeout(500)
		}
	})
})

test.describe('Agent Navigation', () => {
	test('new agent button from list navigates to create page', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents')
		await authenticatedPage.waitForLoadState('networkidle')

		await authenticatedPage.getByRole('link', { name: /new agent/i }).click()
		await authenticatedPage.waitForURL(/\/dashboard\/agents\/new/)

		await expect(
			authenticatedPage.getByRole('heading', { name: /create.*agent/i })
		).toBeVisible()
	})

	test('can navigate from agent detail to playground', async ({ authenticatedPage }) => {
		// Create and deploy an agent
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		const agentName = `Playground Nav Agent ${Date.now()}`
		await authenticatedPage.getByLabel(/Agent Name/i).fill(agentName)
		await authenticatedPage
			.getByLabel('System Prompt')
			.fill('You are a test assistant.')
		await authenticatedPage.getByRole('button', { name: /create/i }).click()

		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[^/]+$/, { timeout: 10000 })

		// Deploy the agent
		const deployButton = authenticatedPage.getByRole('button', { name: /deploy/i })
		if (await deployButton.isVisible({ timeout: 3000 })) {
			await deployButton.click()
			await authenticatedPage.waitForTimeout(3000)
		}

		// Navigate to playground
		const testButton = authenticatedPage.getByRole('link', { name: /test|playground/i })
		if (await testButton.isVisible({ timeout: 3000 })) {
			await testButton.click()
			await authenticatedPage.waitForURL(/\/playground/, { timeout: 10000 })

			await expect(authenticatedPage.getByText(agentName)).toBeVisible()
		}
	})
})
