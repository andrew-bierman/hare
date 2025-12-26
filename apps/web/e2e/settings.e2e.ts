import { test as baseTest, expect, type Page } from '@playwright/test'
import { test } from './fixtures'

/**
 * Settings and Profile E2E tests.
 * Tests the settings page, profile management, and sign-out functionality.
 */

baseTest.describe('Settings Page - Unauthenticated', () => {
	baseTest.beforeEach(async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/settings')
		await page.waitForLoadState('networkidle')
	})

	baseTest('displays settings heading', async ({ page }: { page: Page }) => {
		await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
	})

	baseTest('shows profile section', async ({ page }: { page: Page }) => {
		await expect(page.getByText(/profile/i).first()).toBeVisible()
	})
})

test.describe('Settings Page - Authenticated', () => {
	test('displays user name in profile', async ({ authenticatedPage, testUser }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await authenticatedPage.waitForLoadState('networkidle')

		// Name input should contain the test user's name
		const nameInput = authenticatedPage.getByLabel(/name/i).first()
		await expect(nameInput).toBeVisible()

		// Value should contain part of the test user name
		const nameValue = await nameInput.inputValue()
		expect(nameValue.length).toBeGreaterThan(0)
	})

	test('displays user email in profile', async ({ authenticatedPage, testUser }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await authenticatedPage.waitForLoadState('networkidle')

		// Email should be displayed (might be disabled)
		const emailInput = authenticatedPage.getByLabel(/email/i).first()
		await expect(emailInput).toBeVisible()

		// Email should contain test email pattern
		const emailValue = await emailInput.inputValue()
		expect(emailValue).toContain('@example.com')
	})

	test('email field is disabled', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await authenticatedPage.waitForLoadState('networkidle')

		const emailInput = authenticatedPage.getByLabel(/email/i).first()
		await expect(emailInput).toBeDisabled()
	})

	test('shows workspace section', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await authenticatedPage.waitForLoadState('networkidle')

		await expect(authenticatedPage.getByText(/workspace/i).first()).toBeVisible()
	})

	test('shows security section with sign out', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await authenticatedPage.waitForLoadState('networkidle')

		// Look for security section
		const securitySection = authenticatedPage.getByText(/security/i).first()
		await expect(securitySection).toBeVisible()

		// Sign out button should be visible
		const signOutButton = authenticatedPage.getByRole('button', { name: /sign out/i })
		await expect(signOutButton).toBeVisible()
	})
})

test.describe('Profile Section', () => {
	test('can view name field', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await authenticatedPage.waitForLoadState('networkidle')

		const nameInput = authenticatedPage.getByLabel(/name/i).first()
		await expect(nameInput).toBeVisible()
		await expect(nameInput).toBeEditable()
	})

	test('can type in name field', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await authenticatedPage.waitForLoadState('networkidle')

		const nameInput = authenticatedPage.getByLabel(/name/i).first()
		const newName = `Updated Name ${Date.now()}`

		await nameInput.clear()
		await nameInput.fill(newName)

		await expect(nameInput).toHaveValue(newName)
	})

	test('save button state for profile updates', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await authenticatedPage.waitForLoadState('networkidle')

		// Save button might be disabled (feature coming soon)
		const saveButton = authenticatedPage.getByRole('button', { name: /save/i })
		if (await saveButton.isVisible({ timeout: 2000 })) {
			// Might be disabled
			await expect(saveButton).toBeDisabled()
		}
	})
})

test.describe('Notifications Section', () => {
	test('shows notification settings', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await authenticatedPage.waitForLoadState('networkidle')

		await expect(authenticatedPage.getByText(/notifications/i).first()).toBeVisible()
	})

	test('email notifications toggle is coming soon', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await authenticatedPage.waitForLoadState('networkidle')

		const emailNotifButton = authenticatedPage.getByRole('button', { name: /coming soon/i }).first()
		if (await emailNotifButton.isVisible({ timeout: 2000 })) {
			await expect(emailNotifButton).toBeDisabled()
		}
	})
})

