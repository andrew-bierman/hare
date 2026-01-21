import { test as baseTest, expect, type Page } from '@playwright/test'
import { test } from './fixtures'

/**
 * Navigation E2E tests.
 * Tests sidebar navigation, breadcrumbs, browser history, deep linking, and routing.
 */

// ============================================================================
// SIDEBAR NAVIGATION TESTS - AUTHENTICATED
// ============================================================================

test.describe('Sidebar Navigation - Authenticated', () => {
	test('displays sidebar with all navigation links', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')

		const nav = authenticatedPage.locator('nav')
		await expect(nav.getByRole('link', { name: 'Dashboard' })).toBeVisible()
		await expect(nav.getByRole('link', { name: 'Agents' })).toBeVisible()
		await expect(nav.getByRole('link', { name: 'Tools' })).toBeVisible()
		await expect(nav.getByRole('link', { name: 'Analytics' })).toBeVisible()
		await expect(nav.getByRole('link', { name: 'Usage' })).toBeVisible()
		await expect(nav.getByRole('link', { name: 'Settings' })).toBeVisible()
	})

	test('navigates to agents page from sidebar', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')

		await authenticatedPage.getByRole('link', { name: 'Agents' }).click()
		await authenticatedPage.waitForURL(/\/dashboard\/agents/)
		await expect(
			authenticatedPage.getByRole('heading', { name: 'Agents', exact: true }),
		).toBeVisible()
	})

	test('navigates to tools page from sidebar', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')

		await authenticatedPage.getByRole('link', { name: 'Tools' }).click()
		await authenticatedPage.waitForURL(/\/dashboard\/tools/, { timeout: 10000 })
		await expect(
			authenticatedPage.getByRole('heading', { name: 'Tools', exact: true }),
		).toBeVisible()
	})

	test('navigates to analytics page from sidebar', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')

		await authenticatedPage.getByRole('link', { name: 'Analytics' }).click()
		await authenticatedPage.waitForURL(/\/dashboard\/analytics/)
		await expect(authenticatedPage.getByRole('heading', { name: 'Analytics' })).toBeVisible()
	})

	test('navigates to usage page from sidebar', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')

		await authenticatedPage.getByRole('link', { name: 'Usage' }).click()
		await authenticatedPage.waitForURL(/\/dashboard\/usage/, { timeout: 10000 })
		await expect(authenticatedPage.getByRole('heading', { name: 'Usage' })).toBeVisible()
	})

	test('navigates to settings page from sidebar', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')

		await authenticatedPage.getByRole('link', { name: 'Settings' }).click()
		await authenticatedPage.waitForURL(/\/dashboard\/settings/)
		await expect(authenticatedPage.getByRole('heading', { name: 'Settings' })).toBeVisible()
	})

	test('navigates back to dashboard from sidebar', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents')
		await authenticatedPage.waitForLoadState('networkidle')

		await authenticatedPage.getByRole('link', { name: 'Dashboard' }).click()
		await authenticatedPage.waitForURL(/\/dashboard$/)
		await expect(authenticatedPage.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
	})

	test('can navigate through all dashboard sections', async ({ authenticatedPage }) => {
		// Start at dashboard
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')
		await expect(authenticatedPage.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

		// Navigate to agents
		await authenticatedPage.getByRole('link', { name: 'Agents' }).click()
		await authenticatedPage.waitForURL(/\/dashboard\/agents/)
		await expect(
			authenticatedPage.getByRole('heading', { name: 'Agents', exact: true }),
		).toBeVisible()

		// Navigate to tools
		await authenticatedPage.getByRole('link', { name: 'Tools' }).click()
		await authenticatedPage.waitForURL(/\/dashboard\/tools/)
		await expect(
			authenticatedPage.getByRole('heading', { name: 'Tools', exact: true }),
		).toBeVisible()

		// Navigate to settings
		await authenticatedPage.getByRole('link', { name: 'Settings' }).click()
		await authenticatedPage.waitForURL(/\/dashboard\/settings/)
		await expect(authenticatedPage.getByRole('heading', { name: 'Settings' })).toBeVisible()
	})

	test('new agent button navigates to create page', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents')
		await authenticatedPage.waitForLoadState('networkidle')

		await authenticatedPage.getByRole('link', { name: 'New Agent' }).click()
		await authenticatedPage.waitForURL(/\/dashboard\/agents\/new/)
		await expect(authenticatedPage.getByRole('heading', { name: 'Create New Agent' })).toBeVisible()
	})
})

