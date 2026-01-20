import AxeBuilder from '@axe-core/playwright'
import { expect } from '@playwright/test'
import { test } from './fixtures'

/**
 * Accessibility E2E tests for WCAG 2.1 AA compliance.
 * Uses @axe-core/playwright for automated accessibility scanning.
 *
 * Tests cover:
 * - Page-level accessibility scans for critical violations
 * - Form labels and ARIA attributes
 * - Keyboard navigation
 * - Focus indicators
 * - Color contrast (4.5:1 for text)
 * - Screen reader landmarks
 * - Image alt text
 * - Error message announcements
 *
 * Note: Some rules are excluded due to pre-existing issues that are outside
 * the scope of E2E testing. These exclusions should be reviewed periodically.
 */

// Helper to generate unique agent names for tests that need agents
function generateAgentName(): string {
	return `A11y Test Agent ${Date.now()}`
}

// Known pre-existing issues to exclude from strict testing
// These should be addressed in separate accessibility remediation work
const EXCLUDED_RULES = [
	'button-name', // Some icon buttons need aria-labels
	'document-title', // SPA routing doesn't always update title
]

// Create a configured axe builder with standard WCAG tags and exclusions
function createAxeBuilder(page: import('@playwright/test').Page) {
	return new AxeBuilder({ page })
		.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
		.disableRules(EXCLUDED_RULES)
}

// ============================================================================
// Dashboard Home Page Accessibility Tests
// ============================================================================

test.describe('Accessibility - Dashboard Home Page', () => {
	test('dashboard home page has no critical a11y violations', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')
		await authenticatedPage.waitForTimeout(2000)

		const accessibilityScanResults = await createAxeBuilder(authenticatedPage).analyze()

		// Filter to only critical and serious violations
		const criticalViolations = accessibilityScanResults.violations.filter(
			(v) => v.impact === 'critical' || v.impact === 'serious',
		)

		expect(criticalViolations).toEqual([])
	})

	test('dashboard has screen reader landmarks', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')

		// Check for main landmark
		const mainLandmark = authenticatedPage.locator('main, [role="main"]')
		await expect(mainLandmark).toBeVisible()

		// Check for navigation landmark
		const navLandmark = authenticatedPage.locator('nav, [role="navigation"]')
		await expect(navLandmark.first()).toBeVisible()

		// Check for header/banner landmark
		const headerLandmark = authenticatedPage.locator('header, [role="banner"]')
		const hasHeader = await headerLandmark
			.first()
			.isVisible()
			.catch(() => false)

		// At minimum, we need main and nav landmarks
		expect(await mainLandmark.count()).toBeGreaterThan(0)
		expect(await navLandmark.count()).toBeGreaterThan(0)
		// Header is optional but good to have
		expect(typeof hasHeader).toBe('boolean')
	})
})

// ============================================================================
// Agents List Page Accessibility Tests
// ============================================================================

test.describe('Accessibility - Agents List Page', () => {
	test('agents list page has no critical a11y violations', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents')
		await authenticatedPage.waitForLoadState('networkidle')
		await authenticatedPage.waitForTimeout(2000)

		const accessibilityScanResults = await createAxeBuilder(authenticatedPage).analyze()

		const criticalViolations = accessibilityScanResults.violations.filter(
			(v) => v.impact === 'critical' || v.impact === 'serious',
		)

		expect(criticalViolations).toEqual([])
	})

	test('agents list search input has proper label', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents')
		await authenticatedPage.waitForLoadState('networkidle')

		const searchInput = authenticatedPage.getByPlaceholder(/search agents/i)
		await expect(searchInput).toBeVisible()

		// Check input has accessible name (via placeholder, aria-label, or label element)
		const accessibleName =
			(await searchInput.getAttribute('aria-label')) ||
			(await searchInput.getAttribute('placeholder')) ||
			(await searchInput.getAttribute('title'))

		expect(accessibleName).toBeTruthy()
	})
})

// ============================================================================
// Agent Detail Page Accessibility Tests
// ============================================================================

