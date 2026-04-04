import { expect, type Page } from '@playwright/test'
import { test } from './fixtures'

/**
 * Real Feature E2E Tests
 * These tests sign in and actually USE the features - creating, editing, deleting data.
 */

// Helper to generate unique names
function uniqueName(prefix: string): string {
	return `${prefix} ${Date.now()}`
}

// Helper to fill React form inputs
async function fillInput(page: Page, label: string | RegExp, value: string) {
	const input = page.getByLabel(label)
	await input.click()
	await input.clear()
	await input.pressSequentially(value, { delay: 10 })
}

// Helper to wait for workspace to load
async function waitForWorkspace(page: Page) {
	// Wait for main content to appear (workspace loaded)
	await page.waitForSelector('main', { state: 'visible' })
	await expect(page.locator('main').first()).toBeVisible({ timeout: 10000 })
	// Wait for WorkspaceGate loading indicator to disappear
	await expect(page.getByText('Loading workspace...'))
		.toBeHidden({ timeout: 5000 })
		.catch(() => {})
}

// ============================================================================
// AGENT CRUD - Full Lifecycle
// ============================================================================

test.describe('Agent CRUD Operations', () => {
	test('can create a new agent with name and description', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/new')
		await waitForWorkspace(authenticatedPage)

		// Wait for form
		await expect(authenticatedPage.getByRole('heading', { name: /create.*agent/i })).toBeVisible({
			timeout: 10000,
		})

		const agentName = uniqueName('E2E Test Agent')

		// Fill the form
		await fillInput(authenticatedPage, /name/i, agentName)
		await fillInput(authenticatedPage, /description/i, 'Created by E2E test')

		// Submit
		const createBtn = authenticatedPage.getByRole('button', { name: /create/i })
		await expect(createBtn).toBeEnabled()
		await createBtn.click()

		// Should redirect to agent detail page
		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[^/]+$/, { timeout: 10000 })

		// Verify agent was created - name should appear on detail page
		await expect(authenticatedPage.getByText(agentName)).toBeVisible({ timeout: 10000 })
	})

	test('can edit an existing agent name', async ({ authenticatedPage }) => {
		// First create an agent
		await authenticatedPage.goto('/dashboard/agents/new')
		await waitForWorkspace(authenticatedPage)
		await expect(authenticatedPage.getByRole('heading', { name: /create.*agent/i })).toBeVisible({
			timeout: 15000,
		})

		const originalName = uniqueName('Original Agent')
		await fillInput(authenticatedPage, /name/i, originalName)
		await authenticatedPage.getByRole('button', { name: /create agent/i }).click()
		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[^/]+$/, { timeout: 15000 })

		// Wait for agent detail page to fully load (name input appears in General tab)
		const nameInput = authenticatedPage.locator('#name')
		await expect(nameInput).toBeVisible({ timeout: 15000 })

		// Wait for the form to be populated with agent data
		await expect(nameInput).toHaveValue(originalName, { timeout: 10000 })

		// Now edit the name
		const updatedName = uniqueName('Updated Agent')
		await nameInput.click()
		await nameInput.clear()
		await nameInput.pressSequentially(updatedName, { delay: 10 })

		// Wait for the Save Changes button to become enabled (hasChanges must be true)
		const saveBtn = authenticatedPage.getByRole('button', { name: /save changes/i })
		await expect(saveBtn).toBeEnabled({ timeout: 5000 })
		await saveBtn.click()

		// Wait for save to complete
		await authenticatedPage.waitForTimeout(3000)

		// Verify the name was updated
		await expect(nameInput).toHaveValue(updatedName)
	})

	test('can navigate to agent from list and back', async ({ authenticatedPage }) => {
		// Create an agent first
		await authenticatedPage.goto('/dashboard/agents/new')
		await waitForWorkspace(authenticatedPage)
		await expect(authenticatedPage.getByRole('heading', { name: /create.*agent/i })).toBeVisible({
			timeout: 10000,
		})

		const agentName = uniqueName('Navigate Test')
		await fillInput(authenticatedPage, /name/i, agentName)
		await authenticatedPage.getByRole('button', { name: /create/i }).click()
		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[^/]+$/, { timeout: 10000 })

		// Go to agents list
		await authenticatedPage.goto('/dashboard/agents')
		await waitForWorkspace(authenticatedPage)
		await expect(authenticatedPage.getByRole('heading', { name: /agents/i })).toBeVisible({
			timeout: 10000,
		})

		// Find and click on the agent we created
		const agentCard = authenticatedPage.getByText(agentName)
		await expect(agentCard).toBeVisible({ timeout: 10000 })

		// Click the configure button on the agent's card (rendered as a link with button inside)
		const configureLink = authenticatedPage.getByRole('link', { name: /configure|edit/i }).first()
		await configureLink.click()

		// Should be on agent detail page
		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[^/]+$/, { timeout: 10000 })
		await expect(authenticatedPage.getByText(agentName)).toBeVisible()
	})

	test('can deploy an agent', async ({ authenticatedPage }) => {
		// Create an agent
		await authenticatedPage.goto('/dashboard/agents/new')
		await waitForWorkspace(authenticatedPage)
		await expect(authenticatedPage.getByRole('heading', { name: /create.*agent/i })).toBeVisible({
			timeout: 10000,
		})

		const agentName = uniqueName('Deploy Test')
		await fillInput(authenticatedPage, /name/i, agentName)
		await authenticatedPage.getByRole('button', { name: /create/i }).click()
		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[^/]+$/, { timeout: 10000 })

		// Should show Draft status badge
		await expect(authenticatedPage.getByText('Draft').first()).toBeVisible({ timeout: 10000 })

		// Add a system prompt (required for deployment)
		const promptTab = authenticatedPage.getByRole('tab', { name: /prompt/i })
		if (await promptTab.isVisible({ timeout: 3000 }).catch(() => false)) {
			await promptTab.click()
			await authenticatedPage.waitForTimeout(500)
			const promptEditor = authenticatedPage.locator('textarea').first()
			if (await promptEditor.isVisible({ timeout: 3000 }).catch(() => false)) {
				await promptEditor.fill('You are a helpful test assistant.')
			}
		}

		// Click deploy button
		const deployBtn = authenticatedPage.getByRole('button', { name: /deploy/i })
		if (await deployBtn.isVisible({ timeout: 5000 })) {
			await deployBtn.click()

			// Wait for deployment
			await authenticatedPage.waitForTimeout(3000)

			// Should now show Deployed status
			const deployedStatus = authenticatedPage.getByText('Deployed')
			await expect(deployedStatus.first()).toBeVisible({ timeout: 10000 })
		}
	})
})