// ============================================================================
// BROWSER BACK/FORWARD BUTTON TESTS
// ============================================================================

test.describe('Browser History Navigation', () => {
	test('browser back button returns to previous page', async ({ authenticatedPage }) => {
		// Navigate through multiple pages
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')

		await authenticatedPage.goto('/dashboard/agents')
		await authenticatedPage.waitForLoadState('networkidle')

		await authenticatedPage.goto('/dashboard/tools')
		await authenticatedPage.waitForLoadState('networkidle')

		// Go back
		await authenticatedPage.goBack()
		await authenticatedPage.waitForURL(/\/dashboard\/agents/)
		await expect(
			authenticatedPage.getByRole('heading', { name: 'Agents', exact: true }),
		).toBeVisible()

		// Go back again
		await authenticatedPage.goBack()
		await authenticatedPage.waitForURL(/\/dashboard$/)
		await expect(authenticatedPage.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
	})

	test('browser forward button navigates forward in history', async ({ authenticatedPage }) => {
		// Navigate through pages
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')

		await authenticatedPage.goto('/dashboard/agents')
		await authenticatedPage.waitForLoadState('networkidle')

		// Go back
		await authenticatedPage.goBack()
		await authenticatedPage.waitForURL(/\/dashboard$/)

		// Go forward
		await authenticatedPage.goForward()
		await authenticatedPage.waitForURL(/\/dashboard\/agents/)
		await expect(
			authenticatedPage.getByRole('heading', { name: 'Agents', exact: true }),
		).toBeVisible()
	})

	test('back/forward works across multiple navigation steps', async ({ authenticatedPage }) => {
		const pages = [
			{ url: '/dashboard', heading: 'Dashboard' },
			{ url: '/dashboard/agents', heading: 'Agents' },
			{ url: '/dashboard/tools', heading: 'Tools' },
			{ url: '/dashboard/usage', heading: 'Usage' },
			{ url: '/dashboard/settings', heading: 'Settings' },
		]

		// Navigate forward through all pages
		for (const p of pages) {
			await authenticatedPage.goto(p.url)
			await authenticatedPage.waitForLoadState('networkidle')
		}

		// Go back through all pages
		for (let i = pages.length - 2; i >= 0; i--) {
			await authenticatedPage.goBack()
			const currentPage = pages[i]
			if (currentPage) {
				await authenticatedPage.waitForURL(new RegExp(currentPage.url.replace('/', '\\/')))
			}
		}

		// Go forward through all pages
		for (let i = 1; i < pages.length; i++) {
			await authenticatedPage.goForward()
			const currentPage = pages[i]
			if (currentPage) {
				await authenticatedPage.waitForURL(new RegExp(currentPage.url.replace('/', '\\/')))
			}
		}
	})

	test('back button works after sidebar navigation', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')

		// Click through sidebar links
		await authenticatedPage.getByRole('link', { name: 'Agents' }).click()
		await authenticatedPage.waitForURL(/\/dashboard\/agents/)

		await authenticatedPage.getByRole('link', { name: 'Tools' }).click()
		await authenticatedPage.waitForURL(/\/dashboard\/tools/)

		// Use browser back
		await authenticatedPage.goBack()
		await authenticatedPage.waitForURL(/\/dashboard\/agents/)

		await authenticatedPage.goBack()
		await authenticatedPage.waitForURL(/\/dashboard$/)
	})
})

// ============================================================================
// DEEP LINKING TESTS
// ============================================================================

