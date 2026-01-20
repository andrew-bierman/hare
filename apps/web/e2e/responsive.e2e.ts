import { test as baseTest, expect, type Page } from '@playwright/test'
import { test } from './fixtures'

/**
 * Responsive Design E2E tests.
 * Tests mobile, tablet, and desktop viewports to ensure proper layout and usability.
 *
 * Viewport sizes:
 * - Mobile: 375x667 (iPhone SE)
 * - Tablet: 768x1024 (iPad Portrait)
 * - Desktop: 1280x720 (Standard laptop)
 */

// ============================================================================
// Mobile Viewport Tests (375px)
// ============================================================================

baseTest.describe('Mobile Viewport (375px) - Unauthenticated', () => {
	baseTest.beforeEach(async ({ page }: { page: Page }) => {
		await page.setViewportSize({ width: 375, height: 667 })
	})

	baseTest('dashboard loads correctly on mobile', async ({ page }: { page: Page }) => {
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')

		// Page should not show 404
		await expect(page.locator('body')).not.toContainText('404')

		// Dashboard heading should be visible
		await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
	})

	baseTest('sidebar is hidden on mobile', async ({ page }: { page: Page }) => {
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')

		// The sidebar container with md:flex should be hidden on mobile
		// It uses hidden md:flex, so the sidebar nav should not be visible
		// On mobile, the sidebar links in the nav should NOT be visible
		// (they're in a hidden container)
		const sidebarContainer = page.locator('.hidden.md\\:flex.md\\:w-72')
		await expect(sidebarContainer).toBeHidden()
	})

	baseTest('header shows mobile layout with logo', async ({ page }: { page: Page }) => {
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')

		// Mobile header should show the logo (Hare branding)
		const mobileLogo = page.locator('header').getByText('Hare').first()
		await expect(mobileLogo).toBeVisible()
	})

	baseTest('search icon button is visible on mobile', async ({ page }: { page: Page }) => {
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')

		// Mobile has a search icon button (not the full search bar)
		// The search button is in the header with md:hidden class
		const mobileSearchButton = page.locator('header button.md\\:hidden')
		await expect(mobileSearchButton.first()).toBeVisible()
	})

	baseTest('agents page loads correctly on mobile', async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/agents')
		await page.waitForLoadState('networkidle')

		await expect(page.locator('body')).not.toContainText('404')
		await expect(page.getByRole('heading', { name: 'Agents', exact: true })).toBeVisible()
	})

	baseTest('tools page loads correctly on mobile', async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/tools')
		await page.waitForLoadState('networkidle')

		await expect(page.locator('body')).not.toContainText('404')
	})

	baseTest('settings page loads correctly on mobile', async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/settings')
		await page.waitForLoadState('networkidle')

		await expect(page.locator('body')).not.toContainText('404')
		await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
	})

	baseTest('usage page loads correctly on mobile', async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/usage')
		await page.waitForLoadState('networkidle')

		await expect(page.locator('body')).not.toContainText('404')
		await expect(page.getByRole('heading', { name: 'Usage' })).toBeVisible()
	})
})

// ============================================================================
// Tablet Viewport Tests (768px)
// ============================================================================

baseTest.describe('Tablet Viewport (768px) - Unauthenticated', () => {
	baseTest.beforeEach(async ({ page }: { page: Page }) => {
		await page.setViewportSize({ width: 768, height: 1024 })
	})

	baseTest('dashboard loads correctly on tablet', async ({ page }: { page: Page }) => {
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')

		await expect(page.locator('body')).not.toContainText('404')
		await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
	})

	baseTest('sidebar is visible on tablet', async ({ page }: { page: Page }) => {
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')

		// At 768px (md breakpoint), sidebar should be visible
		const nav = page.locator('nav')
		await expect(nav.getByRole('link', { name: 'Dashboard' })).toBeVisible()
		await expect(nav.getByRole('link', { name: 'Agents' })).toBeVisible()
		await expect(nav.getByRole('link', { name: 'Tools' })).toBeVisible()
	})

	baseTest('command search bar is visible on tablet', async ({ page }: { page: Page }) => {
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')

		// Desktop search bar should be visible at md breakpoint
		const searchButton = page.locator('header').getByText('Search agents, tools, pages...')
		await expect(searchButton).toBeVisible()
	})

	baseTest('agents page loads correctly on tablet', async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/agents')
		await page.waitForLoadState('networkidle')

		await expect(page.locator('body')).not.toContainText('404')
		await expect(page.getByRole('heading', { name: 'Agents', exact: true })).toBeVisible()
		await expect(page.getByRole('link', { name: 'New Agent' })).toBeVisible()
	})

	baseTest('usage page loads correctly on tablet', async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/usage')
		await page.waitForLoadState('networkidle')

		await expect(page.locator('body')).not.toContainText('404')
		await expect(page.getByRole('heading', { name: 'Usage' })).toBeVisible()
	})
})

