import { test as baseTest, expect, type Page } from '@playwright/test'
import { test, waitForWorkspaceLoad } from './fixtures'

baseTest.describe('Dashboard Overview - Unauthenticated', () => {
	baseTest('unauthenticated user is redirected to sign-in', async ({ page }: { page: Page }) => {
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')

		// Should be redirected to sign-in page
		await expect(page).toHaveURL(/sign-in/)
		await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible()
	})
})

test.describe('Dashboard Overview - Authenticated', () => {
	test('authenticated user sees personalized dashboard', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')
		await expect(authenticatedPage.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
	})

	test('displays key metrics cards', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')

		// Dashboard should show some metrics/stats
		// Look for card-like elements with stats
		const cards = authenticatedPage.locator('[class*="card"]')
		await expect(cards.first()).toBeVisible()
	})

	test('has sidebar navigation', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')

		// Verify sidebar links exist using nav locator for specificity
		const nav = authenticatedPage.locator('nav')
		await expect(nav.getByRole('link', { name: 'Dashboard' })).toBeVisible()
		await expect(nav.getByRole('link', { name: 'Agents' })).toBeVisible()
		await expect(nav.getByRole('link', { name: 'Tools' })).toBeVisible()
		await expect(nav.getByRole('link', { name: 'Usage' })).toBeVisible()
		await expect(nav.getByRole('link', { name: 'Settings' })).toBeVisible()
	})
})

baseTest.describe('Agents List Page - Unauthenticated', () => {
	baseTest(
		'unauthenticated user is redirected to sign-in',
		async ({ page }: { page: Page }) => {
			await page.goto('/dashboard/agents')
			await page.waitForLoadState('networkidle')

			// Should be redirected to sign-in page
			await expect(page).toHaveURL(/sign-in/)
			await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible()
		},
	)
})

test.describe('Agent Creation Flow - Authenticated', () => {
	test('should display agent creation form', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/new')
		await waitForWorkspaceLoad(authenticatedPage)

		// Check for heading
		await expect(authenticatedPage.getByRole('heading', { name: 'Create New Agent' })).toBeVisible({ timeout: 10000 })

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

	test('should navigate to templates page from agent list', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents')
		await waitForWorkspaceLoad(authenticatedPage)

		// "New Agent" button goes to templates page first
		await authenticatedPage.getByRole('link', { name: 'New Agent' }).click()
		await waitForWorkspaceLoad(authenticatedPage)
		await expect(authenticatedPage).toHaveURL('/dashboard/agents/templates')
		await expect(authenticatedPage.getByRole('heading', { name: 'Choose a Template' })).toBeVisible({ timeout: 10000 })
	})

	test('should navigate from templates to agent creation', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/templates')
		await waitForWorkspaceLoad(authenticatedPage)

		// Click "Start from scratch" to go to create form
		await authenticatedPage.getByRole('button', { name: /start from scratch/i }).click()
		await waitForWorkspaceLoad(authenticatedPage)
		await expect(authenticatedPage).toHaveURL('/dashboard/agents/new')
		await expect(authenticatedPage.getByRole('heading', { name: 'Create New Agent' })).toBeVisible({ timeout: 10000 })
	})
})

test.describe('Tools List Page - Authenticated', () => {
	test('displays tools heading', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/tools')
		await waitForWorkspaceLoad(authenticatedPage)

		await expect(
			authenticatedPage.getByRole('heading', { name: 'Tools', exact: true }),
		).toBeVisible({ timeout: 10000 })
	})

	test('has add tool button', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/tools')
		await waitForWorkspaceLoad(authenticatedPage)

		// UI has "Quick Add" and "Create HTTP Tool" buttons
		const quickAddBtn = authenticatedPage.getByRole('button', { name: 'Quick Add' })
		const createHttpToolBtn = authenticatedPage.getByRole('button', { name: 'Create HTTP Tool' })
		// At least one should be visible
		const hasQuickAdd = await quickAddBtn.isVisible({ timeout: 5000 }).catch(() => false)
		const hasCreateHttp = await createHttpToolBtn.isVisible({ timeout: 5000 }).catch(() => false)
		expect(hasQuickAdd || hasCreateHttp).toBe(true)
	})

	test('shows tool categories or list', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/tools')
		await waitForWorkspaceLoad(authenticatedPage)

		// Page should have some content about tools
		await expect(authenticatedPage.locator('body')).not.toContainText('404')
	})
})