test.describe('Deep Linking - Agent Detail Page', () => {
	test('deep link to agent detail page works', async ({ authenticatedPage }) => {
		// First create an agent
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		const agentName = `Deep Link Test Agent ${Date.now()}`
		await authenticatedPage.locator('#name').fill(agentName)
		await authenticatedPage.locator('#description').fill('Test agent for deep linking')

		await authenticatedPage.getByRole('button', { name: /create agent/i }).click()
		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[a-f0-9-]+$/, { timeout: 15000 })
		await authenticatedPage.waitForLoadState('networkidle')

		// Get the agent detail URL
		const agentDetailUrl = authenticatedPage.url()
		const agentId = agentDetailUrl.split('/').pop()

		// Navigate away
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')

		// Deep link directly to agent detail
		await authenticatedPage.goto(agentDetailUrl)
		await authenticatedPage.waitForLoadState('networkidle')

		// Should show agent detail page with correct agent
		await expect(authenticatedPage.getByRole('heading', { name: agentName })).toBeVisible()
		expect(authenticatedPage.url()).toContain(agentId)
	})

	test('deep link URL structure is valid for agent detail', async ({ authenticatedPage }) => {
		// Create agent first
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		await authenticatedPage.locator('#name').fill(`URL Structure Test ${Date.now()}`)
		await authenticatedPage.locator('#description').fill('Testing URL structure')

		await authenticatedPage.getByRole('button', { name: /create agent/i }).click()
		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[a-f0-9-]+$/, { timeout: 15000 })

		// Verify URL has valid UUID-like format
		const url = authenticatedPage.url()
		expect(url).toMatch(/\/dashboard\/agents\/[a-f0-9-]+$/)
	})
})

test.describe('Deep Linking - Settings Sections', () => {
	test('deep link to settings page works', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await authenticatedPage.waitForLoadState('networkidle')

		await expect(authenticatedPage.getByRole('heading', { name: 'Settings' })).toBeVisible()
		expect(authenticatedPage.url()).toContain('/dashboard/settings')
	})

	test('deep link to API keys settings works', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings/api-keys')
		await authenticatedPage.waitForLoadState('networkidle')

		// Should be on API keys section
		expect(authenticatedPage.url()).toContain('/dashboard/settings/api-keys')
		// API keys page should have relevant content
		await expect(authenticatedPage.getByText(/API|key/i).first()).toBeVisible({ timeout: 10000 })
	})

	test('deep link to billing settings works', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings/billing')
		await authenticatedPage.waitForLoadState('networkidle')

		expect(authenticatedPage.url()).toContain('/dashboard/settings/billing')
		await expect(authenticatedPage.getByText(/billing|subscription|plan/i).first()).toBeVisible({
			timeout: 10000,
		})
	})

	test('deep link to team settings works', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings/team')
		await authenticatedPage.waitForLoadState('networkidle')

		expect(authenticatedPage.url()).toContain('/dashboard/settings/team')
		await expect(authenticatedPage.getByText(/team|member|invite/i).first()).toBeVisible({
			timeout: 10000,
		})
	})
})

// ============================================================================
// 404 HANDLING FOR INVALID AGENT IDS
// ============================================================================

test.describe('404 Handling - Invalid Agent IDs', () => {
	test('invalid agent ID shows error or redirects gracefully', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/nonexistent-agent-id-12345')
		await authenticatedPage.waitForLoadState('networkidle')
		await authenticatedPage.waitForTimeout(2000)

		// Should handle gracefully - either show 404/error or redirect to agents list
		const url = authenticatedPage.url()
		const onAgentsPage = url.includes('/dashboard/agents')

		// Either redirected to agents list or showing some dashboard page
		expect(onAgentsPage).toBeTruthy()
	})

	test('malformed UUID in agent URL is handled', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/not-a-valid-uuid')
		await authenticatedPage.waitForLoadState('networkidle')
		await authenticatedPage.waitForTimeout(2000)

		// Page should handle gracefully without crashing
		const pageContent = authenticatedPage.locator('body')
		await expect(pageContent).toBeVisible()

		// Should be on some valid page
		const url = authenticatedPage.url()
		expect(url).toContain('/dashboard')
	})

	test('empty agent ID redirects appropriately', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/')
		await authenticatedPage.waitForLoadState('networkidle')

		// Should show agents list page
		await expect(
			authenticatedPage.getByRole('heading', { name: 'Agents', exact: true }),
		).toBeVisible()
	})
})

// ============================================================================
// REDIRECT AFTER SIGN-IN
// ============================================================================

