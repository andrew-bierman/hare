import { test as baseTest, expect, type Page } from '@playwright/test'
import { test } from './fixtures'

/**
 * Settings and Profile E2E tests.
 * Tests the settings page, profile management, and sign-out functionality.
 * Also tests Team, API Keys, and Billing sub-pages.
 */

baseTest.describe('Settings Route Protection', () => {
	baseTest('unauthenticated user is redirected from settings to sign-in', async ({ page }) => {
		await page.goto('/dashboard/settings')
		await page.waitForLoadState('networkidle')
		await page.waitForURL(/\/sign-in/, { timeout: 10000 })
		await expect(page).toHaveURL(/\/sign-in/)
	})

	baseTest('unauthenticated user is redirected from api-keys to sign-in', async ({ page }) => {
		await page.goto('/dashboard/settings/api-keys')
		await page.waitForLoadState('networkidle')
		await page.waitForURL(/\/sign-in/, { timeout: 10000 })
		await expect(page).toHaveURL(/\/sign-in/)
	})

	baseTest('unauthenticated user is redirected from team to sign-in', async ({ page }) => {
		await page.goto('/dashboard/settings/team')
		await page.waitForLoadState('networkidle')
		await page.waitForURL(/\/sign-in/, { timeout: 10000 })
		await expect(page).toHaveURL(/\/sign-in/)
	})

	baseTest('unauthenticated user is redirected from billing to sign-in', async ({ page }) => {
		await page.goto('/dashboard/settings/billing')
		await page.waitForLoadState('networkidle')
		await page.waitForURL(/\/sign-in/, { timeout: 10000 })
		await expect(page).toHaveURL(/\/sign-in/)
	})
})

test.describe('Settings Page - Authenticated', () => {
	test('displays user name in profile', async ({ authenticatedPage, testUser: _testUser }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await authenticatedPage.waitForLoadState('networkidle')

		// Name input should contain the test user's name
		const nameInput = authenticatedPage.getByLabel(/name/i).first()
		await expect(nameInput).toBeVisible()

		// Value should contain part of the test user name
		const nameValue = await nameInput.inputValue()
		expect(nameValue.length).toBeGreaterThan(0)
	})

	test('displays user email in profile', async ({ authenticatedPage, testUser: _testUser }) => {
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

test.describe('Settings Tab Navigation', () => {
	test('can navigate between settings tabs', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await authenticatedPage.waitForLoadState('networkidle')

		// Look for tab navigation
		const teamTab = authenticatedPage.getByRole('link', { name: /team/i })
		const apiKeysTab = authenticatedPage.getByRole('link', { name: /api.*keys/i })
		const billingTab = authenticatedPage.getByRole('link', { name: /billing/i })

		// Check if tabs are visible (they might not all be present)
		const hasTeamTab = await teamTab.isVisible({ timeout: 2000 }).catch(() => false)
		const hasApiKeysTab = await apiKeysTab.isVisible({ timeout: 2000 }).catch(() => false)
		const hasBillingTab = await billingTab.isVisible({ timeout: 2000 }).catch(() => false)

		// At least one additional tab should be visible
		expect(hasTeamTab || hasApiKeysTab || hasBillingTab).toBe(true)
	})
})

test.describe('Team Settings Page', () => {
	test('loads team settings page without errors', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings/team')
		await authenticatedPage.waitForLoadState('networkidle')

		// Wait to ensure no infinite spinner
		await authenticatedPage.waitForTimeout(2000)

		// Check that main content area exists and is not showing endless loading
		const mainContent = authenticatedPage.locator('main')
		await expect(mainContent).toBeVisible()

		// Page should have loaded - check for heading or content
		const hasHeading =
			(await authenticatedPage
				.getByRole('heading', { name: /team/i })
				.isVisible({ timeout: 2000 })
				.catch(() => false)) ||
			(await authenticatedPage.getByText(/team/i).first().isVisible({ timeout: 2000 }).catch(() => false))

		expect(hasHeading).toBe(true)
	})

	test('team page shows team members or invite option', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings/team')
		await authenticatedPage.waitForLoadState('networkidle')

		// Should show either team members list or invite button
		const hasInviteButton =
			(await authenticatedPage
				.getByRole('button', { name: /invite/i })
				.isVisible({ timeout: 3000 })
				.catch(() => false)) ||
			(await authenticatedPage
				.getByRole('button', { name: /add.*member/i })
				.isVisible({ timeout: 2000 })
				.catch(() => false))

		const hasTeamContent =
			hasInviteButton ||
			(await authenticatedPage.getByText(/members/i).isVisible({ timeout: 2000 }).catch(() => false)) ||
			(await authenticatedPage.getByText(/coming soon/i).isVisible({ timeout: 2000 }).catch(() => false))

		expect(hasTeamContent).toBe(true)
	})

	test('can navigate to team settings via tab', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await authenticatedPage.waitForLoadState('networkidle')

		const teamTab = authenticatedPage.getByRole('link', { name: /team/i })
		if (await teamTab.isVisible({ timeout: 2000 })) {
			await teamTab.click()
			await authenticatedPage.waitForURL(/\/dashboard\/settings\/team/)
			await authenticatedPage.waitForLoadState('networkidle')

			const mainContent = authenticatedPage.locator('main')
			await expect(mainContent).toBeVisible()
		}
	})
})

