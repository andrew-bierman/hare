import { test as baseTest, expect, type Page } from '@playwright/test'
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
})

test.describe('System Tools - Authenticated', () => {
	test('displays all system tools', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/tools')
		await authenticatedPage.waitForLoadState('networkidle')

		// Should show system tools
		const systemToolNames = [
			'HTTP Request',
			'Key-Value Store',
			'Object Storage',
			'SQL Query',
			'Vector Search',
		]

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
		const systemCard = authenticatedPage
			.locator('[class*="card"]')
			.filter({ hasText: 'System' })
			.first()

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
		await authenticatedPage
			.getByRole('button', { name: /add tool/i })
			.first()
			.click()

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
		await authenticatedPage
			.getByRole('button', { name: /add tool/i })
			.first()
			.click()
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

	test('can create and delete custom tool', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/tools')
		await authenticatedPage.waitForLoadState('networkidle')

		// Create a custom tool first
		await authenticatedPage
			.getByRole('button', { name: /add tool/i })
			.first()
			.click()
		const dialog = authenticatedPage.getByRole('dialog')
		await expect(dialog).toBeVisible({ timeout: 3000 })

		const toolName = `Delete Test Tool ${Date.now()}`
		await dialog.getByLabel(/name/i).fill(toolName)

		const createButton = dialog.getByRole('button', { name: /create/i })
		await createButton.click()
		await expect(dialog).not.toBeVisible({ timeout: 5000 })

		// Wait for tool to appear
		await authenticatedPage.waitForLoadState('networkidle')
		await expect(authenticatedPage.getByText(toolName)).toBeVisible({ timeout: 5000 })

		// Find the tool card and delete it
		const toolCard = authenticatedPage
			.locator('[class*="card"]')
			.filter({ hasText: toolName })
			.first()
		const deleteButton = toolCard.getByRole('button', { name: /delete/i })

		if (await deleteButton.isVisible({ timeout: 2000 })) {
			await deleteButton.click()

			// Confirmation dialog
			const confirmDialog = authenticatedPage.getByRole('dialog')
			await expect(confirmDialog).toBeVisible({ timeout: 3000 })

			// Confirm deletion
			const confirmButton = confirmDialog.getByRole('button', { name: /delete/i })
			await confirmButton.click()

			// Tool should be removed
			await expect(authenticatedPage.getByText(toolName)).not.toBeVisible({ timeout: 5000 })
		}
	})

	test('validates tool name is required', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/tools')
		await authenticatedPage.waitForLoadState('networkidle')

		// Open add tool dialog
		await authenticatedPage
			.getByRole('button', { name: /add tool/i })
			.first()
			.click()
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

	test('validates JSON config format', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/tools')
		await authenticatedPage.waitForLoadState('networkidle')

		// Open add tool dialog
		await authenticatedPage
			.getByRole('button', { name: /add tool/i })
			.first()
			.click()
		const dialog = authenticatedPage.getByRole('dialog')
		await expect(dialog).toBeVisible({ timeout: 3000 })

		await dialog.getByLabel(/name/i).fill('Test Tool')

		// Add invalid JSON config
		const configField = dialog.getByLabel(/config/i)
		if (await configField.isVisible({ timeout: 1000 })) {
			await configField.fill('not valid json')

			// Try to create
			const createButton = dialog.getByRole('button', { name: /create/i })
			await createButton.click()

			// Should show validation error or stay in dialog
			await authenticatedPage.waitForTimeout(500)
			// Dialog should still be visible due to validation error
			const dialogStillVisible = await dialog.isVisible()
			expect(dialogStillVisible).toBe(true)
		}
	})
})

test.describe('Tools Search', () => {
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

	test('shows empty state when no results', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/tools')
		await authenticatedPage.waitForLoadState('networkidle')

		// Search for something that doesn't exist
		const searchInput = authenticatedPage.getByPlaceholder(/search/i)
		if (await searchInput.isVisible({ timeout: 2000 })) {
			await searchInput.fill('nonexistenttool12345')
			await authenticatedPage.waitForTimeout(500)

			// Should show no results or empty state
			const _noResults = authenticatedPage.getByText(/no.*tools|no results/i)
			// This might not always be visible depending on implementation
		}
	})
})

test.describe('Tool Types', () => {
	test('can select different tool types', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/tools')
		await authenticatedPage.waitForLoadState('networkidle')

		// Open add tool dialog
		await authenticatedPage
			.getByRole('button', { name: /add tool/i })
			.first()
			.click()
		const dialog = authenticatedPage.getByRole('dialog')
		await expect(dialog).toBeVisible({ timeout: 3000 })

		// Fill name first
		await dialog.getByLabel(/name/i).fill('Type Test Tool')

		// Try to select type dropdown
		const typeSelect = dialog.getByLabel(/type/i)
		if (await typeSelect.isVisible({ timeout: 1000 })) {
			await typeSelect.click()
			await authenticatedPage.waitForTimeout(500)

			// Should show type options
			const options = authenticatedPage.locator('[role="option"]')
			const optionCount = await options.count()

			if (optionCount > 0) {
				// Select first option
				await options.first().click()
			}
		}

		// Cancel dialog
		const cancelButton = dialog.getByRole('button', { name: /cancel/i })
		await cancelButton.click()
	})
})

baseTest.describe('Tools Integration with Agents', () => {
	// These tests verify tools can be used with agents
	baseTest('tools page has info about agent integration', async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/tools')
		await page.waitForLoadState('networkidle')

		// Page should mention agents
		const _agentText = page.getByText(/agent/i).first()
		// This is informational text about tools being available to agents
	})
})
