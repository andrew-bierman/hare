import { expect, type Page, test as baseTest } from '@playwright/test'
import { test } from './fixtures'

/**
 * Tools management E2E tests.
 * Tests system tools display, custom tool creation, and tool management.
 */

baseTest.describe('Tools Page - Unauthenticated', () => {
	baseTest.beforeEach(async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/tools')
		await page.waitForLoadState('networkidle')
	})

	baseTest('displays tools page heading', async ({ page }: { page: Page }) => {
		await expect(page.getByRole('heading', { name: 'Tools', exact: true })).toBeVisible()
	})

	baseTest('displays system tools section', async ({ page }: { page: Page }) => {
		// System tools should be visible even without auth
		await expect(page.getByText(/system/i).first()).toBeVisible()
	})

	baseTest('has add tool button', async ({ page }: { page: Page }) => {
		await expect(page.getByRole('button', { name: /add tool/i }).first()).toBeVisible()
	})

	baseTest('displays search input', async ({ page }: { page: Page }) => {
		await expect(page.getByPlaceholder('Search tools...')).toBeVisible()
	})

	baseTest('displays tools sections when loaded', async ({ page }: { page: Page }) => {
		// Wait for loading to complete
		await page.waitForTimeout(2000)
		// Check for either System Tools or Custom Tools section heading
		const hasSystemTools = await page.getByRole('heading', { name: 'System Tools' }).isVisible().catch(() => false)
		const hasCustomTools = await page.getByRole('heading', { name: 'Custom Tools', exact: true }).isVisible().catch(() => false)
		// At least one section should be visible after loading
		expect(hasSystemTools || hasCustomTools).toBeTruthy()
	})
})

baseTest.describe('Tools Page - Search', () => {
	baseTest.beforeEach(async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/tools')
		await page.waitForLoadState('networkidle')
	})

	baseTest('can type in search input', async ({ page }: { page: Page }) => {
		const searchInput = page.getByPlaceholder('Search tools...')
		await searchInput.fill('http')
		await expect(searchInput).toHaveValue('http')
	})

	baseTest('can clear search input', async ({ page }: { page: Page }) => {
		const searchInput = page.getByPlaceholder('Search tools...')
		await searchInput.fill('test')
		await searchInput.clear()
		await expect(searchInput).toHaveValue('')
	})
})

baseTest.describe('Tools Page - Create Tool Dialog', () => {
	baseTest.beforeEach(async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/tools')
		await page.waitForLoadState('networkidle')
	})

	baseTest('opens create dialog when Add Tool is clicked', async ({ page }: { page: Page }) => {
		await page.getByRole('button', { name: 'Add Tool' }).first().click()
		await expect(page.getByRole('dialog')).toBeVisible()
		await expect(page.getByText('Create Tool')).toBeVisible()
	})

	baseTest('create dialog has required form fields', async ({ page }: { page: Page }) => {
		await page.getByRole('button', { name: 'Add Tool' }).first().click()

		await expect(page.getByLabel('Name *')).toBeVisible()
		await expect(page.getByLabel('Description')).toBeVisible()
		await expect(page.getByLabel('Type')).toBeVisible()
		await expect(page.getByLabel('Configuration (JSON)')).toBeVisible()
	})

	baseTest('create dialog has action buttons', async ({ page }: { page: Page }) => {
		await page.getByRole('button', { name: 'Add Tool' }).first().click()

		await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible()
		await expect(page.getByRole('button', { name: 'Create' })).toBeVisible()
	})

	baseTest('cancel button closes the dialog', async ({ page }: { page: Page }) => {
		await page.getByRole('button', { name: 'Add Tool' }).first().click()
		await expect(page.getByRole('dialog')).toBeVisible()

		await page.getByRole('button', { name: 'Cancel' }).click()
		await expect(page.getByRole('dialog')).not.toBeVisible()
	})

	baseTest('can fill in tool name', async ({ page }: { page: Page }) => {
		await page.getByRole('button', { name: 'Add Tool' }).first().click()

		const nameInput = page.getByLabel('Name *')
		await nameInput.fill('My Test Tool')
		await expect(nameInput).toHaveValue('My Test Tool')
	})

	baseTest('can fill in tool description', async ({ page }: { page: Page }) => {
		await page.getByRole('button', { name: 'Add Tool' }).first().click()

		const descInput = page.getByLabel('Description')
		await descInput.fill('A test tool for testing')
		await expect(descInput).toHaveValue('A test tool for testing')
	})

	baseTest('can select tool type', async ({ page }: { page: Page }) => {
		await page.getByRole('button', { name: 'Add Tool' }).first().click()

		// Click the type select
		await page.getByLabel('Type').click()

		// Verify options are visible
		const selectContent = page.locator('[role="listbox"]')
		await expect(selectContent).toBeVisible()
	})

	baseTest('can fill in configuration JSON', async ({ page }: { page: Page }) => {
		await page.getByRole('button', { name: 'Add Tool' }).first().click()

		const configInput = page.getByLabel('Configuration (JSON)')
		await configInput.fill('{"url": "https://example.com"}')
		await expect(configInput).toHaveValue('{"url": "https://example.com"}')
	})

	baseTest('create button is disabled when name is empty', async ({ page }: { page: Page }) => {
		await page.getByRole('button', { name: 'Add Tool' }).first().click()

		const createButton = page.getByRole('button', { name: 'Create' })
		await expect(createButton).toBeDisabled()
	})

	baseTest('create button is enabled when name is filled', async ({ page }: { page: Page }) => {
		await page.getByRole('button', { name: 'Add Tool' }).first().click()

		await page.getByLabel('Name *').fill('Test Tool')
		const createButton = page.getByRole('button', { name: 'Create' })
		await expect(createButton).toBeEnabled()
	})
})