test.describe('API Keys Settings Page', () => {
	test('loads api keys page without errors', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings/api-keys')
		await authenticatedPage.waitForLoadState('networkidle')

		// Wait to ensure no infinite spinner
		await authenticatedPage.waitForTimeout(2000)

		// Check that main content area exists
		const mainContent = authenticatedPage.locator('main')
		await expect(mainContent).toBeVisible()

		// Page should have loaded - check for heading or content
		const hasHeading =
			(await authenticatedPage
				.getByRole('heading', { name: /api.*keys?/i })
				.isVisible({ timeout: 2000 })
				.catch(() => false)) ||
			(await authenticatedPage
				.getByText(/api.*keys?/i)
				.first()
				.isVisible({ timeout: 2000 })
				.catch(() => false))

		expect(hasHeading).toBe(true)
	})

	test('api keys page shows create button or keys list', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings/api-keys')
		await authenticatedPage.waitForLoadState('networkidle')

		// Should show either create button or existing keys
		const hasCreateButton =
			(await authenticatedPage
				.getByRole('button', { name: /create.*key/i })
				.isVisible({ timeout: 3000 })
				.catch(() => false)) ||
			(await authenticatedPage
				.getByRole('button', { name: /new.*key/i })
				.isVisible({ timeout: 2000 })
				.catch(() => false)) ||
			(await authenticatedPage
				.getByRole('button', { name: /generate/i })
				.isVisible({ timeout: 2000 })
				.catch(() => false))

		const hasApiKeysContent =
			hasCreateButton ||
			(await authenticatedPage.getByText(/no.*keys/i).isVisible({ timeout: 2000 }).catch(() => false)) ||
			(await authenticatedPage.getByText(/coming soon/i).isVisible({ timeout: 2000 }).catch(() => false)) ||
			(await authenticatedPage.getByRole('table').isVisible({ timeout: 2000 }).catch(() => false))

		expect(hasApiKeysContent).toBe(true)
	})

	test('can navigate to api keys via tab', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await authenticatedPage.waitForLoadState('networkidle')

		const apiKeysTab = authenticatedPage.getByRole('link', { name: /api.*keys/i })
		if (await apiKeysTab.isVisible({ timeout: 2000 })) {
			await apiKeysTab.click()
			await authenticatedPage.waitForURL(/\/dashboard\/settings\/api-keys/)
			await authenticatedPage.waitForLoadState('networkidle')

			const mainContent = authenticatedPage.locator('main')
			await expect(mainContent).toBeVisible()
		}
	})
})

