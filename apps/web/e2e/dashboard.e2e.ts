import { test as baseTest, expect } from '@playwright/test'
import { test } from './fixtures'

// ============================================================================
// Route Protection Tests
// ============================================================================

baseTest.describe('Dashboard Route Protection', () => {
	baseTest('unauthenticated user is redirected from dashboard to sign-in', async ({ page }) => {
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')
		await page.waitForURL(/\/sign-in/, { timeout: 10000 })
		await expect(page).toHaveURL(/\/sign-in/)
	})

	baseTest('unauthenticated user is redirected from agents to sign-in', async ({ page }) => {
		await page.goto('/dashboard/agents')
		await page.waitForLoadState('networkidle')
		await page.waitForURL(/\/sign-in/, { timeout: 10000 })
		await expect(page).toHaveURL(/\/sign-in/)
	})

	baseTest('unauthenticated user is redirected from tools to sign-in', async ({ page }) => {
		await page.goto('/dashboard/tools')
		await page.waitForLoadState('networkidle')
		await page.waitForURL(/\/sign-in/, { timeout: 10000 })
		await expect(page).toHaveURL(/\/sign-in/)
	})

	baseTest('unauthenticated user is redirected from settings to sign-in', async ({ page }) => {
		await page.goto('/dashboard/settings')
		await page.waitForLoadState('networkidle')
		await page.waitForURL(/\/sign-in/, { timeout: 10000 })
		await expect(page).toHaveURL(/\/sign-in/)
	})
})

// ============================================================================
// Dashboard Overview Tests (Authenticated)
// ============================================================================

test.describe('Dashboard Overview', () => {
	test('authenticated user sees dashboard', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')
		// Dashboard should load without errors
		await expect(authenticatedPage.locator('main')).toBeVisible()
	})

	test('dashboard has sidebar navigation', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')

		// Verify sidebar links exist
		const nav = authenticatedPage.locator('nav')
		await expect(nav).toBeVisible()
		await expect(nav.getByRole('link', { name: 'Dashboard' })).toBeVisible()
		await expect(nav.getByRole('link', { name: 'Agents' })).toBeVisible()
		await expect(nav.getByRole('link', { name: 'Tools' })).toBeVisible()
	})
})

// ============================================================================
// Agents Page Tests (Authenticated)
// ============================================================================

test.describe('Agents List Page', () => {
	test('displays agents page', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents')
		await authenticatedPage.waitForLoadState('networkidle')
		// Page should load without errors
		await expect(authenticatedPage.locator('main')).toBeVisible()
	})

	test('has create agent button/link', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents')
		await authenticatedPage.waitForLoadState('networkidle')

		// Wait for workspace to finish loading and page content to appear
		await expect(authenticatedPage.getByRole('heading', { name: /agents/i })).toBeVisible({
			timeout: 15000,
		})

		// Look for New Agent button (inside a link) or Create Agent button
		const newAgentButton = authenticatedPage.getByRole('button', { name: /new agent/i })
		const createButton = authenticatedPage.getByRole('button', { name: /create agent/i })

		const hasNewButton = await newAgentButton.isVisible({ timeout: 5000 }).catch(() => false)
		const hasCreateButton = await createButton.isVisible({ timeout: 2000 }).catch(() => false)

		expect(hasNewButton || hasCreateButton).toBeTruthy()
	})
})

// ============================================================================
// Agent Creation Tests (Authenticated)
// ============================================================================

test.describe('Agent Creation Flow', () => {
	test('displays agent creation form', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		// Wait for form to load
		await expect(authenticatedPage.getByRole('heading', { name: 'Create New Agent' })).toBeVisible({
			timeout: 10000,
		})

		// Check for required form fields using labels
		await expect(authenticatedPage.getByLabel(/Agent Name/i)).toBeVisible()
		await expect(authenticatedPage.getByLabel(/Description/i)).toBeVisible()

		// Check for create button
		await expect(authenticatedPage.getByRole('button', { name: /create agent/i })).toBeVisible()
	})

	test('create button is disabled when name is empty', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		// Wait for form
		await authenticatedPage.getByLabel(/Agent Name/i).waitFor({ state: 'visible', timeout: 10000 })

		const createButton = authenticatedPage.getByRole('button', { name: /create agent/i })
		await expect(createButton).toBeDisabled()
	})

	test('create button enables when name is filled', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		// Wait for form
		const nameInput = authenticatedPage.getByLabel(/Agent Name/i)
		await nameInput.waitFor({ state: 'visible', timeout: 10000 })

		// Fill name using pressSequentially for React compatibility
		await nameInput.click()
		await nameInput.pressSequentially('Test Agent', { delay: 15 })

		const createButton = authenticatedPage.getByRole('button', { name: /create agent/i })
		await expect(createButton).toBeEnabled()
	})

	test('can cancel agent creation', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		const cancelButton = authenticatedPage.getByRole('button', { name: /cancel/i })
		if (await cancelButton.isVisible({ timeout: 5000 })) {
			await cancelButton.click()
			await authenticatedPage.waitForURL(/\/dashboard\/agents/, { timeout: 10000 })
		}
	})
})

// ============================================================================
// Tools Page Tests (Authenticated)
// ============================================================================

test.describe('Tools Page', () => {
	test('displays tools page', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/tools')
		await authenticatedPage.waitForLoadState('networkidle')
		await expect(authenticatedPage.locator('main')).toBeVisible()
	})
})

// ============================================================================
// Settings Page Tests (Authenticated)
// ============================================================================

test.describe('Settings Page', () => {
	test('displays settings page', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await authenticatedPage.waitForLoadState('networkidle')
		await expect(authenticatedPage.locator('main')).toBeVisible()
	})
})

// ============================================================================
// Analytics Page Tests (Authenticated)
// ============================================================================

test.describe('Analytics Page', () => {
	test('displays analytics page', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForLoadState('networkidle')
		await expect(authenticatedPage.locator('main')).toBeVisible()
	})
})

// ============================================================================
// Usage Page Tests (Authenticated)
// ============================================================================

test.describe('Usage Page', () => {
	test('displays usage page', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/usage')
		await authenticatedPage.waitForLoadState('networkidle')
		await expect(authenticatedPage.locator('main')).toBeVisible()
	})
})