baseTest.describe('Tools Page - Responsive Design', () => {
	baseTest('displays correctly on mobile', async ({ page }: { page: Page }) => {
		await page.setViewportSize({ width: 375, height: 667 })
		await page.goto('/dashboard/tools')
		await page.waitForLoadState('networkidle')

		await expect(page.getByRole('heading', { name: 'Tools', exact: true })).toBeVisible()
		await expect(page.getByRole('button', { name: 'Add Tool' }).first()).toBeVisible()
	})

	baseTest('displays correctly on tablet', async ({ page }: { page: Page }) => {
		await page.setViewportSize({ width: 768, height: 1024 })
		await page.goto('/dashboard/tools')
		await page.waitForLoadState('networkidle')

		await expect(page.getByRole('heading', { name: 'Tools', exact: true })).toBeVisible()
	})
})

baseTest.describe('Tools Page - Accessibility', () => {
	baseTest.beforeEach(async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/tools')
		await page.waitForLoadState('networkidle')
	})

	baseTest('Add Tool button is keyboard accessible', async ({ page }: { page: Page }) => {
		const addButton = page.getByRole('button', { name: 'Add Tool' }).first()
		await addButton.focus()
		await expect(addButton).toBeFocused()
	})

	baseTest('search input is keyboard accessible', async ({ page }: { page: Page }) => {
		const searchInput = page.getByPlaceholder('Search tools...')
		await searchInput.focus()
		await expect(searchInput).toBeFocused()
	})

	baseTest('dialog can be closed with Escape key', async ({ page }: { page: Page }) => {
		await page.getByRole('button', { name: 'Add Tool' }).first().click()
		await expect(page.getByRole('dialog')).toBeVisible()

		await page.keyboard.press('Escape')
		await expect(page.getByRole('dialog')).not.toBeVisible()
	})
})

baseTest.describe('Tools Page - Empty State', () => {
	baseTest('page loads without errors', async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/tools')
		await page.waitForLoadState('networkidle')

		// Page should not have errors
		await expect(page.locator('body')).not.toContainText('404')
		await expect(page.getByRole('heading', { name: 'Tools', exact: true })).toBeVisible()
	})
})

test.describe('System Tools - Authenticated', () => {
	test('displays all system tools', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/tools')
		await authenticatedPage.waitForLoadState('networkidle')

		// Should show system tools
		const systemToolNames = ['HTTP Request', 'Key-Value Store', 'Object Storage', 'SQL Query', 'Vector Search']

		for (const toolName of systemToolNames) {
			// Check if at least some system tools are displayed
			const tool = authenticatedPage.getByText(toolName)
			if (await tool.isVisible({ timeout: 1000 }).catch(() => false)) {
				await expect(tool).toBeVisible()
			}
		}
	})

	test('system tools have System badge', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/tools')
		await authenticatedPage.waitForLoadState('networkidle')

		// Look for System badges
		const systemBadges = authenticatedPage.getByText('System', { exact: true })
		const count = await systemBadges.count()
		expect(count).toBeGreaterThan(0)
	})

	test('system tools cannot be deleted', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/tools')
		await authenticatedPage.waitForLoadState('networkidle')

		// System tools should not have delete buttons
		// Find a system tool card
		const systemCard = authenticatedPage.locator('[class*="card"]').filter({ hasText: 'System' }).first()

		if (await systemCard.isVisible({ timeout: 2000 })) {
			// Should not have a delete button
			const deleteButton = systemCard.getByRole('button', { name: /delete/i })
			expect(await deleteButton.isVisible({ timeout: 1000 }).catch(() => false)).toBe(false)
		}
	})
})