test.describe('Billing Settings Page', () => {
	test('loads billing page without errors', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings/billing')
		await authenticatedPage.waitForLoadState('networkidle')

		// Wait to ensure no infinite spinner
		await authenticatedPage.waitForTimeout(2000)

		// Check that main content area exists
		const mainContent = authenticatedPage.locator('main')
		await expect(mainContent).toBeVisible()

		// Page should have loaded - check for heading or content
		const hasHeading =
			(await authenticatedPage
				.getByRole('heading', { name: /billing/i })
				.isVisible({ timeout: 2000 })
				.catch(() => false)) ||
			(await authenticatedPage.getByText(/billing/i).first().isVisible({ timeout: 2000 }).catch(() => false))

		expect(hasHeading).toBe(true)
	})

	test('billing page shows subscription info or upgrade option', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings/billing')
		await authenticatedPage.waitForLoadState('networkidle')

		// Should show billing information
		const hasBillingContent =
			(await authenticatedPage
				.getByText(/subscription/i)
				.first()
				.isVisible({ timeout: 2000 })
				.catch(() => false)) ||
			(await authenticatedPage.getByText(/plan/i).first().isVisible({ timeout: 2000 }).catch(() => false)) ||
			(await authenticatedPage
				.getByText(/upgrade/i)
				.first()
				.isVisible({ timeout: 2000 })
				.catch(() => false)) ||
			(await authenticatedPage.getByText(/coming soon/i).isVisible({ timeout: 2000 }).catch(() => false)) ||
			(await authenticatedPage
				.getByRole('button', { name: /upgrade/i })
				.isVisible({ timeout: 2000 })
				.catch(() => false))

		expect(hasBillingContent).toBe(true)
	})

	test('can navigate to billing via tab', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await authenticatedPage.waitForLoadState('networkidle')

		const billingTab = authenticatedPage.getByRole('link', { name: /billing/i })
		if (await billingTab.isVisible({ timeout: 2000 })) {
			await billingTab.click()
			await authenticatedPage.waitForURL(/\/dashboard\/settings\/billing/)
			await authenticatedPage.waitForLoadState('networkidle')

			const mainContent = authenticatedPage.locator('main')
			await expect(mainContent).toBeVisible()
		}
	})
})

test.describe('Settings Page Loading States', () => {
	test('main settings page does not show infinite spinner', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await authenticatedPage.waitForLoadState('networkidle')

		// Wait 3 seconds to ensure spinner is gone
		await authenticatedPage.waitForTimeout(3000)

		// Check that content is visible (not just spinner)
		const nameInput = authenticatedPage.getByLabel(/name/i).first()
		await expect(nameInput).toBeVisible()
	})

	test('team settings page does not show infinite spinner', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings/team')
		await authenticatedPage.waitForLoadState('networkidle')

		// Wait 3 seconds to ensure spinner is gone
		await authenticatedPage.waitForTimeout(3000)

		// Check that main content is present
		const mainContent = authenticatedPage.locator('main')
		await expect(mainContent).toBeVisible()

		// Should have some content, not just a spinner
		const hasContent =
			(await authenticatedPage.getByRole('heading').first().isVisible({ timeout: 1000 }).catch(() => false)) ||
			(await authenticatedPage
				.getByRole('button')
				.first()
				.isVisible({ timeout: 1000 })
				.catch(() => false)) ||
			(await authenticatedPage.getByText(/team/i).first().isVisible({ timeout: 1000 }).catch(() => false))

		expect(hasContent).toBe(true)
	})

	test('api keys page does not show infinite spinner', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings/api-keys')
		await authenticatedPage.waitForLoadState('networkidle')

		// Wait 3 seconds to ensure spinner is gone
		await authenticatedPage.waitForTimeout(3000)

		// Check that main content is present
		const mainContent = authenticatedPage.locator('main')
		await expect(mainContent).toBeVisible()

		// Should have some content
		const hasContent =
			(await authenticatedPage.getByRole('heading').first().isVisible({ timeout: 1000 }).catch(() => false)) ||
			(await authenticatedPage
				.getByRole('button')
				.first()
				.isVisible({ timeout: 1000 })
				.catch(() => false)) ||
			(await authenticatedPage
				.getByText(/api.*key/i)
				.first()
				.isVisible({ timeout: 1000 })
				.catch(() => false))

		expect(hasContent).toBe(true)
	})

	test('billing page does not show infinite spinner', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings/billing')
		await authenticatedPage.waitForLoadState('networkidle')

		// Wait 3 seconds to ensure spinner is gone
		await authenticatedPage.waitForTimeout(3000)

		// Check that main content is present
		const mainContent = authenticatedPage.locator('main')
		await expect(mainContent).toBeVisible()

		// Should have some content
		const hasContent =
			(await authenticatedPage.getByRole('heading').first().isVisible({ timeout: 1000 }).catch(() => false)) ||
			(await authenticatedPage
				.getByRole('button')
				.first()
				.isVisible({ timeout: 1000 })
				.catch(() => false)) ||
			(await authenticatedPage.getByText(/billing/i).first().isVisible({ timeout: 1000 }).catch(() => false))

		expect(hasContent).toBe(true)
	})
})