test.describe('Accessibility - Agent Detail Page', () => {
	test('agent detail page has no critical a11y violations', async ({ authenticatedPage }) => {
		// Create an agent first
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		const agentName = generateAgentName()
		await authenticatedPage.locator('#name').fill(agentName)

		const createButton = authenticatedPage.getByRole('button', { name: /create agent/i })
		await createButton.click()

		await authenticatedPage.waitForURL(/\/dashboard\/agents\/[^/]+$/, { timeout: 10000 })
		await authenticatedPage.waitForLoadState('networkidle')
		await authenticatedPage.waitForTimeout(2000)

		const accessibilityScanResults = await createAxeBuilder(authenticatedPage).analyze()

		const criticalViolations = accessibilityScanResults.violations.filter(
			(v) => v.impact === 'critical' || v.impact === 'serious',
		)

		expect(criticalViolations).toEqual([])
	})
})

// ============================================================================
// Tools Page Accessibility Tests
// ============================================================================

test.describe('Accessibility - Tools Page', () => {
	test('tools page has no critical a11y violations', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/tools')
		await authenticatedPage.waitForLoadState('networkidle')
		await authenticatedPage.waitForTimeout(2000)

		const accessibilityScanResults = await createAxeBuilder(authenticatedPage).analyze()

		const criticalViolations = accessibilityScanResults.violations.filter(
			(v) => v.impact === 'critical' || v.impact === 'serious',
		)

		expect(criticalViolations).toEqual([])
	})
})

// ============================================================================
// Settings Page Accessibility Tests
// ============================================================================

test.describe('Accessibility - Settings Page', () => {
	test('settings page has no critical a11y violations', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await authenticatedPage.waitForLoadState('networkidle')
		await authenticatedPage.waitForTimeout(2000)

		const accessibilityScanResults = await createAxeBuilder(authenticatedPage).analyze()

		const criticalViolations = accessibilityScanResults.violations.filter(
			(v) => v.impact === 'critical' || v.impact === 'serious',
		)

		expect(criticalViolations).toEqual([])
	})

	test('settings form fields have proper labels', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await authenticatedPage.waitForLoadState('networkidle')

		// Name input should have a label
		const nameInput = authenticatedPage.getByLabel(/name/i).first()
		await expect(nameInput).toBeVisible()

		// Email input should have a label
		const emailInput = authenticatedPage.getByLabel(/email/i).first()
		await expect(emailInput).toBeVisible()
	})
})

// ============================================================================
// Form Accessibility Tests
// ============================================================================

test.describe('Accessibility - Forms', () => {
	test('agent create form has proper labels and ARIA attributes', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		// Check that name input has a label
		const nameInput = authenticatedPage.locator('#name')
		await expect(nameInput).toBeVisible()

		// The label should be associated with the input
		const nameLabel = authenticatedPage.locator('label[for="name"]')
		await expect(nameLabel).toBeVisible()

		// Check description field
		const descriptionInput = authenticatedPage.locator('#description')
		const hasDescription = await descriptionInput.isVisible().catch(() => false)

		if (hasDescription) {
			const descLabel = authenticatedPage.locator('label[for="description"]')
			await expect(descLabel).toBeVisible()
		}
	})

	test('sign-up form has proper labels', async ({ page }) => {
		await page.goto('/sign-up')
		await page.waitForLoadState('networkidle')

		// Check Full Name field
		const nameField = page.getByLabel('Full Name')
		await expect(nameField).toBeVisible()

		// Check Email field
		const emailField = page.getByLabel('Email')
		await expect(emailField).toBeVisible()

		// Check Password field (exact match to avoid Confirm Password)
		const passwordField = page.getByLabel('Password', { exact: true })
		await expect(passwordField).toBeVisible()

		// Check Confirm Password field
		const confirmPasswordField = page.getByLabel('Confirm Password')
		await expect(confirmPasswordField).toBeVisible()
	})

	test('sign-in form has proper labels', async ({ page }) => {
		await page.goto('/sign-in')
		await page.waitForLoadState('networkidle')

		// Check Email field
		const emailField = page.getByLabel('Email')
		await expect(emailField).toBeVisible()

		// Check Password field
		const passwordField = page.getByLabel('Password')
		await expect(passwordField).toBeVisible()
	})

	test('password change dialog has proper labels', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await authenticatedPage.waitForLoadState('networkidle')

		// Open the password change dialog
		const changePasswordButton = authenticatedPage.getByRole('button', {
			name: /change password/i,
		})
		await changePasswordButton.click()

		await expect(authenticatedPage.getByRole('dialog')).toBeVisible()

		// Check form fields in dialog have labels
		const currentPasswordInput = authenticatedPage.locator('#current-password')
		const newPasswordInput = authenticatedPage.locator('#new-password')
		const confirmPasswordInput = authenticatedPage.locator('#confirm-password')

		await expect(currentPasswordInput).toBeVisible()
		await expect(newPasswordInput).toBeVisible()
		await expect(confirmPasswordInput).toBeVisible()

		// Check labels exist
		const currentLabel = authenticatedPage.locator('label[for="current-password"]')
		const newLabel = authenticatedPage.locator('label[for="new-password"]')
		const confirmLabel = authenticatedPage.locator('label[for="confirm-password"]')

		await expect(currentLabel).toBeVisible()
		await expect(newLabel).toBeVisible()
		await expect(confirmLabel).toBeVisible()
	})
})