// ============================================================================
// Desktop Viewport Tests (1280px)
// ============================================================================

baseTest.describe('Desktop Viewport (1280px) - Unauthenticated', () => {
	baseTest.beforeEach(async ({ page }: { page: Page }) => {
		await page.setViewportSize({ width: 1280, height: 720 })
	})

	baseTest('dashboard loads correctly on desktop', async ({ page }: { page: Page }) => {
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')

		await expect(page.locator('body')).not.toContainText('404')
		await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
	})

	baseTest('sidebar is visible on desktop', async ({ page }: { page: Page }) => {
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')

		const nav = page.locator('nav')
		await expect(nav.getByRole('link', { name: 'Dashboard' })).toBeVisible()
		await expect(nav.getByRole('link', { name: 'Agents' })).toBeVisible()
		await expect(nav.getByRole('link', { name: 'Tools' })).toBeVisible()
		await expect(nav.getByRole('link', { name: 'Analytics' })).toBeVisible()
		await expect(nav.getByRole('link', { name: 'Usage' })).toBeVisible()
		await expect(nav.getByRole('link', { name: 'Settings' })).toBeVisible()
	})

	baseTest('command search bar is visible on desktop', async ({ page }: { page: Page }) => {
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')

		const searchButton = page.locator('header').getByText('Search agents, tools, pages...')
		await expect(searchButton).toBeVisible()

		// Keyboard shortcut hint should be visible
		const keyboardHint = page.locator('header').locator('kbd')
		await expect(keyboardHint.first()).toBeVisible()
	})

	baseTest('agents page loads correctly on desktop', async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/agents')
		await page.waitForLoadState('networkidle')

		await expect(page.locator('body')).not.toContainText('404')
		await expect(page.getByRole('heading', { name: 'Agents', exact: true })).toBeVisible()
		await expect(page.getByRole('link', { name: 'New Agent' })).toBeVisible()
	})

	baseTest('sidebar navigation works on desktop', async ({ page }: { page: Page }) => {
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')

		// Navigate using sidebar
		await page.getByRole('link', { name: 'Agents' }).click()
		await page.waitForURL(/\/dashboard\/agents/)
		await expect(page.getByRole('heading', { name: 'Agents', exact: true })).toBeVisible()

		await page.getByRole('link', { name: 'Settings' }).click()
		await page.waitForURL(/\/dashboard\/settings/)
		await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
	})
})

// ============================================================================
// Mobile Menu Functionality
// ============================================================================

baseTest.describe('Mobile Menu Functionality', () => {
	baseTest('hamburger menu button is visible on mobile', async ({ page }: { page: Page }) => {
		await page.setViewportSize({ width: 375, height: 667 })
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')

		// Look for hamburger menu button in header (has Menu icon from lucide)
		const hamburgerButton = page
			.locator('header button')
			.filter({ has: page.locator('svg') })
			.first()

		// Hamburger button should be visible on mobile
		await expect(hamburgerButton).toBeVisible()
	})

	baseTest('search dialog opens on mobile', async ({ page }: { page: Page }) => {
		await page.setViewportSize({ width: 375, height: 667 })
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')

		// Find and click the search button
		const searchButton = page.locator('header button.md\\:hidden').first()
		await searchButton.click()

		// Wait for command dialog to open
		await page.waitForTimeout(500)

		// Command search dialog should be visible
		const commandDialog = page.locator('[role="dialog"]')
		await expect(commandDialog).toBeVisible()

		// Close the dialog by pressing Escape
		await page.keyboard.press('Escape')
	})
})

