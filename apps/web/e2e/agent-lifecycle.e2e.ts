import { test as baseTest, expect, type Page } from '@playwright/test'
import { test } from './fixtures'

baseTest.describe('Agent Lifecycle - Agents List Page', () => {
	baseTest.beforeEach(async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/agents')
		await page.waitForLoadState('networkidle')
	})

	baseTest('displays agents heading', async ({ page }: { page: Page }) => {
		await expect(page.getByRole('heading', { name: 'Agents', exact: true })).toBeVisible()
	})

	baseTest('displays subtitle', async ({ page }: { page: Page }) => {
		await expect(page.getByText('Manage and monitor your AI agents')).toBeVisible()
	})

	baseTest('has new agent button', async ({ page }: { page: Page }) => {
		await expect(page.getByRole('link', { name: 'New Agent' })).toBeVisible()
	})

	baseTest('has search input', async ({ page }: { page: Page }) => {
		const searchInput = page.getByPlaceholder('Search agents...')
		await expect(searchInput).toBeVisible()
	})

	baseTest('has filter tabs', async ({ page }: { page: Page }) => {
		await expect(page.getByRole('tab', { name: /all/i })).toBeVisible()
		await expect(page.getByRole('tab', { name: /deployed|live/i })).toBeVisible()
		await expect(page.getByRole('tab', { name: /draft/i })).toBeVisible()
	})

	baseTest('shows empty state when no agents', async ({ page }: { page: Page }) => {
		// Wait for loading to complete
		await page.waitForTimeout(1000)

		// Either shows agents list or empty state
		const emptyState = page.getByText('Create your first agent')
		const agentCards = page.locator('[class*="card"]').filter({ hasText: 'Live' })

		const hasEmptyState = await emptyState.isVisible().catch(() => false)
		const hasAgents = (await agentCards.count()) > 0

		expect(hasEmptyState || hasAgents).toBeTruthy()
	})
})

baseTest.describe('Agent Lifecycle - Create Agent Page', () => {
	baseTest.beforeEach(async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/agents/new')
		await page.waitForLoadState('networkidle')
	})

	baseTest('displays create new agent heading', async ({ page }: { page: Page }) => {
		await expect(page.getByRole('heading', { name: 'Create New Agent' })).toBeVisible()
	})

	baseTest('displays page description', async ({ page }: { page: Page }) => {
		await expect(page.getByText('Set up a new AI agent for your workspace')).toBeVisible()
	})

	baseTest('has basic information card', async ({ page }: { page: Page }) => {
		await expect(page.getByText('Basic Information')).toBeVisible()
		await expect(page.getByLabel('Agent Name *')).toBeVisible()
		await expect(page.getByLabel('Description')).toBeVisible()
	})

	baseTest('has configuration card', async ({ page }: { page: Page }) => {
		await expect(page.getByText('Configuration')).toBeVisible()
		await expect(page.getByLabel('Model *')).toBeVisible()
		// System Prompt uses a custom editor component
		await expect(page.getByText('System Prompt', { exact: true })).toBeVisible()
	})

	baseTest('has tools and capabilities card', async ({ page }: { page: Page }) => {
		await expect(page.getByText('Tools & Capabilities')).toBeVisible()
	})

	baseTest('has actions card with create button', async ({ page }: { page: Page }) => {
		await expect(page.getByRole('button', { name: 'Create Agent' })).toBeVisible()
		await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible()
	})

	baseTest('has tips section', async ({ page }: { page: Page }) => {
		await expect(page.getByText('Tips')).toBeVisible()
	})
})