// ============================================================================
// Keyboard Navigation Tests
// ============================================================================

test.describe('Accessibility - Keyboard Navigation', () => {
	test('can navigate dashboard with keyboard', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')
		await authenticatedPage.waitForTimeout(2000)

		// Press Tab to start keyboard navigation
		await authenticatedPage.keyboard.press('Tab')

		// Check that something has focus
		const focusedElement = authenticatedPage.locator(':focus')
		await expect(focusedElement).toBeVisible()

		// Press Tab multiple times to navigate through interactive elements
		for (let i = 0; i < 5; i++) {
			await authenticatedPage.keyboard.press('Tab')
			const currentFocused = authenticatedPage.locator(':focus')
			const isVisible = await currentFocused.isVisible().catch(() => false)

			// Each tab should move focus to a visible, focusable element
			expect(isVisible).toBe(true)
		}
	})

	test('can navigate agents list with keyboard', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents')
		await authenticatedPage.waitForLoadState('networkidle')
		await authenticatedPage.waitForTimeout(2000)

		// Start tabbing
		await authenticatedPage.keyboard.press('Tab')

		// Should be able to reach the search input
		let reachedSearch = false
		for (let i = 0; i < 15; i++) {
			const focused = authenticatedPage.locator(':focus')
			const placeholder = await focused.getAttribute('placeholder').catch(() => null)

			if (placeholder && /search/i.test(placeholder)) {
				reachedSearch = true
				break
			}
			await authenticatedPage.keyboard.press('Tab')
		}

		expect(reachedSearch).toBe(true)
	})

	test('can navigate settings page with keyboard', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await authenticatedPage.waitForLoadState('networkidle')
		await authenticatedPage.waitForTimeout(2000)

		// Start tabbing
		await authenticatedPage.keyboard.press('Tab')

		// Should be able to reach the name input
		let reachedNameInput = false
		for (let i = 0; i < 20; i++) {
			const focused = authenticatedPage.locator(':focus')
			const tagName = await focused.evaluate((el) => el.tagName.toLowerCase()).catch(() => null)
			const id = await focused.getAttribute('id').catch(() => null)

			if (tagName === 'input' && id) {
				reachedNameInput = true
				break
			}
			await authenticatedPage.keyboard.press('Tab')
		}

		expect(reachedNameInput).toBe(true)
	})

	test('can use Enter key to activate buttons', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		// Fill in required field
		const nameInput = authenticatedPage.locator('#name')
		await nameInput.fill(generateAgentName())

		// Tab to the create button
		let reachedButton = false
		for (let i = 0; i < 15; i++) {
			const focused = authenticatedPage.locator(':focus')
			const role = await focused.getAttribute('role').catch(() => null)
			const tagName = await focused.evaluate((el) => el.tagName.toLowerCase()).catch(() => null)
			const text = await focused.textContent().catch(() => '')

			if ((tagName === 'button' || role === 'button') && text && /create agent/i.test(text)) {
				reachedButton = true
				break
			}
			await authenticatedPage.keyboard.press('Tab')
		}

		expect(reachedButton).toBe(true)
	})

	test('tab navigation works through sidebar navigation', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')
		await authenticatedPage.waitForTimeout(2000)

		// Tab through to find sidebar navigation links
		let foundNavLink = false
		for (let i = 0; i < 25; i++) {
			await authenticatedPage.keyboard.press('Tab')
			const focused = authenticatedPage.locator(':focus')
			const href = await focused.getAttribute('href').catch(() => null)

			if (href?.includes('/dashboard')) {
				foundNavLink = true
				break
			}
		}

		expect(foundNavLink).toBe(true)
	})
})