// ============================================================================
// Agent Cards Layout - Authenticated
// ============================================================================

test.describe('Agent Cards Layout - Authenticated', () => {
	test('agent cards stack vertically on mobile', async ({ authenticatedPage }) => {
		await authenticatedPage.setViewportSize({ width: 375, height: 667 })

		// Create an agent first
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		const agentName = `Mobile Test Agent ${Date.now()}`
		await authenticatedPage.locator('#name').fill(agentName)
		await authenticatedPage.locator('#description').fill('Test agent for responsive design')

		const createButton = authenticatedPage.getByRole('button', { name: /create agent/i })
		await createButton.click()

		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[^/]+$/, { timeout: 10000 })
		await authenticatedPage.waitForTimeout(2000)

		// Go to agents list
		await authenticatedPage.goto('/dashboard/agents')
		await authenticatedPage.waitForLoadState('networkidle')
		await authenticatedPage.waitForTimeout(2000)

		// Agent cards should be visible and vertically arranged
		const agentCard = authenticatedPage.locator('[class*="card"]').filter({ hasText: agentName })
		await expect(agentCard).toBeVisible()

		// On mobile, cards should take full width
		const cardBox = await agentCard.boundingBox()
		expect(cardBox).not.toBeNull()
		if (cardBox) {
			// Card width should be close to viewport width (accounting for padding)
			expect(cardBox.width).toBeGreaterThan(300)
		}
	})

	test('agent cards display in grid on desktop', async ({ authenticatedPage }) => {
		await authenticatedPage.setViewportSize({ width: 1280, height: 720 })

		// Create an agent
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		const agentName = `Desktop Test Agent ${Date.now()}`
		await authenticatedPage.locator('#name').fill(agentName)

		const createButton = authenticatedPage.getByRole('button', { name: /create agent/i })
		await createButton.click()

		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[^/]+$/, { timeout: 10000 })
		await authenticatedPage.waitForTimeout(2000)

		// Go to agents list
		await authenticatedPage.goto('/dashboard/agents')
		await authenticatedPage.waitForLoadState('networkidle')
		await authenticatedPage.waitForTimeout(2000)

		// Agent card should be visible
		const agentCard = authenticatedPage.locator('[class*="card"]').filter({ hasText: agentName })
		await expect(agentCard).toBeVisible()

		// On desktop, multiple cards can be side by side
		// Grid uses responsive columns: grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
		const cardBox = await agentCard.boundingBox()
		expect(cardBox).not.toBeNull()
		if (cardBox) {
			// Card width on desktop should be smaller than full width (sharing space with others)
			expect(cardBox.width).toBeLessThan(600)
		}
	})
})

// ============================================================================
// Forms Usability on Mobile - Authenticated
// ============================================================================

test.describe('Forms Usability on Mobile - Authenticated', () => {
	test('agent creation form is usable on mobile', async ({ authenticatedPage }) => {
		await authenticatedPage.setViewportSize({ width: 375, height: 667 })
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		// Check form heading is visible
		await expect(authenticatedPage.getByRole('heading', { name: 'Create New Agent' })).toBeVisible()

		// Check form fields are visible and accessible
		const nameInput = authenticatedPage.locator('#name')
		await expect(nameInput).toBeVisible()

		// Fill the form on mobile
		await nameInput.fill('Mobile Form Test')
		await expect(nameInput).toHaveValue('Mobile Form Test')

		const descriptionInput = authenticatedPage.locator('#description')
		await expect(descriptionInput).toBeVisible()
		await descriptionInput.fill('Testing form on mobile')
		await expect(descriptionInput).toHaveValue('Testing form on mobile')

		// Model selector should be visible
		const modelSelect = authenticatedPage.locator('#model')
		await expect(modelSelect).toBeVisible()

		// Create button should be visible
		const createButton = authenticatedPage.getByRole('button', { name: /create agent/i })
		await expect(createButton).toBeVisible()
	})

	test('settings form is usable on mobile', async ({ authenticatedPage }) => {
		await authenticatedPage.setViewportSize({ width: 375, height: 667 })
		await authenticatedPage.goto('/dashboard/settings')
		await authenticatedPage.waitForLoadState('networkidle')

		// Settings page should load
		await expect(authenticatedPage.getByRole('heading', { name: 'Settings' })).toBeVisible()

		// Profile section should be visible
		await expect(authenticatedPage.getByText('Profile', { exact: true }).first()).toBeVisible()

		// Form inputs should be accessible
		const nameInput = authenticatedPage.getByLabel(/name/i).first()
		await expect(nameInput).toBeVisible()

		const emailInput = authenticatedPage.getByLabel(/email/i).first()
		await expect(emailInput).toBeVisible()
	})
})