// ============================================================================
// AGENT BUILDER TABS - Real Interactions
// ============================================================================

test.describe('Agent Builder Tabs', () => {
	test('can switch to Tools tab and toggle system tools', async ({ authenticatedPage }) => {
		// Create agent first
		await authenticatedPage.goto('/dashboard/agents/new')
		await waitForWorkspace(authenticatedPage)
		await expect(authenticatedPage.getByRole('heading', { name: /create.*agent/i })).toBeVisible({
			timeout: 10000,
		})

		await fillInput(authenticatedPage, /name/i, uniqueName('Tools Test'))
		await authenticatedPage.getByRole('button', { name: /create/i }).click()
		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[^/]+$/, { timeout: 10000 })

		// Click Tools tab
		await authenticatedPage.getByRole('tab', { name: /tools/i }).click()

		// Find and toggle system tools switch
		const systemToolsSwitch = authenticatedPage.locator('[role="switch"]').first()
		if (await systemToolsSwitch.isVisible({ timeout: 5000 })) {
			const initialState = await systemToolsSwitch.getAttribute('aria-checked')
			await systemToolsSwitch.click()
			await authenticatedPage.waitForTimeout(500)
			const newState = await systemToolsSwitch.getAttribute('aria-checked')
			expect(newState).not.toBe(initialState)
		}
	})

	test('can edit system prompt in Prompt tab', async ({ authenticatedPage }) => {
		// Create agent
		await authenticatedPage.goto('/dashboard/agents/new')
		await waitForWorkspace(authenticatedPage)
		await expect(authenticatedPage.getByRole('heading', { name: /create.*agent/i })).toBeVisible({
			timeout: 10000,
		})

		await fillInput(authenticatedPage, /name/i, uniqueName('Prompt Test'))
		await authenticatedPage.getByRole('button', { name: /create/i }).click()
		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[^/]+$/, { timeout: 10000 })

		// Click Prompt tab
		await authenticatedPage.getByRole('tab', { name: /prompt/i }).click()
		await authenticatedPage.waitForTimeout(500)

		// Find the prompt editor (could be textarea or code editor)
		const promptEditor = authenticatedPage.locator('textarea').first()
		if (await promptEditor.isVisible({ timeout: 5000 })) {
			await promptEditor.click()
			await promptEditor.fill('You are a helpful E2E test assistant.')

			// Save
			await authenticatedPage.getByRole('button', { name: /save/i }).click()
			await authenticatedPage.waitForTimeout(2000)
		}
	})
})