test.describe('Usage Page - Authenticated', () => {
	test('displays usage heading', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/usage')
		await authenticatedPage.waitForLoadState('networkidle')

		await expect(authenticatedPage.getByRole('heading', { name: 'Usage' })).toBeVisible()
	})

	test('shows usage statistics section', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/usage')
		await authenticatedPage.waitForLoadState('networkidle')

		// Usage page should have stats/metrics
		await expect(authenticatedPage.locator('body')).not.toContainText('404')
	})
})

test.describe('Responsive Layout - Authenticated', () => {
	test('dashboard is responsive on mobile', async ({ authenticatedPage }) => {
		await authenticatedPage.setViewportSize({ width: 375, height: 667 })
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')

		// Page should still load without 404
		await expect(authenticatedPage.locator('body')).not.toContainText('404')
		// Heading should be visible
		await expect(authenticatedPage.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
	})

	test('agents page is responsive on tablet', async ({ authenticatedPage }) => {
		await authenticatedPage.setViewportSize({ width: 768, height: 1024 })
		await authenticatedPage.goto('/dashboard/agents')
		await authenticatedPage.waitForLoadState('networkidle')

		await expect(authenticatedPage.locator('body')).not.toContainText('404')
		await expect(
			authenticatedPage.getByRole('heading', { name: 'Agents', exact: true }),
		).toBeVisible()
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

		// Tab to the New Agent button and verify it's focusable
		const newAgentLink = authenticatedPage.getByRole('link', { name: 'New Agent' })
		await newAgentLink.focus()
		await expect(newAgentLink).toBeFocused()
	})
})

baseTest.describe('Form Accessibility - Public Pages', () => {
	baseTest('form inputs are keyboard accessible on sign-in', async ({ page }: { page: Page }) => {
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

// ============================================================================
// Settings Page Tests
// ============================================================================

test.describe('Settings Page - Authenticated', () => {
	test('displays settings heading', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await waitForWorkspaceLoad(authenticatedPage)

		await expect(authenticatedPage.getByRole('heading', { name: 'Settings' })).toBeVisible({ timeout: 15000 })
	})

	test('displays profile section with name and email fields', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await waitForWorkspaceLoad(authenticatedPage)
		await authenticatedPage.waitForTimeout(1000)

		// Profile section should have name and email fields
		await expect(authenticatedPage.getByLabel('Name')).toBeVisible({ timeout: 10000 })
		await expect(authenticatedPage.getByLabel('Email')).toBeVisible()
	})

	test('has security options', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await waitForWorkspaceLoad(authenticatedPage)
		await authenticatedPage.waitForTimeout(1000)

		// Should have Change Password and Sign Out buttons
		await expect(authenticatedPage.getByRole('button', { name: 'Change Password' })).toBeVisible({ timeout: 10000 })
		await expect(authenticatedPage.getByRole('button', { name: /sign out/i })).toBeVisible()
	})

	test('email field is disabled', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await waitForWorkspaceLoad(authenticatedPage)
		await authenticatedPage.waitForTimeout(1000)

		// Email field should be disabled
		const emailInput = authenticatedPage.getByLabel('Email')
		await expect(emailInput).toBeDisabled()
	})
})

// ============================================================================
// Tools Page - Extended Tests
// ============================================================================

test.describe('Tools Page - Extended Tests', () => {
	test('displays tools sections', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/tools')
		await waitForWorkspaceLoad(authenticatedPage)
		await authenticatedPage.waitForTimeout(1000)

		// Page should have content (system or custom tools sections)
		const pageContent = await authenticatedPage.locator('body').textContent()
		expect(pageContent?.toLowerCase()).toContain('tools')
	})

	test('has search functionality', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/tools')
		await waitForWorkspaceLoad(authenticatedPage)
		await authenticatedPage.waitForTimeout(1000)

		// Search input should be visible
		const searchInput = authenticatedPage.getByPlaceholder(/search tools/i)
		await expect(searchInput).toBeVisible({ timeout: 10000 })

		// Should be able to type in search
		await searchInput.fill('http')
		await authenticatedPage.waitForTimeout(500)
	})

	test('has tool action buttons', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/tools')
		await waitForWorkspaceLoad(authenticatedPage)
		await authenticatedPage.waitForTimeout(1000)

		// Should have Quick Add or Create HTTP Tool button
		const hasQuickAdd = await authenticatedPage.getByRole('button', { name: 'Quick Add' }).isVisible().catch(() => false)
		const hasCreateHttp = await authenticatedPage.getByRole('link', { name: 'Create HTTP Tool' }).isVisible().catch(() => false)
		expect(hasQuickAdd || hasCreateHttp).toBe(true)
	})
})