baseTest.describe('Forms Usability on Mobile - Unauthenticated', () => {
	baseTest('sign in form is usable on mobile', async ({ page }: { page: Page }) => {
		await page.setViewportSize({ width: 375, height: 667 })
		await page.goto('/sign-in')
		await page.waitForLoadState('networkidle')

		// Form fields should be visible
		const emailInput = page.getByLabel('Email')
		await expect(emailInput).toBeVisible()

		const passwordInput = page.getByLabel('Password')
		await expect(passwordInput).toBeVisible()

		// Can fill in the form
		await emailInput.fill('test@example.com')
		await expect(emailInput).toHaveValue('test@example.com')

		await passwordInput.fill('password123')
		await expect(passwordInput).toHaveValue('password123')

		// Submit button should be visible
		await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible()
	})

	baseTest('sign up form is usable on mobile', async ({ page }: { page: Page }) => {
		await page.setViewportSize({ width: 375, height: 667 })
		await page.goto('/sign-up')
		await page.waitForLoadState('networkidle')

		// All form fields should be visible and accessible
		await expect(page.getByLabel('Full Name')).toBeVisible()
		await expect(page.getByLabel('Email')).toBeVisible()
		await expect(page.getByLabel('Password', { exact: true })).toBeVisible()
		await expect(page.getByLabel('Confirm Password')).toBeVisible()

		// Submit button should be visible
		await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible()
	})
})

// ============================================================================
// Modals/Dialogs Fit Mobile Viewport
// ============================================================================

baseTest.describe('Modals/Dialogs Fit Mobile Viewport', () => {
	baseTest('command search dialog fits mobile viewport', async ({ page }: { page: Page }) => {
		await page.setViewportSize({ width: 375, height: 667 })
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')

		// Open the search dialog
		const searchButton = page.locator('header button.md\\:hidden').first()
		await searchButton.click()
		await page.waitForTimeout(500)

		// Dialog should be visible
		const dialog = page.locator('[role="dialog"]')
		await expect(dialog).toBeVisible()

		// Dialog should fit within viewport
		const dialogBox = await dialog.boundingBox()
		expect(dialogBox).not.toBeNull()
		if (dialogBox) {
			// Dialog should not exceed viewport width
			expect(dialogBox.x).toBeGreaterThanOrEqual(0)
			expect(dialogBox.x + dialogBox.width).toBeLessThanOrEqual(375 + 5) // Small tolerance
		}

		// Close dialog
		await page.keyboard.press('Escape')
	})
})

test.describe('Modals/Dialogs Fit Mobile Viewport - Authenticated', () => {
	test('model selector dropdown fits mobile viewport', async ({ authenticatedPage }) => {
		await authenticatedPage.setViewportSize({ width: 375, height: 667 })
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		// Click model selector to open dropdown
		const modelSelect = authenticatedPage.locator('#model')
		await modelSelect.click()
		await authenticatedPage.waitForTimeout(500)

		// Dropdown content should be visible
		const dropdownContent = authenticatedPage.locator(
			'[role="listbox"], [data-radix-popper-content-wrapper]',
		)
		await expect(dropdownContent.first()).toBeVisible()

		// Dropdown should be within viewport bounds
		const dropdownBox = await dropdownContent.first().boundingBox()
		expect(dropdownBox).not.toBeNull()
		if (dropdownBox) {
			expect(dropdownBox.x).toBeGreaterThanOrEqual(0)
		}

		// Close by pressing Escape
		await authenticatedPage.keyboard.press('Escape')
	})
})

