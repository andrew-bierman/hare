import { test as baseTest, expect, type Page } from '@playwright/test'
import { test } from './fixtures'

/**
 * Tools Page E2E tests.
 * Tests the tools listing, tool creation, and tool management functionality.
 */

// ============================================================================
// Route Protection
// ============================================================================

baseTest.describe('Tools Route Protection', () => {
	baseTest('unauthenticated user is redirected from tools to sign-in', async ({ page }) => {
		await page.goto('/dashboard/tools')
		await page.waitForLoadState('networkidle')
		await page.waitForURL(/\/sign-in/, { timeout: 10000 })
		await expect(page).toHaveURL(/\/sign-in/)
	})

	baseTest('unauthenticated user is redirected from new tool to sign-in', async ({ page }) => {
		await page.goto('/dashboard/tools/new')
		await page.waitForLoadState('networkidle')
		await page.waitForURL(/\/sign-in/, { timeout: 10000 })
		await expect(page).toHaveURL(/\/sign-in/)
	})
})

// ============================================================================
// Tools List Page
// ============================================================================

test.describe('Tools List Page', () => {
	test('displays tools page with heading', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/tools')
		await authenticatedPage.waitForLoadState('networkidle')

		// Wait for workspace to load
		await expect(authenticatedPage.locator('main')).toBeVisible({ timeout: 20000 })
	})

	test('shows system tools section', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/tools')
		await authenticatedPage.waitForLoadState('networkidle')

		// Wait for page content to load
		await expect(authenticatedPage.locator('main')).toBeVisible({ timeout: 20000 })

		// Should show system tools heading or system tools content
		const systemToolsHeading = authenticatedPage.getByRole('heading', { name: /system tools/i })
		const systemBadge = authenticatedPage.getByText('System', { exact: true }).first()

		const hasSystemTools =
			(await systemToolsHeading.isVisible({ timeout: 10000 }).catch(() => false)) ||
			(await systemBadge.isVisible({ timeout: 5000 }).catch(() => false))

		expect(hasSystemTools).toBeTruthy()
	})

	test('displays tool cards', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/tools')
		await authenticatedPage.waitForLoadState('networkidle')
		await expect(authenticatedPage.locator('main')).toBeVisible({ timeout: 20000 })

		// Should have multiple tool cards
		const toolCards = authenticatedPage.locator('[class*="card"]')
		const count = await toolCards.count()
		expect(count).toBeGreaterThan(0)
	})

	test('shows KV storage tools', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/tools')
		await authenticatedPage.waitForLoadState('networkidle')
		await expect(authenticatedPage.locator('main')).toBeVisible({ timeout: 20000 })

		// Should show KV tools
		await expect(authenticatedPage.getByText('KV Get')).toBeVisible({ timeout: 10000 })
	})

	test('shows R2 storage tools', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/tools')
		await authenticatedPage.waitForLoadState('networkidle')
		await expect(authenticatedPage.locator('main')).toBeVisible({ timeout: 20000 })

		// Should show R2 tools
		await expect(authenticatedPage.getByText('R2 Get')).toBeVisible({ timeout: 10000 })
	})

	test('has search functionality', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/tools')
		await authenticatedPage.waitForLoadState('networkidle')
		await expect(authenticatedPage.locator('main')).toBeVisible({ timeout: 20000 })

		// Look for search input
		const searchInput = authenticatedPage.getByPlaceholder(/search/i)
		await expect(searchInput.first()).toBeVisible({ timeout: 10000 })
	})

	test('can search for tools', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/tools')
		await authenticatedPage.waitForLoadState('networkidle')
		await expect(authenticatedPage.locator('main')).toBeVisible({ timeout: 20000 })

		// Find and use search input
		const searchInput = authenticatedPage.getByPlaceholder(/search/i)
		await searchInput.first().click()
		await searchInput.first().pressSequentially('KV', { delay: 50 })
		await authenticatedPage.waitForTimeout(500)

		// Should filter to show KV tools
		await expect(authenticatedPage.getByText('KV Get')).toBeVisible()
	})

	test('has create tool action', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/tools')
		await authenticatedPage.waitForLoadState('networkidle')
		await expect(authenticatedPage.locator('main')).toBeVisible({ timeout: 20000 })

		// Look for create/add tool button
		const createButton = authenticatedPage.getByRole('button', { name: /create|add|new/i })
		const createLink = authenticatedPage.getByRole('link', { name: /create|add|new/i })

		const hasCreate =
			(await createButton.first().isVisible({ timeout: 5000 }).catch(() => false)) ||
			(await createLink.first().isVisible({ timeout: 2000 }).catch(() => false))

		expect(hasCreate).toBeTruthy()
	})
})

// ============================================================================
// Create HTTP Tool Page
// ============================================================================