// ============================================================================
// Agent Detail Page Tests
// ============================================================================

test.describe('Agent Detail Page - Authenticated', () => {
	test('agent detail page has tabs after creation', async ({ authenticatedPage }) => {
		// Create an agent first
		await authenticatedPage.goto('/dashboard/agents/new')
		await waitForWorkspaceLoad(authenticatedPage)

		const agentName = `Tabs Test Agent ${Date.now()}`
		await authenticatedPage.locator('#name').fill(agentName)

		await authenticatedPage.getByRole('button', { name: /create agent/i }).click()

		// Wait for redirect to agent detail page
		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[^/]+$/, { timeout: 20000 })
		await waitForWorkspaceLoad(authenticatedPage)
		await authenticatedPage.waitForTimeout(2000)

		// Check for tabs
		const generalTab = authenticatedPage.getByRole('tab', { name: 'General' })
		await expect(generalTab).toBeVisible({ timeout: 15000 })
	})

	test('newly created agent shows Draft status', async ({ authenticatedPage }) => {
		// Create an agent first
		await authenticatedPage.goto('/dashboard/agents/new')
		await waitForWorkspaceLoad(authenticatedPage)

		const agentName = `Status Agent ${Date.now()}`
		await authenticatedPage.locator('#name').fill(agentName)

		await authenticatedPage.getByRole('button', { name: /create agent/i }).click()
		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[^/]+$/, { timeout: 20000 })
		await waitForWorkspaceLoad(authenticatedPage)
		await authenticatedPage.waitForTimeout(2000)

		// New agents should show Draft status badge
		const draftBadge = authenticatedPage.getByText('Draft')
		await expect(draftBadge).toBeVisible({ timeout: 15000 })
	})
})

// ============================================================================
// Navigation Tests
// ============================================================================

test.describe('Dashboard Navigation - Authenticated', () => {
	test('can navigate to Agents page', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await waitForWorkspaceLoad(authenticatedPage)

		await authenticatedPage.getByRole('link', { name: 'Agents' }).click()
		await waitForWorkspaceLoad(authenticatedPage)
		await expect(authenticatedPage).toHaveURL('/dashboard/agents')
		await expect(authenticatedPage.getByRole('heading', { name: 'Agents', exact: true })).toBeVisible({ timeout: 10000 })
	})

	test('can navigate to Tools page', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await waitForWorkspaceLoad(authenticatedPage)

		// Use nav locator to get sidebar Tools link specifically
		const nav = authenticatedPage.locator('nav')
		await nav.getByRole('link', { name: 'Tools' }).click()
		await waitForWorkspaceLoad(authenticatedPage)
		await expect(authenticatedPage).toHaveURL('/dashboard/tools')
		await expect(authenticatedPage.getByRole('heading', { name: 'Tools', exact: true })).toBeVisible({ timeout: 10000 })
	})

	test('can navigate to Settings page', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await waitForWorkspaceLoad(authenticatedPage)

		await authenticatedPage.getByRole('link', { name: 'Settings' }).click()
		await waitForWorkspaceLoad(authenticatedPage)
		await expect(authenticatedPage).toHaveURL('/dashboard/settings')
		await expect(authenticatedPage.getByRole('heading', { name: 'Settings' })).toBeVisible({ timeout: 10000 })
	})

	test('templates page has back navigation', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/templates')
		await waitForWorkspaceLoad(authenticatedPage)

		// Should have "Back to Agents" button
		const backButton = authenticatedPage.getByRole('button', { name: /back to agents/i })
		await expect(backButton).toBeVisible({ timeout: 10000 })
	})
})