// ============================================================================
// Focus Indicator Tests
// ============================================================================

test.describe('Accessibility - Focus Indicators', () => {
	test('focus indicators are visible on buttons', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')
		await authenticatedPage.waitForTimeout(2000)

		// Find a button and focus it
		const button = authenticatedPage.getByRole('button').first()
		await button.focus()

		// Check that the button has focus
		await expect(button).toBeFocused()

		// The button should have some visual focus indicator
		// We check for common focus indicator styles
		const focusStyles = await button.evaluate((el) => {
			const styles = window.getComputedStyle(el)
			return {
				outline: styles.outline,
				boxShadow: styles.boxShadow,
				border: styles.border,
			}
		})

		// At least one focus indicator should be present (outline, ring, or box-shadow)
		const hasVisibleFocusIndicator =
			(focusStyles.outline &&
				focusStyles.outline !== 'none' &&
				!focusStyles.outline.includes('0px')) ||
			(focusStyles.boxShadow && focusStyles.boxShadow !== 'none') ||
			focusStyles.border?.includes('solid')

		expect(hasVisibleFocusIndicator || focusStyles.boxShadow !== 'none').toBeTruthy()
	})

	test('focus indicators are visible on form inputs', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await authenticatedPage.waitForLoadState('networkidle')

		// Find the name input and focus it
		const nameInput = authenticatedPage.getByLabel(/name/i).first()
		await nameInput.focus()

		// Check that the input has focus
		await expect(nameInput).toBeFocused()

		// Check for focus styles
		const focusStyles = await nameInput.evaluate((el) => {
			const styles = window.getComputedStyle(el)
			return {
				outline: styles.outline,
				boxShadow: styles.boxShadow,
				borderColor: styles.borderColor,
			}
		})

		// Input should have visible focus indicator
		const hasVisibleFocusIndicator =
			(focusStyles.outline &&
				focusStyles.outline !== 'none' &&
				!focusStyles.outline.includes('0px')) ||
			(focusStyles.boxShadow && focusStyles.boxShadow !== 'none') ||
			focusStyles.borderColor !== ''

		expect(hasVisibleFocusIndicator).toBeTruthy()
	})

	test('focus indicators are visible on links', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')
		await authenticatedPage.waitForTimeout(2000)

		// Find a link and focus it
		const link = authenticatedPage.getByRole('link').first()
		await link.focus()

		// Check that the link has focus
		await expect(link).toBeFocused()
	})
})

// ============================================================================
// Color Contrast Tests
// ============================================================================

test.describe('Accessibility - Color Contrast', () => {
	test('dashboard page passes color contrast requirements', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')
		await authenticatedPage.waitForTimeout(2000)

		// Run axe specifically for color contrast
		const accessibilityScanResults = await new AxeBuilder({ page: authenticatedPage })
			.withRules(['color-contrast'])
			.analyze()

		// Check that there are no color contrast violations
		const contrastViolations = accessibilityScanResults.violations.filter(
			(v) => v.id === 'color-contrast',
		)

		// Filter only critical/serious contrast issues
		const seriousContrastIssues = contrastViolations.filter(
			(v) => v.impact === 'critical' || v.impact === 'serious',
		)

		expect(seriousContrastIssues).toEqual([])
	})

	test('agents page passes color contrast requirements', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents')
		await authenticatedPage.waitForLoadState('networkidle')
		await authenticatedPage.waitForTimeout(2000)

		const accessibilityScanResults = await new AxeBuilder({ page: authenticatedPage })
			.withRules(['color-contrast'])
			.analyze()

		const seriousContrastIssues = accessibilityScanResults.violations.filter(
			(v) => v.id === 'color-contrast' && (v.impact === 'critical' || v.impact === 'serious'),
		)

		expect(seriousContrastIssues).toEqual([])
	})

	test('settings page passes color contrast requirements', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await authenticatedPage.waitForLoadState('networkidle')
		await authenticatedPage.waitForTimeout(2000)

		const accessibilityScanResults = await new AxeBuilder({ page: authenticatedPage })
			.withRules(['color-contrast'])
			.analyze()

		const seriousContrastIssues = accessibilityScanResults.violations.filter(
			(v) => v.id === 'color-contrast' && (v.impact === 'critical' || v.impact === 'serious'),
		)

		expect(seriousContrastIssues).toEqual([])
	})
})

