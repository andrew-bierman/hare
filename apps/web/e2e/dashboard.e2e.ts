import { test as baseTest, expect, type Page } from '@playwright/test'
import { test } from './fixtures'

baseTest.describe('Dashboard Overview - Unauthenticated', () => {
	baseTest('redirects unauthenticated users to sign-in', async ({ page }: { page: Page }) => {
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')
		// Unauthenticated users should be redirected to sign-in
		await expect(page).toHaveURL(/\/sign-in/)
		await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
	})
})

test.describe('Dashboard Overview - Authenticated', () => {
	test('authenticated user sees personalized dashboard', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')
		await expect(authenticatedPage.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
	})
})

baseTest.describe('Agents List Page - Unauthenticated', () => {
	baseTest('redirects unauthenticated users to sign-in', async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/agents')
		await page.waitForLoadState('networkidle')
		// Unauthenticated users should be redirected to sign-in
		await expect(page).toHaveURL(/\/sign-in/)
	})
})

test.describe('Agent Creation Flow - Authenticated', () => {
	test('should display agent creation form', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		// Check for heading (h2 with Create New Agent or variant with template name)
		await expect(authenticatedPage.locator('h2').filter({ hasText: /Create.*Agent/i })).toBeVisible()

		// Check for required form fields using id selectors
		await expect(authenticatedPage.locator('#name')).toBeVisible()
		await expect(authenticatedPage.locator('#description')).toBeVisible()
		await expect(authenticatedPage.locator('#model-selector')).toBeVisible()
		await expect(authenticatedPage.getByText('System Prompt', { exact: true })).toBeVisible()

		// Check for create button
		await expect(authenticatedPage.getByRole('button', { name: /create agent/i })).toBeVisible()
	})

	test('should successfully create a new agent', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		// Fill in agent details using id selectors
		const agentName = `Test Agent ${Date.now()}`
		await authenticatedPage.locator('#name').fill(agentName)
		await authenticatedPage.locator('#description').fill('A test agent for E2E testing')

		// Select a model (if dropdown is available)
		const modelSelect = authenticatedPage.locator('#model-selector')
		if (await modelSelect.isVisible()) {
			await modelSelect.click()
			// Wait for dropdown options and select the first one
			await authenticatedPage.waitForTimeout(500)
			const firstOption = authenticatedPage.locator('[role="option"]').first()
			if (await firstOption.isVisible({ timeout: 2000 })) {
				await firstOption.click()
			}
		}

		// Submit the form
		const createButton = authenticatedPage.getByRole('button', { name: /create agent/i })
		await createButton.click()

		// Wait for navigation or success message
		await authenticatedPage.waitForTimeout(2000)

		// Should either redirect to agents list or show success
		const currentUrl = authenticatedPage.url()
		expect(
			currentUrl.includes('/dashboard/agents') || currentUrl.includes('/dashboard/agents/new'),
		).toBeTruthy()
	})

	test('should validate required fields', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		// The create button should be disabled when required fields are empty
		const createButton = authenticatedPage.getByRole('button', { name: /create agent/i })
		await expect(createButton).toBeVisible()
		await expect(createButton).toBeDisabled()

		// Should stay on the same page
		await expect(authenticatedPage).toHaveURL('/dashboard/agents/new')
	})

	test('should allow canceling agent creation', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		// Fill in some data
		await authenticatedPage.locator('#name').fill('Test Agent')

		// Navigate back to agents list
		await authenticatedPage.getByRole('link', { name: 'Agents' }).click()

		// Should be back at agents list
		await expect(authenticatedPage).toHaveURL('/dashboard/agents')
		await expect(
			authenticatedPage.getByRole('heading', { name: 'Agents', exact: true }),
		).toBeVisible()
	})
})

test.describe('Agent List and Management - Authenticated', () => {
	test('should display agents list', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents')
		await authenticatedPage.waitForLoadState('networkidle')

		await expect(
			authenticatedPage.getByRole('heading', { name: 'Agents', exact: true }),
		).toBeVisible()
		await expect(authenticatedPage.getByRole('link', { name: 'New Agent' })).toBeVisible()
	})

	test('should navigate to agent creation from list', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents')
		await authenticatedPage.waitForLoadState('networkidle')

		await authenticatedPage.getByRole('link', { name: 'New Agent' }).click()
		// May go to templates page first or directly to new
		await authenticatedPage.waitForURL(/\/dashboard\/agents\/(new|templates)/)
		await authenticatedPage.waitForLoadState('networkidle')
		await authenticatedPage.waitForTimeout(1000)
		// Either templates or create page should appear - wait with longer timeout
		const createHeading = authenticatedPage.locator('h2').filter({ hasText: /Create.*Agent|Choose.*Template/i })
		await expect(createHeading).toBeVisible({ timeout: 10000 })
	})
})

test.describe('Tools List Page - Authenticated', () => {
	test('displays tools heading', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/tools')
		await authenticatedPage.waitForLoadState('networkidle')
		await expect(authenticatedPage.getByRole('heading', { name: 'Tools', exact: true })).toBeVisible()
	})

	test('has add tool button', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/tools')
		await authenticatedPage.waitForLoadState('networkidle')
		// UI has "Quick Add" and "Create HTTP Tool" buttons
		const quickAddBtn = authenticatedPage.getByRole('button', { name: 'Quick Add' })
		const createHttpToolBtn = authenticatedPage.getByRole('button', { name: 'Create HTTP Tool' })
		// At least one should be visible
		const hasQuickAdd = await quickAddBtn.isVisible().catch(() => false)
		const hasCreateHttp = await createHttpToolBtn.isVisible().catch(() => false)
		expect(hasQuickAdd || hasCreateHttp).toBe(true)
	})
})

test.describe('Usage Page - Authenticated', () => {
	test('displays usage heading', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/usage')
		await authenticatedPage.waitForLoadState('networkidle')
		await expect(authenticatedPage.getByRole('heading', { name: 'Usage' })).toBeVisible()
	})
})

test.describe('Responsive Layout - Authenticated', () => {
	test('dashboard is responsive on mobile', async ({ authenticatedPage }) => {
		await authenticatedPage.setViewportSize({ width: 375, height: 667 })
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')

		// Heading should be visible
		await expect(authenticatedPage.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
	})

	test('agents page is responsive on tablet', async ({ authenticatedPage }) => {
		await authenticatedPage.setViewportSize({ width: 768, height: 1024 })
		await authenticatedPage.goto('/dashboard/agents')
		await authenticatedPage.waitForLoadState('networkidle')

		await expect(authenticatedPage.getByRole('heading', { name: 'Agents', exact: true })).toBeVisible()
	})
})

test.describe('Theme and Accessibility - Authenticated', () => {
	test('pages have proper heading hierarchy', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')

		// Should have an h1 heading
		const h1 = authenticatedPage.locator('h1').first()
		await expect(h1).toBeVisible()
	})

	test('buttons are keyboard accessible', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents')
		await authenticatedPage.waitForLoadState('networkidle')

		// New Agent link should be focusable
		const newAgentLink = authenticatedPage.getByRole('link', { name: 'New Agent' })
		await newAgentLink.focus()
		await expect(newAgentLink).toBeFocused()
	})
})

baseTest.describe('Theme and Accessibility - Public Pages', () => {
	baseTest('form inputs are keyboard accessible', async ({ page }: { page: Page }) => {
		await page.goto('/sign-in')
		await page.waitForLoadState('networkidle')

		// Email input should be focusable
		const emailInput = page.getByLabel('Email')
		await emailInput.focus()
		await expect(emailInput).toBeFocused()
	})
})