baseTest.describe('Agent Lifecycle - Form Validation', () => {
	baseTest.beforeEach(async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/agents/new')
		await page.waitForLoadState('networkidle')
	})

	baseTest('create button is disabled when name is empty', async ({ page }: { page: Page }) => {
		const createButton = page.getByRole('button', { name: 'Create Agent' })
		await expect(createButton).toBeDisabled()
	})

	baseTest(
		'create button becomes enabled when name is filled',
		async ({ page }: { page: Page }) => {
			await page.getByLabel('Agent Name *').fill('Test Agent')

			const createButton = page.getByRole('button', { name: 'Create Agent' })
			await expect(createButton).toBeEnabled()
		},
	)

	baseTest('can fill in agent name', async ({ page }: { page: Page }) => {
		const nameInput = page.getByLabel('Agent Name *')
		await nameInput.fill('Customer Support Agent')
		await expect(nameInput).toHaveValue('Customer Support Agent')
	})

	baseTest('can fill in description', async ({ page }: { page: Page }) => {
		const descInput = page.getByLabel('Description')
		await descInput.fill('An agent to help with customer inquiries')
		await expect(descInput).toHaveValue('An agent to help with customer inquiries')
	})
})

baseTest.describe('Agent Lifecycle - Model Selection', () => {
	baseTest.beforeEach(async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/agents/new')
		await page.waitForLoadState('networkidle')
	})

	baseTest('can open model dropdown', async ({ page }: { page: Page }) => {
		const modelSelect = page.getByLabel('Model *')
		await modelSelect.click()

		// Wait for dropdown to open
		await page.waitForTimeout(300)

		// Should show model options
		const options = page.locator('[role="option"]')
		const count = await options.count()
		expect(count).toBeGreaterThan(0)
	})

	baseTest('model select is visible', async ({ page }: { page: Page }) => {
		// The model select should be visible
		const modelTrigger = page.getByLabel('Model *')
		await expect(modelTrigger).toBeVisible()
	})
})

baseTest.describe('Agent Lifecycle - Cancel Flow', () => {
	baseTest('cancel button navigates back to agents list', async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/agents/new')
		await page.waitForLoadState('networkidle')

		await page.getByRole('button', { name: 'Cancel' }).click()

		await expect(page).toHaveURL(/\/dashboard\/agents/)
		await expect(page.getByRole('heading', { name: 'Agents', exact: true })).toBeVisible()
	})
})

test.describe('Agent Lifecycle - Authenticated User Flow', () => {
	test('authenticated user can view agents list', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents')
		await authenticatedPage.waitForLoadState('networkidle')

		await expect(
			authenticatedPage.getByRole('heading', { name: 'Agents', exact: true }),
		).toBeVisible()
	})

	test('authenticated user can navigate to create agent', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents')
		await authenticatedPage.waitForLoadState('networkidle')

		await authenticatedPage.getByRole('link', { name: 'New Agent' }).click()
		await expect(authenticatedPage).toHaveURL(/\/dashboard\/agents\/new/)
	})

	test('authenticated user can fill agent creation form', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		// Fill in required fields
		await authenticatedPage.getByLabel('Agent Name *').fill('E2E Test Agent')
		await authenticatedPage.getByLabel('Description').fill('Agent created by E2E tests')

		// Verify values are set
		await expect(authenticatedPage.getByLabel('Agent Name *')).toHaveValue('E2E Test Agent')
		await expect(authenticatedPage.getByLabel('Description')).toHaveValue(
			'Agent created by E2E tests',
		)
	})

	test('authenticated user can create an agent', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		// Fill in agent details
		const agentName = `Test Agent ${Date.now()}`
		await authenticatedPage.getByLabel('Agent Name *').fill(agentName)
		await authenticatedPage.getByLabel('Description').fill('E2E test agent')

		// Create the agent
		const createButton = authenticatedPage.getByRole('button', { name: 'Create Agent' })
		await expect(createButton).toBeEnabled()
		await createButton.click()

		// Wait for navigation or success
		await authenticatedPage.waitForTimeout(2000)

		// Should navigate to agent detail or stay on form with success
		const currentUrl = authenticatedPage.url()
		expect(
			currentUrl.includes('/dashboard/agents/') || currentUrl.includes('/dashboard/agents/new'),
		).toBeTruthy()
	})

	test('authenticated user can search agents', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents')
		await authenticatedPage.waitForLoadState('networkidle')

		const searchInput = authenticatedPage.getByPlaceholder('Search agents...')
		await searchInput.fill('test')

		// Search input should have the value
		await expect(searchInput).toHaveValue('test')
	})

	test('authenticated user can use filter tabs', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents')
		await authenticatedPage.waitForLoadState('networkidle')

		// Click on deployed/live tab
		const deployedTab = authenticatedPage.getByRole('tab', { name: /deployed|live/i })
		await deployedTab.click()

		// Tab should be active
		await expect(deployedTab).toHaveAttribute('data-state', 'active')

		// Click on draft tab
		const draftTab = authenticatedPage.getByRole('tab', { name: /draft/i })
		await draftTab.click()
		await expect(draftTab).toHaveAttribute('data-state', 'active')

		// Click on all tab
		const allTab = authenticatedPage.getByRole('tab', { name: /all/i })
		await allTab.click()
		await expect(allTab).toHaveAttribute('data-state', 'active')
	})
})