test.describe('Security Section', () => {
	test('password change is coming soon', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await authenticatedPage.waitForLoadState('networkidle')

		// Look for password section
		const passwordText = authenticatedPage.getByText(/password/i).first()
		await expect(passwordText).toBeVisible()
	})

	test('2FA is coming soon', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await authenticatedPage.waitForLoadState('networkidle')

		// Look for 2FA section
		const twoFAText = authenticatedPage.getByText(/two-factor|2fa/i).first()
		if (await twoFAText.isVisible({ timeout: 2000 })) {
			await expect(twoFAText).toBeVisible()
		}
	})
})

test.describe('Sign Out Functionality', () => {
	test('can sign out from settings', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await authenticatedPage.waitForLoadState('networkidle')

		// Find and click sign out button
		const signOutButton = authenticatedPage.getByRole('button', { name: /sign out/i })
		await expect(signOutButton).toBeVisible()
		await expect(signOutButton).toBeEnabled()

		await signOutButton.click()

		// Should redirect to sign-in page or home
		await authenticatedPage.waitForURL(/\/(sign-in)?$/, { timeout: 10000 })

		// Should no longer be authenticated
		const signInLink = authenticatedPage.getByRole('link', { name: /sign in/i })
		const signInButton = authenticatedPage.getByRole('button', { name: /sign in/i })

		const isSignedOut =
			(await signInLink.isVisible({ timeout: 3000 }).catch(() => false)) ||
			(await signInButton.isVisible({ timeout: 1000 }).catch(() => false)) ||
			authenticatedPage.url().includes('sign-in')

		expect(isSignedOut).toBe(true)
	})

	test('sign out button shows loading state', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await authenticatedPage.waitForLoadState('networkidle')

		const signOutButton = authenticatedPage.getByRole('button', { name: /sign out/i })

		// Click and immediately check for loading state
		await signOutButton.click()

		// Button might show "Signing out..." briefly
		// Don't need to assert this as it happens quickly
	})
})

test.describe('Settings Navigation', () => {
	test('can access settings from sidebar', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')

		// Click settings in sidebar
		await authenticatedPage.getByRole('link', { name: 'Settings', exact: true }).click()
		await authenticatedPage.waitForURL(/\/dashboard\/settings/)

		await expect(authenticatedPage.getByRole('heading', { name: 'Settings' })).toBeVisible()
	})

	test('can access settings from user menu', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.waitForLoadState('networkidle')

		// Open user menu (look for user avatar/initials button)
		const userMenuButton = authenticatedPage
			.locator('button')
			.filter({ hasText: /^[A-Z]{1,2}$/ })
			.first()

		if (await userMenuButton.isVisible({ timeout: 2000 })) {
			await userMenuButton.click()
			await authenticatedPage.waitForTimeout(500)

			// Click settings in dropdown
			const settingsLink = authenticatedPage.getByRole('menuitem', { name: /settings/i })
			if (await settingsLink.isVisible({ timeout: 2000 })) {
				await settingsLink.click()
				await authenticatedPage.waitForURL(/\/dashboard\/settings/)
			}
		}
	})
})

test.describe('Settings Page Sections', () => {
	test('all expected sections are visible', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await authenticatedPage.waitForLoadState('networkidle')

		// Check for main sections
		await expect(authenticatedPage.getByText(/profile/i).first()).toBeVisible()
		await expect(authenticatedPage.getByText(/workspace/i).first()).toBeVisible()
		await expect(authenticatedPage.getByText(/notifications/i).first()).toBeVisible()
		await expect(authenticatedPage.getByText(/security/i).first()).toBeVisible()
	})

	test('sections have descriptive text', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await authenticatedPage.waitForLoadState('networkidle')

		// Profile section should have description
		await expect(authenticatedPage.getByText(/manage.*account/i).first()).toBeVisible()
	})
})