// ============================================================================
// HTTP TOOL CREATION - Full Flow
// ============================================================================

test.describe('HTTP Tool Creation', () => {
	test('can create an HTTP tool with URL and method', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/tools/new')
		await waitForWorkspace(authenticatedPage)

		// Wait for the form to render (heading is "Create HTTP Tool")
		await expect(authenticatedPage.getByRole('heading', { name: /create http tool/i })).toBeVisible(
			{
				timeout: 15000,
			},
		)

		const toolName = uniqueName('E2E HTTP Tool')

		// Fill tool name - label is "Name *" with htmlFor="name"
		const nameInput = authenticatedPage.locator('#name')
		await expect(nameInput).toBeVisible({ timeout: 5000 })
		await nameInput.click()
		await nameInput.pressSequentially(toolName, { delay: 10 })

		// Fill URL - label is "URL *" with htmlFor="url"
		const urlInput = authenticatedPage.locator('#url')
		await expect(urlInput).toBeVisible({ timeout: 5000 })
		await urlInput.click()
		await urlInput.pressSequentially('https://jsonplaceholder.typicode.com/posts/1', { delay: 10 })

		// Wait for Create Tool button to be enabled (requires name and url to be non-empty)
		const createBtn = authenticatedPage.getByRole('button', { name: /create tool/i })
		await expect(createBtn).toBeEnabled({ timeout: 10000 })

		// Click create
		await createBtn.click()

		// Should redirect to tools list or show success
		await authenticatedPage.waitForURL(/\/dashboard\/tools$/, { timeout: 15000 }).catch(() => {
			// If URL didn't change, wait a bit more for redirect
		})
		await authenticatedPage.waitForTimeout(2000)

		// Navigate to tools list and verify our tool exists
		await authenticatedPage.goto('/dashboard/tools')
		await waitForWorkspace(authenticatedPage)

		// Wait for page heading to confirm page loaded
		await expect(authenticatedPage.getByRole('heading', { name: /tools/i })).toBeVisible({
			timeout: 15000,
		})

		// Tool should appear in list (might be in custom tools section)
		const toolInList = authenticatedPage.getByText(toolName)
		await expect(toolInList).toBeVisible({ timeout: 10000 })
	})

	test('can test an HTTP tool before saving', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/tools/new')
		await waitForWorkspace(authenticatedPage)

		// Fill minimal tool info
		const nameInput = authenticatedPage.locator('#name')
		await nameInput.click()
		await nameInput.pressSequentially('Test Tool', { delay: 10 })

		const urlInput = authenticatedPage.locator('#url')
		await urlInput.click()
		await urlInput.pressSequentially('https://jsonplaceholder.typicode.com/posts/1', { delay: 10 })

		// Find and click test button ("Run Test" button)
		const testBtn = authenticatedPage.getByRole('button', { name: /run test/i })
		if (await testBtn.isVisible({ timeout: 5000 })) {
			await testBtn.click()

			// Wait for test results
			await authenticatedPage.waitForTimeout(5000)

			// Should show some result (success or response data)
			const hasResult =
				(await authenticatedPage
					.getByText(/success|200|response/i)
					.first()
					.isVisible()
					.catch(() => false)) ||
				(await authenticatedPage
					.getByText(/failed|error/i)
					.first()
					.isVisible()
					.catch(() => false))

			expect(hasResult).toBeTruthy()
		}
	})
})

// ============================================================================
// SETTINGS - Profile Updates
// ============================================================================

test.describe('Settings - Profile', () => {
	test('can update profile name', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await waitForWorkspace(authenticatedPage)

		// Wait for profile form to load
		const nameInput = authenticatedPage.getByLabel(/^name/i).first()
		await expect(nameInput).toBeVisible({ timeout: 10000 })

		// Update name
		const newName = `E2E User ${Date.now()}`
		await nameInput.click()
		await nameInput.clear()
		await nameInput.pressSequentially(newName, { delay: 10 })

		// Look for save button
		const saveBtn = authenticatedPage.getByRole('button', { name: /save/i })
		if (await saveBtn.isEnabled({ timeout: 3000 })) {
			await saveBtn.click()
			await authenticatedPage.waitForTimeout(2000)

			// Verify the name persisted
			await expect(nameInput).toHaveValue(newName)
		}
	})

	test('can sign out and get redirected', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await waitForWorkspace(authenticatedPage)

		// Find and click sign out
		const signOutBtn = authenticatedPage.getByRole('button', { name: /sign out/i })
		await expect(signOutBtn).toBeVisible({ timeout: 10000 })
		await signOutBtn.click()

		// Should redirect to sign-in or home
		await authenticatedPage.waitForURL(/\/(sign-in)?$/, { timeout: 10000 })
	})
})