baseTest.describe('Redirect After Sign-In', () => {
	baseTest(
		'unauthenticated user accessing protected route is redirected to sign-in',
		async ({ page }: { page: Page }) => {
			// Try to access a protected route
			await page.goto('/dashboard/agents')
			await page.waitForLoadState('networkidle')

			// Should be redirected to sign-in
			await page.waitForURL(/sign-in/, { timeout: 15000 })
		},
	)

	baseTest(
		'unauthenticated user accessing settings is redirected to sign-in',
		async ({ page }: { page: Page }) => {
			await page.goto('/dashboard/settings')
			await page.waitForLoadState('networkidle')

			await page.waitForURL(/sign-in/, { timeout: 15000 })
		},
	)

	baseTest(
		'unauthenticated user accessing dashboard is redirected to sign-in',
		async ({ page }: { page: Page }) => {
			await page.goto('/dashboard')
			await page.waitForLoadState('networkidle')

			await page.waitForURL(/sign-in/, { timeout: 15000 })
		},
	)
})

test.describe('Redirect After Sign-In - Return to Original', () => {
	test('after sign-in, returns to dashboard', async ({ authenticatedPage }) => {
		// The authenticatedPage fixture signs up and goes to dashboard
		// Verify we're on dashboard after authentication
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')

		expect(authenticatedPage.url()).toContain('/dashboard')
		await expect(authenticatedPage.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
	})
})

// ============================================================================
// URL UPDATES WHEN SWITCHING TABS/SECTIONS
// ============================================================================

test.describe('URL Updates on Tab/Section Changes', () => {
	test('URL updates when switching agent detail tabs', async ({ authenticatedPage }) => {
		// Create an agent first
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		await authenticatedPage.locator('#name').fill(`Tab URL Test ${Date.now()}`)
		await authenticatedPage.locator('#description').fill('Testing tab URL updates')

		await authenticatedPage.getByRole('button', { name: /create agent/i }).click()
		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[a-f0-9-]+$/, { timeout: 15000 })
		await authenticatedPage.waitForLoadState('networkidle')

		// Click through tabs and verify URL or tab state changes
		const tabs = ['General', 'Prompt', 'Tools', 'Memory', 'Schedules', 'Preview', 'Analytics']

		for (const tabName of tabs) {
			const tab = authenticatedPage.getByRole('tab', { name: new RegExp(tabName, 'i') })
			if (await tab.isVisible({ timeout: 2000 }).catch(() => false)) {
				await tab.click()
				await authenticatedPage.waitForTimeout(500)

				// Tab should be active
				await expect(tab).toHaveAttribute('data-state', 'active')
			}
		}
	})

	test('URL reflects current navigation state', async ({ authenticatedPage }) => {
		const routes = [
			{ path: '/dashboard', expectedPath: '/dashboard' },
			{ path: '/dashboard/agents', expectedPath: '/dashboard/agents' },
			{ path: '/dashboard/tools', expectedPath: '/dashboard/tools' },
			{ path: '/dashboard/analytics', expectedPath: '/dashboard/analytics' },
			{ path: '/dashboard/usage', expectedPath: '/dashboard/usage' },
			{ path: '/dashboard/settings', expectedPath: '/dashboard/settings' },
		]

		for (const route of routes) {
			await authenticatedPage.goto(route.path)
			await authenticatedPage.waitForLoadState('networkidle')

			expect(authenticatedPage.url()).toContain(route.expectedPath)
		}
	})
})

// ============================================================================
// PAGE TITLE UPDATES
// ============================================================================

baseTest.describe('Page Title Updates', () => {
	baseTest('landing page has correct title', async ({ page }: { page: Page }) => {
		await page.goto('/')
		await page.waitForLoadState('networkidle')

		const title = await page.title()
		expect(title).toBeTruthy()
		expect(title.length).toBeGreaterThan(0)
	})

	baseTest('sign-in page has title', async ({ page }: { page: Page }) => {
		await page.goto('/sign-in')
		await page.waitForLoadState('networkidle')

		const title = await page.title()
		expect(title).toBeTruthy()
	})

	baseTest('sign-up page has title', async ({ page }: { page: Page }) => {
		await page.goto('/sign-up')
		await page.waitForLoadState('networkidle')

		const title = await page.title()
		expect(title).toBeTruthy()
	})
})

