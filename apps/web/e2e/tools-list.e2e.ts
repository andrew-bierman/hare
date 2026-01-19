import { expect } from '@playwright/test'
import { test } from './fixtures'

/**
 * Tools List Page E2E tests.
 * Tests the tools list page including system tools, custom tools,
 * collapsible sections, search functionality, and navigation.
 *
 * Note: All tests require authentication since /dashboard/tools is a protected route.
 */

// Helper to navigate to tools page and wait for it to load
async function navigateToToolsPage(page: import('@playwright/test').Page) {
	// Navigate to tools page
	await page.goto('/dashboard/tools')

	// Wait for URL to be tools page
	await page.waitForURL(/\/dashboard\/tools/, { timeout: 15000 })

	// Wait for network to settle
	await page.waitForLoadState('networkidle')

	// Wait for the tools page heading to be visible - this ensures the React app has rendered
	await expect(page.getByRole('heading', { name: 'Tools', exact: true })).toBeVisible({
		timeout: 30000,
	})
}

// ============================================================================
// Page Load and Display Tests
// ============================================================================

test.describe('Tools List Page - Load and Display', () => {
	test('tools page loads with system and custom sections', async ({ authenticatedPage }) => {
		await navigateToToolsPage(authenticatedPage)

		// Both sections should be visible
		await expect(
			authenticatedPage.locator('button').filter({ hasText: 'System Tools' }),
		).toBeVisible()
		await expect(
			authenticatedPage.locator('button').filter({ hasText: 'Custom Tools' }),
		).toBeVisible()
	})
})

// ============================================================================
// System Tools Section Tests
// ============================================================================

test.describe('Tools List Page - System Tools Section', () => {
	test('system tools section shows built-in tools', async ({ authenticatedPage }) => {
		await navigateToToolsPage(authenticatedPage)

		// System Tools section trigger should be visible
		await expect(
			authenticatedPage.locator('button').filter({ hasText: 'System Tools' }),
		).toBeVisible()

		// Should show KV tools (built-in system tools)
		await expect(authenticatedPage.getByText('KV Get')).toBeVisible()
		await expect(authenticatedPage.getByText('KV Put')).toBeVisible()
	})

	test('system tools section is collapsible', async ({ authenticatedPage }) => {
		await navigateToToolsPage(authenticatedPage)

		// System tools should be visible initially (section is open by default)
		await expect(authenticatedPage.getByText('KV Get')).toBeVisible()

		// Click the System Tools collapsible trigger to collapse
		const systemToolsTrigger = authenticatedPage
			.locator('button')
			.filter({ hasText: 'System Tools' })
		await systemToolsTrigger.click()
		await authenticatedPage.waitForTimeout(500)

		// KV Get should now be hidden
		await expect(authenticatedPage.getByText('KV Get')).not.toBeVisible()

		// Click again to expand
		await systemToolsTrigger.click()
		await authenticatedPage.waitForTimeout(500)

		// KV Get should be visible again
		await expect(authenticatedPage.getByText('KV Get')).toBeVisible()
	})

	test('system tools cannot be edited (no edit option)', async ({ authenticatedPage }) => {
		await navigateToToolsPage(authenticatedPage)

		// Find a system tool row (KV Get)
		const systemToolRow = authenticatedPage.locator('tr').filter({ hasText: 'KV Get' })
		await expect(systemToolRow).toBeVisible()

		// System tools table should not have delete buttons in its rows
		// The custom tools table has a 4th column for actions, system tools only have 3 columns
		const cells = systemToolRow.locator('td')
		const cellCount = await cells.count()

		// System tools have 3 columns (name, type, description) - no action column
		expect(cellCount).toBe(3)
	})
})

// ============================================================================
// Custom Tools Section Tests
// ============================================================================

