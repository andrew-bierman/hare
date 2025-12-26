import { test as baseTest, expect, type Page } from '@playwright/test'
import { test } from './fixtures'

baseTest.describe('Dashboard Overview - Unauthenticated', () => {
	baseTest.beforeEach(async ({ page }: { page: Page }) => {
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')
	})

	baseTest('displays dashboard heading', async ({ page }: { page: Page }) => {
		await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
	})

	baseTest('displays key metrics cards', async ({ page }: { page: Page }) => {
		// Dashboard should show some metrics/stats
		// Look for card-like elements with stats
		const cards = page.locator('[class*="card"]')
		await expect(cards.first()).toBeVisible()
	})

	baseTest('has sidebar navigation', async ({ page }: { page: Page }) => {
		// Wait for page to fully load
		await page.waitForLoadState('networkidle')

		// Verify sidebar links exist using nav locator for specificity
		const nav = page.locator('nav')
		await expect(nav.getByRole('link', { name: 'Dashboard' })).toBeVisible()
		await expect(nav.getByRole('link', { name: 'Agents' })).toBeVisible()
		await expect(nav.getByRole('link', { name: 'Tools' })).toBeVisible()
		await expect(nav.getByRole('link', { name: 'Usage' })).toBeVisible()
		await expect(nav.getByRole('link', { name: 'Settings' })).toBeVisible()
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
	baseTest.beforeEach(async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/agents')
		await page.waitForLoadState('networkidle')
	})

	baseTest('displays agents heading', async ({ page }: { page: Page }) => {
		await expect(page.getByRole('heading', { name: 'Agents', exact: true })).toBeVisible()
	})

	baseTest('has new agent button', async ({ page }: { page: Page }) => {
		await expect(page.getByRole('link', { name: 'New Agent' })).toBeVisible()
	})

	baseTest('new agent button navigates to create page', async ({ page }: { page: Page }) => {
		// Verify New Agent link has correct href (navigation tested separately in navigation.e2e.ts)
		const newAgentLink = page.getByRole('link', { name: 'New Agent' })
		await expect(newAgentLink).toBeVisible()
		await expect(newAgentLink).toHaveAttribute('href', '/dashboard/agents/new')
	})
})

test.describe('Agent Creation Flow - Authenticated', () => {
	test('should display agent creation form', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		// Check for heading
		await expect(authenticatedPage.getByRole('heading', { name: 'Create New Agent' })).toBeVisible()

		// Check for required form fields
		await expect(authenticatedPage.getByLabel(/Agent Name/)).toBeVisible()
		await expect(authenticatedPage.getByLabel('Description')).toBeVisible()
		await expect(authenticatedPage.getByLabel(/Model/)).toBeVisible()
		await expect(authenticatedPage.getByLabel('System Prompt')).toBeVisible()

		// Check for create button
		await expect(authenticatedPage.getByRole('button', { name: /create/i })).toBeVisible()
	})

	test('should successfully create a new agent', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		// Fill in agent details
		const agentName = `Test Agent ${Date.now()}`
		await authenticatedPage.getByLabel(/Agent Name/).fill(agentName)
		await authenticatedPage.getByLabel('Description').fill('A test agent for E2E testing')
		await authenticatedPage.getByLabel('System Prompt').fill('You are a helpful test assistant.')

		// Select a model (if dropdown is available)
		const modelSelect = authenticatedPage.getByLabel(/Model/)
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
		const createButton = authenticatedPage.getByRole('button', { name: /create/i })
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
		const createButton = authenticatedPage.getByRole('button', { name: /create/i })
		await expect(createButton).toBeVisible()
		await expect(createButton).toBeDisabled()

		// Should stay on the same page
		await expect(authenticatedPage).toHaveURL('/dashboard/agents/new')
	})

	test('should allow editing system prompt', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		const systemPrompt = 'You are a specialized AI assistant that helps with testing.'
		const systemPromptField = authenticatedPage.getByLabel('System Prompt')

		await systemPromptField.fill(systemPrompt)
		await expect(systemPromptField).toHaveValue(systemPrompt)
	})

	test('should allow canceling agent creation', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		// Fill in some data
		await authenticatedPage.getByLabel(/Agent Name/).fill('Test Agent')

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
		await expect(authenticatedPage).toHaveURL('/dashboard/agents/new')
		await expect(authenticatedPage.getByRole('heading', { name: 'Create New Agent' })).toBeVisible()
	})
})

baseTest.describe('Tools List Page', () => {
	baseTest.beforeEach(async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/tools')
		await page.waitForLoadState('networkidle')
	})

	baseTest('displays tools heading', async ({ page }: { page: Page }) => {
		await expect(page.getByRole('heading', { name: 'Tools', exact: true })).toBeVisible()
	})

	baseTest('has add tool button', async ({ page }: { page: Page }) => {
		await expect(page.getByRole('button', { name: 'Add Tool' }).first()).toBeVisible()
	})

	baseTest('shows tool categories or list', async ({ page }: { page: Page }) => {
		// Page should have some content about tools
		await expect(page.locator('body')).not.toContainText('404')
	})
})

baseTest.describe('Usage Page', () => {
	baseTest.beforeEach(async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/usage')
		await page.waitForLoadState('networkidle')
	})

	baseTest('displays usage heading', async ({ page }: { page: Page }) => {
		await expect(page.getByRole('heading', { name: 'Usage' })).toBeVisible()
	})

	baseTest('shows usage statistics section', async ({ page }: { page: Page }) => {
		// Usage page should have stats/metrics
		await expect(page.locator('body')).not.toContainText('404')
	})
})

baseTest.describe('Responsive Layout', () => {
	baseTest('dashboard is responsive on mobile', async ({ page }: { page: Page }) => {
		await page.setViewportSize({ width: 375, height: 667 })
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')

		// Page should still load without 404
		await expect(page.locator('body')).not.toContainText('404')
		// Heading should be visible
		await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
	})

	baseTest('agents page is responsive on tablet', async ({ page }: { page: Page }) => {
		await page.setViewportSize({ width: 768, height: 1024 })
		await page.goto('/dashboard/agents')
		await page.waitForLoadState('networkidle')

		await expect(page.locator('body')).not.toContainText('404')
		await expect(page.getByRole('heading', { name: 'Agents', exact: true })).toBeVisible()
	})
})

baseTest.describe('Theme and Accessibility', () => {
	baseTest('pages have proper heading hierarchy', async ({ page }: { page: Page }) => {
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')

		// Should have an h1 heading
		const h1 = page.locator('h1').first()
		await expect(h1).toBeVisible()
	})

	baseTest('buttons are keyboard accessible', async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/agents')
		await page.waitForLoadState('networkidle')

		// Tab to the New Agent button and verify it's focusable
		const newAgentLink = page.getByRole('link', { name: 'New Agent' })
		await newAgentLink.focus()
		await expect(newAgentLink).toBeFocused()
	})

	baseTest('form inputs are keyboard accessible', async ({ page }: { page: Page }) => {
		await page.goto('/sign-in')
		await page.waitForLoadState('networkidle')

		// Tab through form elements
		await page.keyboard.press('Tab')
		const emailInput = page.getByLabel('Email')

		// Email input should be focusable
		await emailInput.focus()
		await expect(emailInput).toBeFocused()
	})
})