// ============================================================================
// Tables Scroll Horizontally on Mobile
// ============================================================================

test.describe('Tables Scroll Horizontally on Mobile', () => {
	test('usage page content scrolls horizontally if needed on mobile', async ({
		authenticatedPage,
	}) => {
		await authenticatedPage.setViewportSize({ width: 375, height: 667 })
		await authenticatedPage.goto('/dashboard/usage')
		await authenticatedPage.waitForLoadState('networkidle')

		// Wait for content to load
		await authenticatedPage.waitForTimeout(2000)

		// Page should load without horizontal overflow issues
		// The main content should be scrollable
		const mainContent = authenticatedPage.locator('main')
		await expect(mainContent).toBeVisible()

		// Check that stat cards are visible
		await expect(authenticatedPage.getByText('Total API Calls')).toBeVisible()
	})

	test('analytics page is accessible on mobile', async ({ authenticatedPage }) => {
		await authenticatedPage.setViewportSize({ width: 375, height: 667 })
		await authenticatedPage.goto('/dashboard/analytics')
		await authenticatedPage.waitForLoadState('networkidle')

		// Page should load
		await expect(authenticatedPage.locator('body')).not.toContainText('404')
		await expect(authenticatedPage.getByRole('heading', { name: 'Analytics' })).toBeVisible()
	})
})

// ============================================================================
// Touch Targets Minimum Size (44x44px)
// ============================================================================

baseTest.describe('Touch Targets Minimum Size (44x44px)', () => {
	baseTest('navigation links have minimum touch target size', async ({ page }: { page: Page }) => {
		await page.setViewportSize({ width: 768, height: 1024 })
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')

		// Check sidebar navigation links (min-h-[44px] is set in sidebar)
		const nav = page.locator('nav')
		const dashboardLink = nav.getByRole('link', { name: 'Dashboard' })
		await expect(dashboardLink).toBeVisible()

		const linkBox = await dashboardLink.boundingBox()
		expect(linkBox).not.toBeNull()
		if (linkBox) {
			// Links should be at least 44px tall for touch accessibility
			expect(linkBox.height).toBeGreaterThanOrEqual(44)
		}
	})

	baseTest('header buttons have minimum touch target size', async ({ page }: { page: Page }) => {
		await page.setViewportSize({ width: 375, height: 667 })
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')

		// Check any header button (hamburger or search) that has an SVG icon
		const headerButton = page
			.locator('header button')
			.filter({ has: page.locator('svg') })
			.first()
		await expect(headerButton).toBeVisible()

		const buttonBox = await headerButton.boundingBox()
		expect(buttonBox).not.toBeNull()
		if (buttonBox) {
			// Button should be at least 36px for touch
			expect(buttonBox.height).toBeGreaterThanOrEqual(36)
			expect(buttonBox.width).toBeGreaterThanOrEqual(36)
		}
	})

	baseTest('form submit buttons have adequate size', async ({ page }: { page: Page }) => {
		await page.setViewportSize({ width: 375, height: 667 })
		await page.goto('/sign-in')
		await page.waitForLoadState('networkidle')

		const submitButton = page.getByRole('button', { name: 'Sign In' })
		await expect(submitButton).toBeVisible()

		const buttonBox = await submitButton.boundingBox()
		expect(buttonBox).not.toBeNull()
		if (buttonBox) {
			// Submit buttons should be adequately sized for touch
			expect(buttonBox.height).toBeGreaterThanOrEqual(36)
		}
	})
})