test.describe('Tools List Page - Custom Tools Section', () => {
	test('custom tools section shows user-created tools', async ({ authenticatedPage }) => {
		await navigateToToolsPage(authenticatedPage)

		// Custom Tools section trigger should be visible
		await expect(
			authenticatedPage.locator('button').filter({ hasText: 'Custom Tools' }),
		).toBeVisible()
	})

	test('custom tools section is collapsible', async ({ authenticatedPage }) => {
		await navigateToToolsPage(authenticatedPage)

		// Get custom tools section trigger
		const customToolsTrigger = authenticatedPage
			.locator('button')
			.filter({ hasText: 'Custom Tools' })
		await expect(customToolsTrigger).toBeVisible()

		// Check for empty state visibility before collapse
		const emptyStateHeading = authenticatedPage.getByRole('heading', { name: 'No custom tools' })
		const emptyStateVisible = await emptyStateHeading.isVisible().catch(() => false)

		// Click to collapse
		await customToolsTrigger.click()
		await authenticatedPage.waitForTimeout(500)

		// Content should be hidden after collapse
		if (emptyStateVisible) {
			await expect(emptyStateHeading).not.toBeVisible()
		}

		// Click again to expand
		await customToolsTrigger.click()
		await authenticatedPage.waitForTimeout(500)

		// Content should be visible again
		// Check for either empty state or tool table content
		const hasEmptyState = await emptyStateHeading.isVisible().catch(() => false)
		const hasToolTable = await authenticatedPage
			.locator('table')
			.last()
			.isVisible()
			.catch(() => false)

		expect(hasEmptyState || hasToolTable).toBeTruthy()
	})
})

// ============================================================================
// Search Functionality Tests
// ============================================================================

test.describe('Tools List Page - Search Functionality', () => {
	test('search filters tools by name', async ({ authenticatedPage }) => {
		await navigateToToolsPage(authenticatedPage)

		// Search input should be visible
		const searchInput = authenticatedPage.getByPlaceholder('Search tools...')
		await expect(searchInput).toBeVisible()

		// Search for KV tools
		await searchInput.fill('KV')
		await authenticatedPage.waitForTimeout(500)

		// KV tools should be visible
		await expect(authenticatedPage.getByText('KV Get')).toBeVisible()
		await expect(authenticatedPage.getByText('KV Put')).toBeVisible()

		// R2 tools should be hidden (filtered out)
		await expect(authenticatedPage.getByText('R2 Get')).not.toBeVisible()
	})

	test('search filters tools by description', async ({ authenticatedPage }) => {
		await navigateToToolsPage(authenticatedPage)

		const searchInput = authenticatedPage.getByPlaceholder('Search tools...')
		await expect(searchInput).toBeVisible()

		// Search for "key-value" which appears in KV tool descriptions
		await searchInput.fill('key-value')
		await authenticatedPage.waitForTimeout(500)

		// KV tools should be visible (they have "key-value" in description)
		// At least one KV-related tool should be visible
		const kvToolsVisible = await authenticatedPage.getByText('KV').first().isVisible()
		expect(kvToolsVisible).toBeTruthy()
	})
})

// ============================================================================
// Action Buttons Tests
// ============================================================================

test.describe('Tools List Page - Action Buttons', () => {
	test('Quick Add button opens dialog', async ({ authenticatedPage }) => {
		await navigateToToolsPage(authenticatedPage)

		// Quick Add button should be visible
		const quickAddButton = authenticatedPage.getByRole('button', { name: 'Quick Add' })
		await expect(quickAddButton).toBeVisible()

		// Click Quick Add button
		await quickAddButton.click()
		await authenticatedPage.waitForTimeout(500)

		// Dialog should open - check for dialog role
		const dialog = authenticatedPage.locator('[role="dialog"]')
		await expect(dialog).toBeVisible()
	})

	test('Create HTTP Tool button navigates to create page', async ({ authenticatedPage }) => {
		await navigateToToolsPage(authenticatedPage)

		// Create HTTP Tool button should be visible (it's a link styled as button)
		const createHttpToolButton = authenticatedPage.getByRole('link', {
			name: /Create HTTP Tool/i,
		})
		await expect(createHttpToolButton).toBeVisible()

		// Click Create HTTP Tool button
		await createHttpToolButton.click()

		// Should navigate to tools/new page
		await authenticatedPage.waitForURL(/\/dashboard\/tools\/new/, { timeout: 10000 })
		expect(authenticatedPage.url()).toContain('/dashboard/tools/new')
	})
})