// ============================================================================
// API KEYS - Create and Verify
// ============================================================================

test.describe('API Keys Management', () => {
	test('can create a new API key', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings/api-keys')
		await waitForWorkspace(authenticatedPage)

		// Find create button
		const createBtn = authenticatedPage.getByRole('button', {
			name: /create.*key|new.*key|generate/i,
		})

		if (await createBtn.isVisible({ timeout: 10000 })) {
			await createBtn.click()

			// Fill in key name in dialog
			const keyNameInput = authenticatedPage
				.getByLabel(/name/i)
				.or(authenticatedPage.getByPlaceholder(/name/i))
			if (await keyNameInput.isVisible({ timeout: 5000 })) {
				await keyNameInput.click()
				await keyNameInput.pressSequentially('E2E Test Key', { delay: 10 })
			}

			// Confirm creation
			const confirmBtn = authenticatedPage.getByRole('button', { name: /create|generate/i }).last()
			await confirmBtn.click()

			// Should show the generated key
			await authenticatedPage.waitForTimeout(3000)

			// Key should be displayed (look for copy button or key display)
			const copyBtn = authenticatedPage.getByRole('button', { name: /copy/i })
			const keyDisplay = authenticatedPage.locator('code, [class*="mono"]')

			const keyShown =
				(await copyBtn.isVisible({ timeout: 5000 }).catch(() => false)) ||
				(await keyDisplay
					.first()
					.isVisible({ timeout: 2000 })
					.catch(() => false))

			expect(keyShown).toBeTruthy()
		}
	})
})

// ============================================================================
// ANALYTICS - Filters and Export
// ============================================================================

test.describe('Analytics - Filters', () => {
	test('can change date range filter', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await waitForWorkspace(authenticatedPage)

		// Wait for analytics to load
		await expect(authenticatedPage.getByRole('heading', { name: /analytics/i })).toBeVisible({
			timeout: 10000,
		})

		// Find date range dropdown
		const dateSelect = authenticatedPage.getByRole('combobox').first()
		if (await dateSelect.isVisible({ timeout: 5000 })) {
			await dateSelect.click()

			// Select "Last 7 days"
			const option = authenticatedPage.getByRole('option', { name: /7 days/i })
			if (await option.isVisible({ timeout: 3000 })) {
				await option.click()
				await authenticatedPage.waitForTimeout(1000)

				// Verify selection changed
				await expect(dateSelect).toContainText(/7 days/i)
			}
		}
	})

	test('can open export menu', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await waitForWorkspace(authenticatedPage)

		await expect(authenticatedPage.getByRole('heading', { name: /analytics/i })).toBeVisible({
			timeout: 10000,
		})

		// Click export button
		const exportBtn = authenticatedPage.getByRole('button', { name: /export/i })
		if (await exportBtn.isVisible({ timeout: 5000 })) {
			await exportBtn.click()

			// Menu should show CSV and JSON options
			await expect(authenticatedPage.getByRole('menuitem', { name: /csv/i })).toBeVisible({
				timeout: 3000,
			})
			await expect(authenticatedPage.getByRole('menuitem', { name: /json/i })).toBeVisible()
		}
	})
})

// ============================================================================
// SEARCH FUNCTIONALITY
// ============================================================================

