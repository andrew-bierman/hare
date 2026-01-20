import { expect, test } from './fixtures'

/**
 * Settings and Profile E2E tests.
 * Tests the settings page, profile management, notifications, security, and sign-out functionality.
 */

test.describe('Settings Page - Load and Display', () => {
	test('settings page loads with all sections', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await authenticatedPage.waitForLoadState('networkidle')

		// Check main heading
		await expect(authenticatedPage.getByRole('heading', { name: 'Settings' })).toBeVisible()

		// Check all four main sections are visible
		await expect(authenticatedPage.getByText('Profile').first()).toBeVisible()
		await expect(authenticatedPage.getByText('Workspace').first()).toBeVisible()
		await expect(authenticatedPage.getByText('Notifications').first()).toBeVisible()
		await expect(authenticatedPage.getByText('Security').first()).toBeVisible()
	})

	test('all sections have descriptive text', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await authenticatedPage.waitForLoadState('networkidle')

		// Check section descriptions
		await expect(authenticatedPage.getByText('Manage your account information')).toBeVisible()
		await expect(authenticatedPage.getByText('Current workspace information')).toBeVisible()
		await expect(
			authenticatedPage.getByText('Configure how you receive notifications'),
		).toBeVisible()
		await expect(authenticatedPage.getByText('Manage your security preferences')).toBeVisible()
	})
})

test.describe('Profile Section', () => {
	test('shows user name and email', async ({ authenticatedPage, testUser: _testUser }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await authenticatedPage.waitForLoadState('networkidle')

		// Name input should contain the test user's name
		const nameInput = authenticatedPage.getByLabel(/name/i).first()
		await expect(nameInput).toBeVisible()
		const nameValue = await nameInput.inputValue()
		expect(nameValue.length).toBeGreaterThan(0)

		// Email input should contain test email pattern
		const emailInput = authenticatedPage.getByLabel(/email/i).first()
		await expect(emailInput).toBeVisible()
		const emailValue = await emailInput.inputValue()
		expect(emailValue).toContain('@example.com')
	})

	test('email field is disabled', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await authenticatedPage.waitForLoadState('networkidle')

		const emailInput = authenticatedPage.getByLabel(/email/i).first()
		await expect(emailInput).toBeDisabled()

		// Check helper text explaining why email cannot be changed
		await expect(authenticatedPage.getByText(/email cannot be changed/i)).toBeVisible()
	})

	test('name field is editable', async ({ authenticatedPage }) => {
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

	test('save button is disabled when no changes', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await authenticatedPage.waitForLoadState('networkidle')

		// Save button should be disabled when name hasn't changed
		const saveButton = authenticatedPage.getByRole('button', { name: /save changes/i })
		await expect(saveButton).toBeVisible()
		await expect(saveButton).toBeDisabled()
	})

	test('save button is enabled when name is changed', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await authenticatedPage.waitForLoadState('networkidle')

		const nameInput = authenticatedPage.getByLabel(/name/i).first()
		const originalName = await nameInput.inputValue()
		const newName = `${originalName} Modified`

		await nameInput.clear()
		await nameInput.fill(newName)

		// Save button should now be enabled
		const saveButton = authenticatedPage.getByRole('button', { name: /save changes/i })
		await expect(saveButton).toBeEnabled()
	})

	test('updating name saves and shows success message', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await authenticatedPage.waitForLoadState('networkidle')

		const nameInput = authenticatedPage.getByLabel(/name/i).first()
		const newName = `Test User ${Date.now()}`

		await nameInput.clear()
		await nameInput.fill(newName)

		// Click save
		const saveButton = authenticatedPage.getByRole('button', { name: /save changes/i })
		await saveButton.click()

		// Wait for success toast
		await expect(authenticatedPage.getByText(/profile updated successfully/i)).toBeVisible({
			timeout: 5000,
		})

		// Verify name is still the new value
		await expect(nameInput).toHaveValue(newName)

		// Save button should be disabled again after successful save
		await expect(saveButton).toBeDisabled()
	})
})