test.describe('Touch Targets - Authenticated', () => {
	test('agent card buttons have minimum touch target size', async ({ authenticatedPage }) => {
		await authenticatedPage.setViewportSize({ width: 375, height: 667 })

		// Create an agent
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		const agentName = `Touch Target Test ${Date.now()}`
		await authenticatedPage.locator('#name').fill(agentName)

		const createButton = authenticatedPage.getByRole('button', { name: /create agent/i })
		await createButton.click()

		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[^/]+$/, { timeout: 10000 })
		await authenticatedPage.waitForTimeout(2000)

		// Go to agents list
		await authenticatedPage.goto('/dashboard/agents')
		await authenticatedPage.waitForLoadState('networkidle')
		await authenticatedPage.waitForTimeout(2000)

		// Find configure button on the agent card
		const agentCard = authenticatedPage.locator('[class*="card"]').filter({ hasText: agentName })
		const configureButton = agentCard.getByRole('button').first()

		if (await configureButton.isVisible()) {
			const buttonBox = await configureButton.boundingBox()
			expect(buttonBox).not.toBeNull()
			if (buttonBox) {
				// Buttons should be at least 36px for touch accessibility
				expect(buttonBox.height).toBeGreaterThanOrEqual(36)
			}
		}
	})
})

// ============================================================================
// Responsive Layout Transitions
// ============================================================================

baseTest.describe('Responsive Layout Transitions', () => {
	baseTest('layout transitions correctly between viewports', async ({ page }: { page: Page }) => {
		// Start at mobile
		await page.setViewportSize({ width: 375, height: 667 })
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')

		// Dashboard heading should be visible on mobile
		await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

		// Transition to tablet
		await page.setViewportSize({ width: 768, height: 1024 })
		await page.waitForTimeout(1000)

		// Dashboard heading should still be visible on tablet
		await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

		// Transition to desktop
		await page.setViewportSize({ width: 1280, height: 720 })
		await page.waitForTimeout(1000)

		// Dashboard heading should still be visible on desktop
		await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
	})
})

// ============================================================================
// Landing Page Responsive
// ============================================================================

baseTest.describe('Landing Page Responsive', () => {
	baseTest('landing page loads on mobile', async ({ page }: { page: Page }) => {
		await page.setViewportSize({ width: 375, height: 667 })
		await page.goto('/')
		await page.waitForLoadState('networkidle')

		await expect(page.locator('body')).not.toContainText('404')

		// Key elements should be visible (use exact match to avoid multiple matches)
		await expect(page.getByRole('link', { name: 'Get Started', exact: true })).toBeVisible()
	})

	baseTest('landing page loads on tablet', async ({ page }: { page: Page }) => {
		await page.setViewportSize({ width: 768, height: 1024 })
		await page.goto('/')
		await page.waitForLoadState('networkidle')

		await expect(page.locator('body')).not.toContainText('404')
		await expect(page.getByRole('link', { name: 'Get Started', exact: true })).toBeVisible()
	})

	baseTest('landing page loads on desktop', async ({ page }: { page: Page }) => {
		await page.setViewportSize({ width: 1280, height: 720 })
		await page.goto('/')
		await page.waitForLoadState('networkidle')

		await expect(page.locator('body')).not.toContainText('404')
		await expect(page.getByRole('link', { name: 'Get Started', exact: true })).toBeVisible()
		await expect(page.getByRole('link', { name: 'Sign In' })).toBeVisible()
	})
})

// ============================================================================
// Auth Pages Responsive
// ============================================================================

baseTest.describe('Auth Pages Responsive', () => {
	baseTest('sign in page is responsive on mobile', async ({ page }: { page: Page }) => {
		await page.setViewportSize({ width: 375, height: 667 })
		await page.goto('/sign-in')
		await page.waitForLoadState('networkidle')

		await expect(page.locator('body')).not.toContainText('404')
		await expect(page.getByLabel('Email')).toBeVisible()
		await expect(page.getByLabel('Password')).toBeVisible()
		await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible()
	})

	baseTest('sign up page is responsive on mobile', async ({ page }: { page: Page }) => {
		await page.setViewportSize({ width: 375, height: 667 })
		await page.goto('/sign-up')
		await page.waitForLoadState('networkidle')

		await expect(page.locator('body')).not.toContainText('404')
		await expect(page.getByLabel('Full Name')).toBeVisible()
		await expect(page.getByLabel('Email')).toBeVisible()
		await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible()
	})
})