test.describe('Create HTTP Tool Page', () => {
	test('displays create tool form', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/tools/new')
		await authenticatedPage.waitForLoadState('networkidle')
		await expect(authenticatedPage.locator('main')).toBeVisible({ timeout: 20000 })
	})

	test('has name input field', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/tools/new')
		await authenticatedPage.waitForLoadState('networkidle')
		await expect(authenticatedPage.locator('main')).toBeVisible({ timeout: 20000 })

		// Look for name input
		const nameInput = authenticatedPage.getByLabel(/name/i)
		await expect(nameInput.first()).toBeVisible({ timeout: 10000 })
	})

	test('has URL input field', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/tools/new')
		await authenticatedPage.waitForLoadState('networkidle')
		await expect(authenticatedPage.locator('main')).toBeVisible({ timeout: 20000 })

		// Look for URL input
		const urlInput = authenticatedPage.getByLabel(/url/i)
		const urlPlaceholder = authenticatedPage.getByPlaceholder(/url|endpoint|http/i)

		const hasUrl =
			(await urlInput.isVisible({ timeout: 5000 }).catch(() => false)) ||
			(await urlPlaceholder.isVisible({ timeout: 2000 }).catch(() => false))

		expect(hasUrl).toBeTruthy()
	})

	test('has HTTP method selector', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/tools/new')
		await authenticatedPage.waitForLoadState('networkidle')
		await expect(authenticatedPage.locator('main')).toBeVisible({ timeout: 20000 })

		// Look for method selector - could be dropdown or buttons
		const methodText = authenticatedPage.getByText(/get|post/i)
		await expect(methodText.first()).toBeVisible({ timeout: 10000 })
	})

	test('has create tool button', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/tools/new')
		await authenticatedPage.waitForLoadState('networkidle')
		await expect(authenticatedPage.locator('main')).toBeVisible({ timeout: 20000 })

		// Look for create button
		const createButton = authenticatedPage.getByRole('button', { name: /create tool|save/i })
		await expect(createButton).toBeVisible({ timeout: 10000 })
	})

	test('has cancel button', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/tools/new')
		await authenticatedPage.waitForLoadState('networkidle')
		await expect(authenticatedPage.locator('main')).toBeVisible({ timeout: 20000 })

		// Look for cancel button
		const cancelButton = authenticatedPage.getByRole('button', { name: /cancel/i })
		await expect(cancelButton).toBeVisible({ timeout: 10000 })
	})

	test('cancel returns to tools list', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/tools/new')
		await authenticatedPage.waitForLoadState('networkidle')
		await expect(authenticatedPage.locator('main')).toBeVisible({ timeout: 20000 })

		// Click cancel
		const cancelButton = authenticatedPage.getByRole('button', { name: /cancel/i })
		await cancelButton.click()

		// Should navigate back
		await authenticatedPage.waitForURL(/\/dashboard\/tools$/, { timeout: 10000 })
	})

	test('create button is disabled without required fields', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/tools/new')
		await authenticatedPage.waitForLoadState('networkidle')
		await expect(authenticatedPage.locator('main')).toBeVisible({ timeout: 20000 })

		// Create button should be disabled initially
		const createButton = authenticatedPage.getByRole('button', { name: /create tool/i })
		await expect(createButton).toBeDisabled()
	})

	test('has headers section', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/tools/new')
		await authenticatedPage.waitForLoadState('networkidle')
		await expect(authenticatedPage.locator('main')).toBeVisible({ timeout: 20000 })

		// Look for headers section
		const headersText = authenticatedPage.getByText(/headers/i)
		await expect(headersText.first()).toBeVisible({ timeout: 10000 })
	})

	test('has parameters section', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/tools/new')
		await authenticatedPage.waitForLoadState('networkidle')
		await expect(authenticatedPage.locator('main')).toBeVisible({ timeout: 20000 })

		// Look for parameters section
		const paramsText = authenticatedPage.getByText(/parameter/i)
		await expect(paramsText.first()).toBeVisible({ timeout: 10000 })
	})

	test('has test tool section', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/tools/new')
		await authenticatedPage.waitForLoadState('networkidle')
		await expect(authenticatedPage.locator('main')).toBeVisible({ timeout: 20000 })

		// Look for test section
		const testText = authenticatedPage.getByText(/test tool/i)
		const testButton = authenticatedPage.getByRole('button', { name: /test|run/i })

		const hasTest =
			(await testText.isVisible({ timeout: 5000 }).catch(() => false)) ||
			(await testButton.isVisible({ timeout: 2000 }).catch(() => false))

		expect(hasTest).toBeTruthy()
	})
})

// ============================================================================
// Tool Form Validation
// ============================================================================

test.describe('Tool Form Validation', () => {
	test('enables create button when required fields filled', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/tools/new')
		await authenticatedPage.waitForLoadState('networkidle')
		await expect(authenticatedPage.locator('main')).toBeVisible({ timeout: 20000 })

		// Fill name
		const nameInput = authenticatedPage.getByLabel(/^name/i).first()
		await nameInput.click()
		await nameInput.pressSequentially('Test Tool', { delay: 15 })

		// Fill URL
		const urlInput = authenticatedPage.getByLabel(/url/i)
		const urlPlaceholder = authenticatedPage.getByPlaceholder(/url|endpoint|http/i)
		const urlField = (await urlInput.isVisible().catch(() => false)) ? urlInput : urlPlaceholder

		await urlField.click()
		await urlField.pressSequentially('https://api.example.com/test', { delay: 15 })

		// Create button should be enabled
		const createButton = authenticatedPage.getByRole('button', { name: /create tool/i })
		await expect(createButton).toBeEnabled({ timeout: 5000 })
	})
})

// ============================================================================
// Responsive Design
// ============================================================================

test.describe('Tools Page - Responsive', () => {
	test('displays correctly on mobile', async ({ authenticatedPage }) => {
		await authenticatedPage.setViewportSize({ width: 375, height: 667 })
		await authenticatedPage.goto('/dashboard/tools')
		await authenticatedPage.waitForLoadState('networkidle')
		await expect(authenticatedPage.locator('main')).toBeVisible({ timeout: 20000 })
	})

	test('displays correctly on tablet', async ({ authenticatedPage }) => {
		await authenticatedPage.setViewportSize({ width: 768, height: 1024 })
		await authenticatedPage.goto('/dashboard/tools')
		await authenticatedPage.waitForLoadState('networkidle')
		await expect(authenticatedPage.locator('main')).toBeVisible({ timeout: 20000 })
	})
})