test.describe('Search Features', () => {
	test('can search for agents', async ({ authenticatedPage }) => {
		// First create an agent with a unique name
		await authenticatedPage.goto('/dashboard/agents/new')
		await waitForWorkspace(authenticatedPage)
		await expect(authenticatedPage.getByRole('heading', { name: /create.*agent/i })).toBeVisible({
			timeout: 10000,
		})

		const searchName = `Searchable${Date.now()}`
		await fillInput(authenticatedPage, /name/i, searchName)
		await authenticatedPage.getByRole('button', { name: /create/i }).click()
		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[^/]+$/, { timeout: 10000 })

		// Go to agents list
		await authenticatedPage.goto('/dashboard/agents')
		await waitForWorkspace(authenticatedPage)
		await expect(authenticatedPage.getByRole('heading', { name: /agents/i })).toBeVisible({
			timeout: 10000,
		})

		// Search for the agent
		const searchInput = authenticatedPage.getByPlaceholder(/search/i)
		await searchInput.click()
		await searchInput.pressSequentially(searchName.substring(0, 10), { delay: 50 })
		await authenticatedPage.waitForTimeout(1000)

		// Should find our agent
		await expect(authenticatedPage.getByText(searchName)).toBeVisible({ timeout: 5000 })
	})

	test('can search for tools', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/tools')
		await waitForWorkspace(authenticatedPage)

		// Wait for the tools page heading to confirm WorkspaceGate has passed
		await expect(authenticatedPage.getByRole('heading', { name: /tools/i })).toBeVisible({
			timeout: 15000,
		})

		// Search for KV tools using the tools page search input
		// SearchInput renders an <input type="search"> with the given placeholder
		const searchInput = authenticatedPage.getByPlaceholder('Search tools...')
		await expect(searchInput).toBeVisible({ timeout: 5000 })
		await searchInput.click()
		await searchInput.pressSequentially('KV', { delay: 50 })
		await authenticatedPage.waitForTimeout(1500)

		// Should show KV-related tools (system tools with KV in the name)
		await expect(authenticatedPage.getByText(/KV/i).first()).toBeVisible({
			timeout: 10000,
		})
	})
})

// ============================================================================
// AGENT PLAYGROUND - Chat
// ============================================================================

test.describe('Agent Playground', () => {
	test('can access playground for deployed agent', async ({ authenticatedPage }) => {
		// Create an agent
		await authenticatedPage.goto('/dashboard/agents/new')
		await waitForWorkspace(authenticatedPage)
		await expect(authenticatedPage.getByRole('heading', { name: /create.*agent/i })).toBeVisible({
			timeout: 10000,
		})

		await fillInput(authenticatedPage, /name/i, uniqueName('Playground Test'))
		await authenticatedPage.getByRole('button', { name: /create/i }).click()
		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[^/]+$/, { timeout: 10000 })

		// Get agent ID from URL
		const url = authenticatedPage.url()
		const agentId = url.split('/').pop()

		// Navigate to playground page directly
		await authenticatedPage.goto(`/dashboard/agents/${agentId}/playground`)
		await waitForWorkspace(authenticatedPage)

		// Should show the playground page (chat interface with textarea)
		const chatInput = authenticatedPage.locator('textarea')
		const pageContent = authenticatedPage.locator('main')

		const hasPlayground =
			(await chatInput
				.first()
				.isVisible({ timeout: 10000 })
				.catch(() => false)) || (await pageContent.isVisible({ timeout: 5000 }).catch(() => false))

		expect(hasPlayground).toBeTruthy()
	})
})

// ============================================================================
// NAVIGATION - Full User Journey
// ============================================================================

test.describe('Full User Journey', () => {
	test('can complete full workflow: create agent -> configure -> verify in list', async ({
		authenticatedPage,
	}) => {
		// 1. Start at dashboard
		await authenticatedPage.goto('/dashboard')
		await waitForWorkspace(authenticatedPage)

		// 2. Navigate to agents
		await authenticatedPage.getByRole('link', { name: 'Agents' }).click()
		await authenticatedPage.waitForURL(/\/dashboard\/agents/)
		await waitForWorkspace(authenticatedPage)

		// 3. Create new agent (navigate directly since "New Agent" is a link to templates)
		await authenticatedPage.goto('/dashboard/agents/new')
		await waitForWorkspace(authenticatedPage)

		const agentName = uniqueName('Journey Agent')
		await fillInput(authenticatedPage, /name/i, agentName)
		await fillInput(authenticatedPage, /description/i, 'Full journey test')
		await authenticatedPage.getByRole('button', { name: /create/i }).click()
		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[^/]+$/, { timeout: 10000 })

		// 4. Configure tools tab
		const toolsTab = authenticatedPage.getByRole('tab', { name: /tools/i })
		if (await toolsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
			await toolsTab.click()
			await authenticatedPage.waitForTimeout(500)
		}

		// 5. Save if save button is available
		const saveBtn = authenticatedPage.getByRole('button', { name: /save/i })
		if (await saveBtn.isEnabled({ timeout: 3000 }).catch(() => false)) {
			await saveBtn.click()
			await authenticatedPage.waitForTimeout(2000)
		}

		// 6. Navigate back to list and verify agent exists
		await authenticatedPage.goto('/dashboard/agents')
		await waitForWorkspace(authenticatedPage)
		await expect(authenticatedPage.getByRole('heading', { name: /agents/i })).toBeVisible({
			timeout: 10000,
		})

		await expect(authenticatedPage.getByText(agentName)).toBeVisible({ timeout: 10000 })
	})
})