// ============================================================================
// Tool Cards Display Tests
// ============================================================================

test.describe('Tools List Page - Tool Cards Display', () => {
	test('tool cards show name, description, type', async ({ authenticatedPage }) => {
		await navigateToToolsPage(authenticatedPage)

		// Find a system tool row
		const toolRow = authenticatedPage.locator('tr').filter({ hasText: 'KV Get' })
		await expect(toolRow).toBeVisible()

		// Row should show name
		await expect(toolRow.getByText('KV Get')).toBeVisible()

		// Row should show type badge
		const typeBadge = toolRow.locator('[data-slot="badge"]')
		await expect(typeBadge).toBeVisible()

		// Row should have description (3rd cell)
		const descriptionCell = toolRow.locator('td').nth(2)
		await expect(descriptionCell).toBeVisible()
		const descText = await descriptionCell.textContent()
		expect(descText?.length).toBeGreaterThan(0)
	})
})

// ============================================================================
// Custom Tool Interaction Tests
// ============================================================================

test.describe('Tools List Page - Custom Tool Interaction', () => {
	test('clicking custom tool card shows edit options (delete button)', async ({
		authenticatedPage,
	}) => {
		await navigateToToolsPage(authenticatedPage)

		// Check if there are any custom tools by looking at the empty state
		const emptyStateHeading = authenticatedPage.getByRole('heading', { name: 'No custom tools' })
		const hasEmptyState = await emptyStateHeading.isVisible().catch(() => false)

		if (hasEmptyState) {
			// No custom tools exist - empty state is shown with Add Tool button
			const addToolButton = authenticatedPage.getByRole('button', { name: 'Add Tool' })
			await expect(addToolButton).toBeVisible()
		} else {
			// Custom tools exist - they should have delete buttons (4th column)
			// Find the custom tools table (the second table or the one with delete buttons)
			const customToolsSection = authenticatedPage.locator('table').last()
			const deleteButtons = customToolsSection.locator('button')
			const buttonCount = await deleteButtons.count()

			// If there are custom tools, there should be delete buttons
			expect(buttonCount).toBeGreaterThan(0)
		}
	})
})

// ============================================================================
// Tools Count Display Tests
// ============================================================================

test.describe('Tools List Page - Tools Count', () => {
	test('page displays total tools count', async ({ authenticatedPage }) => {
		await navigateToToolsPage(authenticatedPage)

		// Should show "X tools available" text
		const toolsCountText = authenticatedPage.getByText(/\d+ tools available/)
		await expect(toolsCountText).toBeVisible()
	})

	test('system tools section shows count badge', async ({ authenticatedPage }) => {
		await navigateToToolsPage(authenticatedPage)

		// System Tools trigger should have a count badge
		const systemToolsTrigger = authenticatedPage
			.locator('button')
			.filter({ hasText: 'System Tools' })
		await expect(systemToolsTrigger).toBeVisible()

		// Should contain a badge with a number
		const badge = systemToolsTrigger.locator('[data-slot="badge"]')
		await expect(badge).toBeVisible()

		// Badge should contain a number
		const badgeText = await badge.textContent()
		expect(badgeText).toMatch(/\d+/)
	})

	test('custom tools section shows count badge', async ({ authenticatedPage }) => {
		await navigateToToolsPage(authenticatedPage)

		// Custom Tools trigger should have a count badge
		const customToolsTrigger = authenticatedPage
			.locator('button')
			.filter({ hasText: 'Custom Tools' })
		await expect(customToolsTrigger).toBeVisible()

		// Should contain a badge with a number
		const badge = customToolsTrigger.locator('[data-slot="badge"]')
		await expect(badge).toBeVisible()

		// Badge should contain a number (could be 0)
		const badgeText = await badge.textContent()
		expect(badgeText).toMatch(/\d+/)
	})
})