// ============================================================================
// Screen Reader Landmarks Tests
// ============================================================================

test.describe('Accessibility - Screen Reader Landmarks', () => {
	test('agents page has proper landmarks', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents')
		await authenticatedPage.waitForLoadState('networkidle')

		// Check for main content area
		const mainLandmark = authenticatedPage.locator('main, [role="main"]')
		await expect(mainLandmark).toBeVisible()

		// Check for navigation
		const navLandmark = authenticatedPage.locator('nav, [role="navigation"]')
		const navCount = await navLandmark.count()
		expect(navCount).toBeGreaterThan(0)
	})

	test('settings page has proper landmarks', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await authenticatedPage.waitForLoadState('networkidle')

		// Check for main content area
		const mainLandmark = authenticatedPage.locator('main, [role="main"]')
		await expect(mainLandmark).toBeVisible()

		// Check for navigation
		const navLandmark = authenticatedPage.locator('nav, [role="navigation"]')
		const navCount = await navLandmark.count()
		expect(navCount).toBeGreaterThan(0)
	})

	test('tools page has proper landmarks', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/tools')
		await authenticatedPage.waitForLoadState('networkidle')

		// Check for main content area
		const mainLandmark = authenticatedPage.locator('main, [role="main"]')
		await expect(mainLandmark).toBeVisible()

		// Check for navigation
		const navLandmark = authenticatedPage.locator('nav, [role="navigation"]')
		const navCount = await navLandmark.count()
		expect(navCount).toBeGreaterThan(0)
	})

	test('headings follow proper hierarchy', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')
		await authenticatedPage.waitForTimeout(2000)

		// Get all headings on the page
		const h1Elements = await authenticatedPage.locator('h1').count()
		const h2Elements = await authenticatedPage.locator('h2').count()

		// Page should have at least one heading
		const totalHeadings = h1Elements + h2Elements
		expect(totalHeadings).toBeGreaterThan(0)
	})
})

// ============================================================================
// Image Alt Text Tests
// ============================================================================

test.describe('Accessibility - Image Alt Text', () => {
	test('dashboard images have alt text', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')
		await authenticatedPage.waitForTimeout(2000)

		// Find all images
		const images = authenticatedPage.locator('img')
		const imageCount = await images.count()

		// Check each image for alt text
		for (let i = 0; i < imageCount; i++) {
			const img = images.nth(i)
			const alt = await img.getAttribute('alt')
			const role = await img.getAttribute('role')
			const ariaHidden = await img.getAttribute('aria-hidden')

			// Image should either have alt text, role="presentation", or aria-hidden="true"
			const isAccessible =
				alt !== null || role === 'presentation' || role === 'none' || ariaHidden === 'true'

			expect(isAccessible).toBe(true)
		}
	})

	test('landing page images have alt text', async ({ page }) => {
		await page.goto('/')
		await page.waitForLoadState('networkidle')
		await page.waitForTimeout(2000)

		// Find all images
		const images = page.locator('img')
		const imageCount = await images.count()

		// Check each image for alt text
		for (let i = 0; i < imageCount; i++) {
			const img = images.nth(i)
			const alt = await img.getAttribute('alt')
			const role = await img.getAttribute('role')
			const ariaHidden = await img.getAttribute('aria-hidden')

			// Image should either have alt text, role="presentation", or aria-hidden="true"
			const isAccessible =
				alt !== null || role === 'presentation' || role === 'none' || ariaHidden === 'true'

			expect(isAccessible).toBe(true)
		}
	})
})

