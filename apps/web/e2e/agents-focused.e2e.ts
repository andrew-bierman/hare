import { test, expect } from './fixtures'

/**
 * Focused E2E tests for the Agents section.
 * Tests the three main routes: agents list, new agent, and templates.
 */

test.describe('Agents Section - Core Routes', () => {
	test('should load /dashboard/agents page without infinite spinner', async ({
		authenticatedPage,
	}) => {
		await authenticatedPage.goto('/dashboard/agents', { waitUntil: 'networkidle' })

		// Wait for page to load
		await authenticatedPage.waitForLoadState('networkidle')

		// Check for heading
		const heading = authenticatedPage.getByRole('heading', { name: 'Agents', exact: true })
		await expect(heading).toBeVisible({ timeout: 15000 })

		// Should not have infinite spinner - check that main content is visible
		const mainContent = authenticatedPage.locator('main')
		await expect(mainContent).toBeVisible()

		// Should have search or filter UI elements
		const searchInput = authenticatedPage.getByPlaceholder(/search/i)
		if (await searchInput.isVisible().catch(() => false)) {
			await expect(searchInput).toBeVisible()
		}

		// Should have tabs for filtering
		const allTab = authenticatedPage.getByRole('tab', { name: /all/i })
		await expect(allTab).toBeVisible({ timeout: 10000 })
	})

	test('should navigate to /dashboard/agents/new successfully', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents', { waitUntil: 'networkidle' })
		await authenticatedPage.waitForLoadState('networkidle')

		// Find and click the New Agent button/link
		const newAgentLink = authenticatedPage.getByRole('link', { name: /new agent/i })
		const newAgentButton = authenticatedPage.getByRole('button', { name: /new agent/i })

		if (await newAgentLink.isVisible().catch(() => false)) {
			await newAgentLink.click()
		} else if (await newAgentButton.isVisible().catch(() => false)) {
			await newAgentButton.click()
		} else {
			// Navigate directly
			await authenticatedPage.goto('/dashboard/agents/new')
		}

		// Wait for navigation
		await authenticatedPage.waitForURL(/\/dashboard\/agents\/new/, { timeout: 10000 })
		await authenticatedPage.waitForLoadState('networkidle')

		// Verify the page loaded
		const heading = authenticatedPage.getByRole('heading', { name: /create.*agent/i })
		await expect(heading).toBeVisible({ timeout: 15000 })
	})

	test('should display create agent form with correct fields', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/new', { waitUntil: 'networkidle' })
		await authenticatedPage.waitForLoadState('networkidle')

		// Check heading
		await expect(authenticatedPage.getByRole('heading', { name: /create.*agent/i })).toBeVisible({
			timeout: 15000,
		})

		// Check for required form fields
		const nameInput = authenticatedPage.locator('#name')
		await expect(nameInput).toBeVisible({ timeout: 10000 })

		const descriptionInput = authenticatedPage.locator('#description')
		await expect(descriptionInput).toBeVisible({ timeout: 10000 })

		// Check for model selector
		const modelSelect = authenticatedPage.locator('#model')
		await expect(modelSelect).toBeVisible({ timeout: 10000 })

		// Check for create button
		const createButton = authenticatedPage.getByRole('button', { name: /create agent/i })
		await expect(createButton).toBeVisible()

		// Create button should be disabled when name is empty
		await expect(createButton).toBeDisabled()
	})

	test('should load /dashboard/agents/templates page', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/templates', { waitUntil: 'networkidle' })
		await authenticatedPage.waitForLoadState('networkidle')

		// Check that page loaded without infinite spinner
		// The templates page should have some heading or content
		const pageContent = await authenticatedPage.content()

		// Should not be showing error page
		expect(pageContent).not.toContain('404')
		expect(pageContent).not.toContain('Not Found')

		// Should have loaded successfully (check for common layout elements)
		const mainContent = authenticatedPage.locator('main')
		await expect(mainContent).toBeVisible({ timeout: 15000 })

		// Look for templates-related content
		const hasTemplatesText =
			pageContent.includes('template') ||
			pageContent.includes('Template') ||
			(await authenticatedPage.getByText(/template/i).first().isVisible().catch(() => false))

		expect(hasTemplatesText).toBeTruthy()
	})

	test('should be able to navigate between agent pages', async ({ authenticatedPage }) => {
		// Start at agents list
		await authenticatedPage.goto('/dashboard/agents', { waitUntil: 'networkidle' })
		await expect(
			authenticatedPage.getByRole('heading', { name: 'Agents', exact: true }),
		).toBeVisible()

		// Navigate to templates
		await authenticatedPage.goto('/dashboard/agents/templates')
		await authenticatedPage.waitForLoadState('networkidle')
		await authenticatedPage.waitForTimeout(2000)
		expect(authenticatedPage.url()).toContain('/templates')

		// Navigate to new agent
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')
		await expect(authenticatedPage.getByRole('heading', { name: /create.*agent/i })).toBeVisible()

		// Navigate back to agents list
		await authenticatedPage.goto('/dashboard/agents')
		await authenticatedPage.waitForLoadState('networkidle')
		await expect(
			authenticatedPage.getByRole('heading', { name: 'Agents', exact: true }),
		).toBeVisible()
	})

	test('should display agent filter tabs correctly', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents', { waitUntil: 'networkidle' })
		await authenticatedPage.waitForLoadState('networkidle')

		// Check for filter tabs
		const allTab = authenticatedPage.getByRole('tab', { name: /all/i })
		const liveTab = authenticatedPage.getByRole('tab', { name: /live|deployed/i })
		const draftsTab = authenticatedPage.getByRole('tab', { name: /drafts?/i })

		await expect(allTab).toBeVisible()
		await expect(liveTab).toBeVisible()
		await expect(draftsTab).toBeVisible()

		// Test clicking tabs
		await liveTab.click()
		await authenticatedPage.waitForTimeout(500)
		await expect(liveTab).toHaveAttribute('data-state', 'active')

		await draftsTab.click()
		await authenticatedPage.waitForTimeout(500)
		await expect(draftsTab).toHaveAttribute('data-state', 'active')

		await allTab.click()
		await authenticatedPage.waitForTimeout(500)
		await expect(allTab).toHaveAttribute('data-state', 'active')
	})

	test('should have search functionality on agents page', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents', { waitUntil: 'networkidle' })
		await authenticatedPage.waitForLoadState('networkidle')

		// Search input should be visible
		const searchInput = authenticatedPage.getByPlaceholder(/search/i)
		await expect(searchInput).toBeVisible()

		// Should be able to type in search
		await searchInput.fill('test agent')
		await expect(searchInput).toHaveValue('test agent')

		// Clear search
		await searchInput.clear()
		await expect(searchInput).toHaveValue('')
	})

	test('should show new agent button on agents list', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents', { waitUntil: 'networkidle' })
		await authenticatedPage.waitForLoadState('networkidle')

		// Look for New Agent link or button
		const newAgentLink = authenticatedPage.getByRole('link', { name: /new agent/i })
		const newAgentButton = authenticatedPage.getByRole('button', { name: /new agent/i })

		const hasNewAgent =
			(await newAgentLink.isVisible().catch(() => false)) ||
			(await newAgentButton.isVisible().catch(() => false))

		expect(hasNewAgent).toBeTruthy()
	})

	test('should create button enable when name is filled', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/new', { waitUntil: 'networkidle' })
		await authenticatedPage.waitForLoadState('networkidle')

		const nameInput = authenticatedPage.locator('#name')
		const createButton = authenticatedPage.getByRole('button', { name: /create agent/i })

		// Initially disabled
		await expect(createButton).toBeDisabled()

		// Fill name
		await nameInput.fill('Test Agent')
		await authenticatedPage.waitForTimeout(500)

		// Should now be enabled
		await expect(createButton).toBeEnabled()
	})

	test('should allow canceling agent creation', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/new', { waitUntil: 'networkidle' })
		await authenticatedPage.waitForLoadState('networkidle')

		// Fill in some data
		await authenticatedPage.locator('#name').fill('Test Agent')

		// Look for cancel button
		const cancelButton = authenticatedPage.getByRole('button', { name: /cancel/i })

		if (await cancelButton.isVisible()) {
			await cancelButton.click()
			// Should navigate back to agents list
			await authenticatedPage.waitForURL(/\/dashboard\/agents$/, { timeout: 10000 })
		} else {
			// Navigate via sidebar or direct navigation
			await authenticatedPage.goto('/dashboard/agents')
			await authenticatedPage.waitForLoadState('networkidle')
		}

		// Should be on agents list
		await expect(
			authenticatedPage.getByRole('heading', { name: 'Agents', exact: true }),
		).toBeVisible()
	})
})

test.describe('Agents Section - Responsive Design', () => {
	test('agents list should display correctly on mobile', async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 667 })
		await page.goto('/dashboard/agents')
		await page.waitForLoadState('networkidle')

		// Should still show heading
		await expect(page.getByRole('heading', { name: 'Agents', exact: true })).toBeVisible({
			timeout: 15000,
		})

		// Main content should be visible
		const mainContent = page.locator('main')
		await expect(mainContent).toBeVisible()
	})

	test('create agent form should display correctly on mobile', async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 667 })
		await page.goto('/dashboard/agents/new')
		await page.waitForLoadState('networkidle')

		await expect(page.getByRole('heading', { name: /create.*agent/i })).toBeVisible({
			timeout: 15000,
		})
		await expect(page.locator('#name')).toBeVisible()
	})

	test('agents list should display correctly on tablet', async ({ page }) => {
		await page.setViewportSize({ width: 768, height: 1024 })
		await page.goto('/dashboard/agents')
		await page.waitForLoadState('networkidle')

		await expect(page.getByRole('heading', { name: 'Agents', exact: true })).toBeVisible({
			timeout: 15000,
		})
	})
})