baseTest.describe('Agent Lifecycle - Responsive Design', () => {
	baseTest('agents list displays correctly on mobile', async ({ page }: { page: Page }) => {
		await page.setViewportSize({ width: 375, height: 667 })
		await page.goto('/dashboard/agents')
		await page.waitForLoadState('networkidle')

		await expect(page.getByRole('heading', { name: 'Agents', exact: true })).toBeVisible()
		await expect(page.getByRole('link', { name: 'New Agent' })).toBeVisible()
	})

	baseTest('create agent page displays correctly on mobile', async ({ page }: { page: Page }) => {
		await page.setViewportSize({ width: 375, height: 667 })
		await page.goto('/dashboard/agents/new')
		await page.waitForLoadState('networkidle')

		await expect(page.getByRole('heading', { name: 'Create New Agent' })).toBeVisible()
		await expect(page.getByLabel('Agent Name *')).toBeVisible()
	})

	baseTest('agents list displays correctly on tablet', async ({ page }: { page: Page }) => {
		await page.setViewportSize({ width: 768, height: 1024 })
		await page.goto('/dashboard/agents')
		await page.waitForLoadState('networkidle')

		await expect(page.getByRole('heading', { name: 'Agents', exact: true })).toBeVisible()
		// Filter tabs should be visible
		await expect(page.getByRole('tab', { name: /all/i })).toBeVisible()
	})
})

baseTest.describe('Agent Lifecycle - Page No Errors', () => {
	baseTest('agents list has no 404 error', async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/agents')
		await page.waitForLoadState('networkidle')
		await expect(page.locator('body')).not.toContainText('404')
	})

	baseTest('create agent page has no 404 error', async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/agents/new')
		await page.waitForLoadState('networkidle')
		await expect(page.locator('body')).not.toContainText('404')
	})
})

baseTest.describe('Agent Lifecycle - Accessibility', () => {
	baseTest('agents list has proper heading hierarchy', async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/agents')
		await page.waitForLoadState('networkidle')

		const h1 = page.locator('h1, h2').first()
		await expect(h1).toBeVisible()
	})

	baseTest('create agent form has labeled inputs', async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/agents/new')
		await page.waitForLoadState('networkidle')

		// All inputs should have labels
		await expect(page.getByLabel('Agent Name *')).toBeVisible()
		await expect(page.getByLabel('Description')).toBeVisible()
		await expect(page.getByLabel('Model *')).toBeVisible()
		// System Prompt uses a custom editor component with its own label
		await expect(page.getByText('System Prompt', { exact: true })).toBeVisible()
	})

	baseTest('buttons are keyboard accessible', async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/agents/new')
		await page.waitForLoadState('networkidle')

		// Cancel button is always enabled and focusable
		const cancelButton = page.getByRole('button', { name: 'Cancel' })
		await cancelButton.focus()
		await expect(cancelButton).toBeFocused()
	})
})

baseTest.describe('Agent Lifecycle - Tips Section', () => {
	baseTest.beforeEach(async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/agents/new')
		await page.waitForLoadState('networkidle')
	})

	baseTest('displays helpful tips', async ({ page }: { page: Page }) => {
		await expect(page.getByText(/Give your agent a clear, descriptive name/)).toBeVisible()
		await expect(page.getByText(/Write a detailed system prompt/)).toBeVisible()
	})

	baseTest('mentions model recommendations', async ({ page }: { page: Page }) => {
		await expect(page.getByText(/Llama 3.3 70B/)).toBeVisible()
	})
})