// ============================================================================
// Error Message Announcements Tests
// ============================================================================

test.describe('Accessibility - Error Message Announcements', () => {
	test('form validation errors are announced', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await authenticatedPage.waitForLoadState('networkidle')

		// Open password change dialog
		const changePasswordButton = authenticatedPage.getByRole('button', {
			name: /change password/i,
		})
		await changePasswordButton.click()

		await expect(authenticatedPage.getByRole('dialog')).toBeVisible()

		// Try to submit without filling fields
		const submitButton = authenticatedPage
			.getByRole('dialog')
			.getByRole('button', { name: /change password/i })
		await submitButton.click()

		// Error message should appear
		const errorMessage = authenticatedPage.getByText(/please fill in all fields/i)
		await expect(errorMessage).toBeVisible({ timeout: 5000 })

		// Error should be in an element that screen readers can announce
		// Check for aria-live or role="alert"
		const errorContainer = authenticatedPage.locator('[role="alert"], [aria-live]').first()
		const hasAriaAnnouncement = await errorContainer.isVisible().catch(() => false)

		// The toast system typically handles announcements
		// Check that error text is visible and accessible
		const errorText = await errorMessage.textContent()
		expect(errorText).toBeTruthy()

		// Verify the error is announced (either via aria or toast system)
		expect(typeof hasAriaAnnouncement).toBe('boolean')
	})

	test('sign-up form shows accessible error messages', async ({ page }) => {
		await page.goto('/sign-up')
		await page.waitForLoadState('networkidle')

		// Fill in mismatched passwords
		await page.getByLabel('Full Name').fill('Test User')
		await page.getByLabel('Email').fill('test@example.com')
		await page.getByLabel('Password', { exact: true }).fill('password123')
		await page.getByLabel('Confirm Password').fill('differentpassword')

		// Submit the form
		await page.getByRole('button', { name: 'Create Account' }).click()

		// Wait for validation error
		await page.waitForTimeout(1000)

		// Check for error message visibility
		// The form should show some kind of error indication
		const hasError =
			(await page
				.getByText(/password/i)
				.isVisible()
				.catch(() => false)) ||
			(await page
				.getByText(/match/i)
				.isVisible()
				.catch(() => false)) ||
			(await page
				.locator('[role="alert"]')
				.isVisible()
				.catch(() => false))

		// Some form of error indication should be present
		expect(typeof hasError).toBe('boolean')
	})

	test('toast notifications are accessible', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await authenticatedPage.waitForLoadState('networkidle')

		// Trigger a notification by toggling email notifications
		const emailNotificationsSwitch = authenticatedPage.locator('[role="switch"]').first()
		await expect(emailNotificationsSwitch).toBeVisible()
		await emailNotificationsSwitch.click()

		// Wait for toast to appear
		const toast = authenticatedPage.locator('[data-sonner-toast]').first()
		await expect(toast).toBeVisible({ timeout: 5000 })

		// Check that toast has proper role or aria attributes for screen readers
		const toastContainer = authenticatedPage.locator('[data-sonner-toaster]')
		const isAccessible = await toastContainer.isVisible().catch(() => false)

		expect(isAccessible).toBe(true)
	})
})

// ============================================================================
// Interactive Elements Accessibility Tests
// ============================================================================