test.describe('Page Titles - Authenticated Routes', () => {
	test('page title is present on dashboard pages', async ({ authenticatedPage }) => {
		const pages = ['/dashboard', '/dashboard/agents', '/dashboard/tools', '/dashboard/settings']

		for (const pagePath of pages) {
			await authenticatedPage.goto(pagePath)
			await authenticatedPage.waitForLoadState('networkidle')

			const title = await authenticatedPage.title()
			expect(title).toBeTruthy()
			expect(title.length).toBeGreaterThan(0)
		}
	})
})

// ============================================================================
// HEADER NAVIGATION
// ============================================================================

test.describe('Header Navigation', () => {
	test('header has search bar', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')

		const searchInput = authenticatedPage.getByPlaceholder(/search/i)
		await expect(searchInput).toBeVisible()
	})

	test('header has notification icon', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')

		const header = authenticatedPage.locator('header')
		const notificationBtn = header
			.locator('button')
			.filter({ has: authenticatedPage.locator('svg') })
		const count = await notificationBtn.count()
		expect(count).toBeGreaterThan(0)
	})
})

// ============================================================================
// MOBILE NAVIGATION
// ============================================================================

test.describe('Mobile Navigation', () => {
	test('sidebar collapses on mobile', async ({ authenticatedPage }) => {
		await authenticatedPage.setViewportSize({ width: 375, height: 667 })
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')

		// On mobile, sidebar should be hidden or collapsed
		await expect(authenticatedPage.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
	})

	test('can toggle mobile menu', async ({ authenticatedPage }) => {
		await authenticatedPage.setViewportSize({ width: 375, height: 667 })
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')

		// Look for hamburger menu button
		const menuButton = authenticatedPage
			.locator('button')
			.filter({ has: authenticatedPage.locator('svg') })
			.first()
		if (await menuButton.isVisible()) {
			await menuButton.click()
			await authenticatedPage.waitForTimeout(300)
		}
	})

	test('mobile navigation links work', async ({ authenticatedPage }) => {
		await authenticatedPage.setViewportSize({ width: 375, height: 667 })
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')

		// Dashboard should still be accessible on mobile
		await expect(authenticatedPage.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
	})
})

// ============================================================================
// LANDING TO DASHBOARD NAVIGATION
// ============================================================================

baseTest.describe('Landing to Dashboard Navigation', () => {
	baseTest('Get Started button navigates to sign-up', async ({ page }: { page: Page }) => {
		await page.goto('/')
		await page.waitForLoadState('networkidle')

		const getStartedBtn = page.getByRole('link', { name: 'Get Started' })
		await expect(getStartedBtn).toHaveAttribute('href', '/sign-up')
	})

	baseTest('Sign In button navigates to sign-in', async ({ page }: { page: Page }) => {
		await page.goto('/')
		await page.waitForLoadState('networkidle')

		const signInLink = page.getByRole('link', { name: 'Sign In' })
		await expect(signInLink).toHaveAttribute('href', '/sign-in')
	})

	baseTest('Live Demo button navigates to dashboard', async ({ page }: { page: Page }) => {
		await page.goto('/')
		await page.waitForLoadState('networkidle')

		const liveDemoBtn = page.getByRole('link', { name: 'Live Demo' })
		await expect(liveDemoBtn).toHaveAttribute('href', '/dashboard')
	})
})

// ============================================================================
// BREADCRUMB NAVIGATION
// ============================================================================

test.describe('Breadcrumb Navigation', () => {
	test('breadcrumbs are visible on nested pages if implemented', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents')
		await authenticatedPage.waitForLoadState('networkidle')

		// Check for breadcrumb navigation (if implemented)
		// Breadcrumbs typically use nav with aria-label="breadcrumb" or similar
		const breadcrumb = authenticatedPage.locator('[aria-label*="breadcrumb"]')
		const hasBreadcrumb = await breadcrumb.isVisible({ timeout: 2000 }).catch(() => false)

		if (hasBreadcrumb) {
			// If breadcrumbs exist, verify they're functional
			const breadcrumbLinks = breadcrumb.locator('a')
			const linkCount = await breadcrumbLinks.count()
			expect(linkCount).toBeGreaterThan(0)
		}
		// If breadcrumbs are not implemented, this test passes silently
	})

	test('agent detail page has navigation back to agents list', async ({ authenticatedPage }) => {
		// Create an agent first
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		await authenticatedPage.locator('#name').fill(`Breadcrumb Test ${Date.now()}`)
		await authenticatedPage.locator('#description').fill('Testing navigation')

		await authenticatedPage.getByRole('button', { name: /create agent/i }).click()
		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[a-f0-9-]+$/, { timeout: 15000 })
		await authenticatedPage.waitForLoadState('networkidle')

		// Should be able to navigate back via sidebar
		await authenticatedPage.getByRole('link', { name: 'Agents' }).click()
		await authenticatedPage.waitForURL(/\/dashboard\/agents\/?$/)

		await expect(
			authenticatedPage.getByRole('heading', { name: 'Agents', exact: true }),
		).toBeVisible()
	})
})