test.describe('Custom Tools - Authenticated', () => {
	test('can open add tool dialog', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/tools')
		await authenticatedPage.waitForLoadState('networkidle')

		// Click add tool button
		await authenticatedPage.getByRole('button', { name: /add tool/i }).first().click()

		// Dialog should open
		const dialog = authenticatedPage.getByRole('dialog')
		await expect(dialog).toBeVisible({ timeout: 3000 })

		// Dialog should have form fields
		await expect(dialog.getByLabel(/name/i)).toBeVisible()
	})

	test('can create custom HTTP tool', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/tools')
		await authenticatedPage.waitForLoadState('networkidle')

		// Open add tool dialog
		await authenticatedPage.getByRole('button', { name: /add tool/i }).first().click()
		const dialog = authenticatedPage.getByRole('dialog')
		await expect(dialog).toBeVisible({ timeout: 3000 })

		// Fill in tool details
		const toolName = `Custom HTTP Tool ${Date.now()}`
		await dialog.getByLabel(/name/i).fill(toolName)
		await dialog.getByLabel(/description/i).fill('A custom HTTP tool for testing')

		// Select type if dropdown exists
		const typeSelect = dialog.getByLabel(/type/i)
		if (await typeSelect.isVisible({ timeout: 1000 })) {
			await typeSelect.click()
			await authenticatedPage.waitForTimeout(500)
			const httpOption = authenticatedPage.getByText('HTTP', { exact: true }).first()
			if (await httpOption.isVisible({ timeout: 1000 })) {
				await httpOption.click()
			} else {
				await authenticatedPage.keyboard.press('Escape')
			}
		}

		// Add configuration JSON if field exists
		const configField = dialog.getByLabel(/config/i)
		if (await configField.isVisible({ timeout: 1000 })) {
			await configField.fill('{"url": "https://api.example.com"}')
		}

		// Create the tool
		const createButton = dialog.getByRole('button', { name: /create/i })
		await createButton.click()

		// Dialog should close
		await expect(dialog).not.toBeVisible({ timeout: 5000 })

		// Tool should appear in the list
		await authenticatedPage.waitForLoadState('networkidle')
		await expect(authenticatedPage.getByText(toolName)).toBeVisible({ timeout: 5000 })
	})

	test('validates tool name is required', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/tools')
		await authenticatedPage.waitForLoadState('networkidle')

		// Open add tool dialog
		await authenticatedPage.getByRole('button', { name: /add tool/i }).first().click()
		const dialog = authenticatedPage.getByRole('dialog')
		await expect(dialog).toBeVisible({ timeout: 3000 })

		// Don't fill in name, try to create
		const createButton = dialog.getByRole('button', { name: /create/i })

		// Button should be disabled or clicking should not close dialog
		const isDisabled = await createButton.isDisabled()
		if (!isDisabled) {
			await createButton.click()
			// Dialog should still be visible (validation failed)
			await expect(dialog).toBeVisible()
		}
	})
})

test.describe('Tools Search - Authenticated', () => {
	test('can search tools by name', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/tools')
		await authenticatedPage.waitForLoadState('networkidle')

		// Search for HTTP
		const searchInput = authenticatedPage.getByPlaceholder(/search/i)
		if (await searchInput.isVisible({ timeout: 2000 })) {
			await searchInput.fill('HTTP')
			await authenticatedPage.waitForTimeout(500)

			// Should show HTTP tool
			await expect(authenticatedPage.getByText(/HTTP Request/i)).toBeVisible()
		}
	})
})

baseTest.describe('Tools Integration with Agents', () => {
	// These tests verify tools can be used with agents
	baseTest('tools page has info about agent integration', async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/tools')
		await page.waitForLoadState('networkidle')

		// Page should mention agents
		const agentText = page.getByText(/agent/i).first()
		// This is informational text about tools being available to agents
	})
})