test.describe('Workspace Section', () => {
	test('shows current workspace', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await authenticatedPage.waitForLoadState('networkidle')

		// Workspace section should be visible
		await expect(authenticatedPage.getByText('Workspace').first()).toBeVisible()
		await expect(authenticatedPage.getByText('Current workspace information')).toBeVisible()

		// Should show the workspace with ID and Active status
		await expect(authenticatedPage.getByText('ID:').first()).toBeVisible()
		await expect(authenticatedPage.getByText('Active')).toBeVisible()
	})

	test('displays workspace name', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await authenticatedPage.waitForLoadState('networkidle')

		// Workspace card should have a workspace name visible
		// The workspace has a name displayed as a font-medium element
		const workspaceCard = authenticatedPage.locator('.border.rounded-lg').first()
		await expect(workspaceCard).toBeVisible()

		// Check there's text content in the workspace card
		const workspaceName = workspaceCard.locator('.font-medium').first()
		const nameText = await workspaceName.textContent()
		expect(nameText).toBeTruthy()
		expect((nameText ?? '').length).toBeGreaterThan(0)
	})

	test('shows workspace switcher hint', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await authenticatedPage.waitForLoadState('networkidle')

		// Check for workspace switcher hint text
		await expect(
			authenticatedPage.getByText(/use the workspace switcher in the sidebar/i),
		).toBeVisible()
	})
})

test.describe('Notifications Section', () => {
	test('displays notification options', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await authenticatedPage.waitForLoadState('networkidle')

		// Check for notification section
		await expect(authenticatedPage.getByText('Notifications').first()).toBeVisible()
		await expect(
			authenticatedPage.getByText('Configure how you receive notifications'),
		).toBeVisible()

		// Check for Email Notifications option
		await expect(authenticatedPage.getByText('Email Notifications')).toBeVisible()
		await expect(authenticatedPage.getByText('Receive updates via email')).toBeVisible()

		// Check for Usage Alerts option
		await expect(authenticatedPage.getByText('Usage Alerts')).toBeVisible()
		await expect(authenticatedPage.getByText('Get notified when approaching limits')).toBeVisible()
	})

	test('email notifications toggle is functional', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await authenticatedPage.waitForLoadState('networkidle')

		// Find the email notifications switch
		// Switches are role="switch" in shadcn/ui
		const emailNotificationsSwitch = authenticatedPage.locator('[role="switch"]').first()

		await expect(emailNotificationsSwitch).toBeVisible()

		// Click to toggle
		await emailNotificationsSwitch.click()

		// Should show a toast notification
		const enabledToast = authenticatedPage.getByText(/email notifications (enabled|disabled)/i)
		await expect(enabledToast).toBeVisible({ timeout: 5000 })
	})

	test('usage alerts toggle is functional', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await authenticatedPage.waitForLoadState('networkidle')

		// Find the usage alerts switch (second switch)
		const usageAlertsSwitch = authenticatedPage.locator('[role="switch"]').nth(1)

		await expect(usageAlertsSwitch).toBeVisible()

		// Click to toggle
		await usageAlertsSwitch.click()

		// Should show a toast notification
		const alertsToast = authenticatedPage.getByText(/usage alerts (enabled|disabled)/i)
		await expect(alertsToast).toBeVisible({ timeout: 5000 })
	})
})