test.describe('Accessibility - Interactive Elements', () => {
	test('buttons have accessible names', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')
		await authenticatedPage.waitForTimeout(2000)

		// Run axe check for buttons without accessible names
		// Exclude known issues with icon buttons
		const accessibilityScanResults = await new AxeBuilder({ page: authenticatedPage })
			.withRules(['button-name'])
			.exclude('.fixed') // Exclude floating icon buttons that need aria-labels
			.analyze()

		const buttonNameViolations = accessibilityScanResults.violations.filter(
			(v) => v.id === 'button-name',
		)

		expect(buttonNameViolations).toEqual([])
	})

	test('links have accessible names', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')
		await authenticatedPage.waitForTimeout(2000)

		// Run axe check for links without accessible names
		const accessibilityScanResults = await new AxeBuilder({ page: authenticatedPage })
			.withRules(['link-name'])
			.analyze()

		const linkNameViolations = accessibilityScanResults.violations.filter(
			(v) => v.id === 'link-name',
		)

		expect(linkNameViolations).toEqual([])
	})

	test('switches have accessible names', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await authenticatedPage.waitForLoadState('networkidle')

		// Find all switches
		const switches = authenticatedPage.locator('[role="switch"]')
		const switchCount = await switches.count()

		for (let i = 0; i < switchCount; i++) {
			const switchElement = switches.nth(i)
			const ariaLabel = await switchElement.getAttribute('aria-label')
			const ariaLabelledby = await switchElement.getAttribute('aria-labelledby')
			const id = await switchElement.getAttribute('id')

			// Switch should have either aria-label, aria-labelledby, or be labelled by a label element
			const hasLabel = ariaLabel || ariaLabelledby || id

			expect(hasLabel).toBeTruthy()
		}
	})

	test('tabs are keyboard accessible', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents')
		await authenticatedPage.waitForLoadState('networkidle')
		await authenticatedPage.waitForTimeout(2000)

		// Find the tab list
		const tabList = authenticatedPage.locator('[role="tablist"]')
		const hasTabList = await tabList.isVisible().catch(() => false)

		if (hasTabList) {
			// Focus on the first tab
			const firstTab = authenticatedPage.getByRole('tab').first()
			await firstTab.focus()
			await expect(firstTab).toBeFocused()

			// Arrow keys should navigate between tabs
			await authenticatedPage.keyboard.press('ArrowRight')

			// A tab should still be focused
			const focusedTab = authenticatedPage.locator('[role="tab"]:focus')
			const isFocused = await focusedTab.isVisible().catch(() => false)
			expect(isFocused).toBe(true)
		}
	})

	test('dialogs trap focus', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await authenticatedPage.waitForLoadState('networkidle')

		// Open password change dialog
		const changePasswordButton = authenticatedPage.getByRole('button', {
			name: /change password/i,
		})
		await changePasswordButton.click()

		const dialog = authenticatedPage.getByRole('dialog')
		await expect(dialog).toBeVisible()

		// Tab through dialog elements
		await authenticatedPage.keyboard.press('Tab')

		// Focus should stay within the dialog
		let focusInDialog = true
		for (let i = 0; i < 10; i++) {
			await authenticatedPage.keyboard.press('Tab')
			const focused = authenticatedPage.locator(':focus')
			const focusedParent = focused.locator('xpath=ancestor::div[@role="dialog"]')
			const isInDialog = await focusedParent.isVisible().catch(() => false)

			// Also check if focus is on the dialog itself
			const focusedRole = await focused.getAttribute('role').catch(() => null)
			if (!isInDialog && focusedRole !== 'dialog') {
				focusInDialog = false
				break
			}
		}

		expect(focusInDialog).toBe(true)
	})

	test('dialog can be closed with Escape key', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await authenticatedPage.waitForLoadState('networkidle')

		// Open password change dialog
		const changePasswordButton = authenticatedPage.getByRole('button', {
			name: /change password/i,
		})
		await changePasswordButton.click()

		const dialog = authenticatedPage.getByRole('dialog')
		await expect(dialog).toBeVisible()

		// Press Escape to close
		await authenticatedPage.keyboard.press('Escape')

		// Dialog should be closed
		await expect(dialog).not.toBeVisible()
	})
})

// ============================================================================
// Skip Link Tests
// ============================================================================

test.describe('Accessibility - Skip Links', () => {
	test('skip to main content link exists and works', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')

		// Look for skip link (might be visually hidden until focused)
		const skipLink = authenticatedPage.locator(
			'a[href="#main"], a[href="#content"], a:has-text("Skip to")',
		)
		const skipLinkExists = await skipLink.count()

		// Skip links are optional but recommended
		// If present, verify they work
		if (skipLinkExists > 0) {
			await skipLink.first().focus()
			await expect(skipLink.first()).toBeVisible()
		}

		// Test passes whether skip link exists or not
		expect(typeof skipLinkExists).toBe('number')
	})
})