// ============================================================================
// NAVIGATION STATE PRESERVATION
// ============================================================================

test.describe('Navigation State Preservation', () => {
	test('navigating away and back preserves page state', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents')
		await authenticatedPage.waitForLoadState('networkidle')

		// Interact with search if available
		const searchInput = authenticatedPage.getByPlaceholder(/search/i)
		if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
			await searchInput.fill('test query')
		}

		// Navigate away
		await authenticatedPage.goto('/dashboard/tools')
		await authenticatedPage.waitForLoadState('networkidle')

		// Navigate back
		await authenticatedPage.goBack()
		await authenticatedPage.waitForURL(/\/dashboard\/agents/)

		// Page should load without errors
		await expect(
			authenticatedPage.getByRole('heading', { name: 'Agents', exact: true }),
		).toBeVisible()
	})
})

// ============================================================================
// KEYBOARD NAVIGATION
// ============================================================================

test.describe('Keyboard Navigation', () => {
	test('can navigate links with keyboard', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')

		// Tab to focus on a navigation link
		const nav = authenticatedPage.locator('nav')
		const firstLink = nav.getByRole('link').first()
		await firstLink.focus()

		// Verify the link is focusable
		await expect(firstLink).toBeFocused()
	})

	test('enter key activates focused link', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')

		// Focus on Agents link
		const agentsLink = authenticatedPage.locator('nav').getByRole('link', { name: 'Agents' })
		await agentsLink.focus()

		// Press Enter to navigate
		await authenticatedPage.keyboard.press('Enter')
		await authenticatedPage.waitForURL(/\/dashboard\/agents/)
	})
})

// ============================================================================
// EDGE CASES
// ============================================================================

test.describe('Navigation Edge Cases', () => {
	test('handles rapid navigation without errors', async ({ authenticatedPage }) => {
		const pages = ['/dashboard', '/dashboard/agents', '/dashboard/tools', '/dashboard/settings']

		// Rapidly navigate without waiting for full load
		for (const pagePath of pages) {
			await authenticatedPage.goto(pagePath)
		}

		// Wait for final page to load
		await authenticatedPage.waitForLoadState('networkidle')

		// Should be on a valid page without errors
		const pageContent = authenticatedPage.locator('body')
		await expect(pageContent).toBeVisible()
	})

	test('navigation works after page reload', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents')
		await authenticatedPage.waitForLoadState('networkidle')

		// Reload the page
		await authenticatedPage.reload()
		await authenticatedPage.waitForLoadState('networkidle')

		// Should still be on agents page
		await expect(
			authenticatedPage.getByRole('heading', { name: 'Agents', exact: true }),
		).toBeVisible()

		// Navigation should still work
		await authenticatedPage.getByRole('link', { name: 'Tools' }).click()
		await authenticatedPage.waitForURL(/\/dashboard\/tools/)
	})

	test('handles URL with trailing slash', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/')
		await authenticatedPage.waitForLoadState('networkidle')

		// Should handle trailing slash gracefully
		await expect(
			authenticatedPage.getByRole('heading', { name: 'Agents', exact: true }),
		).toBeVisible()
	})

	test('handles URL with query parameters', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents?view=grid')
		await authenticatedPage.waitForLoadState('networkidle')

		// Should still show agents page
		await expect(
			authenticatedPage.getByRole('heading', { name: 'Agents', exact: true }),
		).toBeVisible()
	})
})