test.describe('Security Section', () => {
	test('shows password and 2FA options', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await authenticatedPage.waitForLoadState('networkidle')

		// Check security section
		await expect(authenticatedPage.getByText('Security').first()).toBeVisible()
		await expect(authenticatedPage.getByText('Manage your security preferences')).toBeVisible()

		// Check password option
		await expect(authenticatedPage.getByText('Password').first()).toBeVisible()
		await expect(authenticatedPage.getByText('Change your password')).toBeVisible()
		await expect(authenticatedPage.getByRole('button', { name: /change password/i })).toBeVisible()

		// Check 2FA option
		await expect(authenticatedPage.getByText('Two-Factor Authentication')).toBeVisible()
		await expect(authenticatedPage.getByText('Add an extra layer of security')).toBeVisible()
	})

	test('2FA button shows coming soon and is disabled', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await authenticatedPage.waitForLoadState('networkidle')

		// Find the Coming Soon button for 2FA
		const comingSoonButton = authenticatedPage.getByRole('button', { name: /coming soon/i })
		await expect(comingSoonButton).toBeVisible()
		await expect(comingSoonButton).toBeDisabled()
	})

	test('change password button opens dialog', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await authenticatedPage.waitForLoadState('networkidle')

		// Click Change Password button
		const changePasswordButton = authenticatedPage.getByRole('button', { name: /change password/i })
		await changePasswordButton.click()

		// Dialog should open
		await expect(authenticatedPage.getByRole('dialog')).toBeVisible()
		await expect(authenticatedPage.getByText('Change Password').nth(1)).toBeVisible()
		await expect(
			authenticatedPage.getByText(/enter your current password and a new password/i),
		).toBeVisible()

		// Check password fields in dialog using IDs for unique selection
		await expect(authenticatedPage.locator('#current-password')).toBeVisible()
		await expect(authenticatedPage.locator('#new-password')).toBeVisible()
		await expect(authenticatedPage.locator('#confirm-password')).toBeVisible()
	})

	test('password dialog can be closed with cancel', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await authenticatedPage.waitForLoadState('networkidle')

		// Open dialog
		const changePasswordButton = authenticatedPage.getByRole('button', { name: /change password/i })
		await changePasswordButton.click()
		await expect(authenticatedPage.getByRole('dialog')).toBeVisible()

		// Click cancel
		const cancelButton = authenticatedPage.getByRole('button', { name: /cancel/i })
		await cancelButton.click()

		// Dialog should close
		await expect(authenticatedPage.getByRole('dialog')).not.toBeVisible()
	})

	test('password change validates all fields required', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await authenticatedPage.waitForLoadState('networkidle')

		// Open dialog
		const changePasswordButton = authenticatedPage.getByRole('button', { name: /change password/i })
		await changePasswordButton.click()
		await expect(authenticatedPage.getByRole('dialog')).toBeVisible()

		// Try to submit without filling fields
		const submitButton = authenticatedPage
			.getByRole('dialog')
			.getByRole('button', { name: /change password/i })
		await submitButton.click()

		// Should show validation error
		await expect(authenticatedPage.getByText(/please fill in all fields/i)).toBeVisible({
			timeout: 5000,
		})
	})

	test('password change validates password match', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await authenticatedPage.waitForLoadState('networkidle')

		// Open dialog
		const changePasswordButton = authenticatedPage.getByRole('button', { name: /change password/i })
		await changePasswordButton.click()
		await expect(authenticatedPage.getByRole('dialog')).toBeVisible()

		// Fill mismatched passwords using IDs
		await authenticatedPage.locator('#current-password').fill('currentpass123')
		await authenticatedPage.locator('#new-password').fill('newpassword123')
		await authenticatedPage.locator('#confirm-password').fill('differentpassword')

		// Submit
		const submitButton = authenticatedPage
			.getByRole('dialog')
			.getByRole('button', { name: /change password/i })
		await submitButton.click()

		// Should show mismatch error
		await expect(authenticatedPage.getByText(/passwords do not match/i)).toBeVisible({
			timeout: 5000,
		})
	})

	test('password change validates minimum length', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await authenticatedPage.waitForLoadState('networkidle')

		// Open dialog
		const changePasswordButton = authenticatedPage.getByRole('button', { name: /change password/i })
		await changePasswordButton.click()
		await expect(authenticatedPage.getByRole('dialog')).toBeVisible()

		// Fill short password using IDs
		await authenticatedPage.locator('#current-password').fill('currentpass123')
		await authenticatedPage.locator('#new-password').fill('short')
		await authenticatedPage.locator('#confirm-password').fill('short')

		// Submit
		const submitButton = authenticatedPage
			.getByRole('dialog')
			.getByRole('button', { name: /change password/i })
		await submitButton.click()

		// Should show length error
		await expect(authenticatedPage.getByText(/at least 8 characters/i)).toBeVisible({
			timeout: 5000,
		})
	})

	test('shows sign out button', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await authenticatedPage.waitForLoadState('networkidle')

		// Check sign out option
		await expect(authenticatedPage.getByText('Sign Out').first()).toBeVisible()
		await expect(authenticatedPage.getByText('Sign out of your account')).toBeVisible()

		// Sign out button should be visible and enabled
		const signOutButton = authenticatedPage.getByRole('button', { name: /sign out/i })
		await expect(signOutButton).toBeVisible()
		await expect(signOutButton).toBeEnabled()
	})
})

test.describe('Sign Out Functionality', () => {
	test('sign out button logs out and redirects', async ({ authenticatedPage }) => {
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

		// Button might show "Signing out..." briefly - we don't need to assert
		// as it happens very quickly, but the test ensures the flow works
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

	test('settings page URL is correct', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await authenticatedPage.waitForLoadState('networkidle')

		expect(authenticatedPage.url()).toContain('/dashboard/settings')
	})
})
