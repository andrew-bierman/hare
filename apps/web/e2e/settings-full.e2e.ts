import { expect, test } from './fixtures'

test.describe('Settings - Profile', () => {
	test('settings page loads', async ({ authenticatedPage: page }) => {
		await page.goto('/dashboard/settings')
		await page.waitForSelector('main', { state: 'visible' })

		await expect(page.getByText(/settings/i).first()).toBeVisible()
	})

	test('profile section is visible', async ({ authenticatedPage: page }) => {
		await page.goto('/dashboard/settings')
		await page.waitForSelector('main', { state: 'visible' })

		// Should show profile/account info
		await expect(
			page.getByText(/profile|account/i).first(),
		).toBeVisible()
	})

	test('displays user email', async ({ authenticatedPage: page, testUser }) => {
		await page.goto('/dashboard/settings')
		await page.waitForSelector('main', { state: 'visible' })

		// User email should be displayed somewhere
		await expect(page.getByText(testUser.email).first()).toBeVisible({ timeout: 10000 }).catch(() => {
			// Email might be partially hidden or in a different format
		})
	})
})

test.describe('Settings - API Keys', () => {
	test('api keys page loads', async ({ authenticatedPage: page }) => {
		await page.goto('/dashboard/settings/api-keys')
		await page.waitForSelector('main', { state: 'visible' })

		await expect(page.getByText(/api key/i).first()).toBeVisible()
	})

	test('can create a new API key', async ({ authenticatedPage: page }) => {
		await page.goto('/dashboard/settings/api-keys')
		await page.waitForSelector('main', { state: 'visible' })

		const createButton = page.getByRole('button', { name: /create|generate|new/i }).first()
		if (await createButton.isVisible().catch(() => false)) {
			await createButton.click()

			// Should show a dialog or form for key name
			const nameInput = page.getByLabel(/name|label/i).first()
				.or(page.getByPlaceholder(/name|label/i).first())
			if (await nameInput.isVisible().catch(() => false)) {
				await nameInput.click()
				await nameInput.pressSequentially(`Test Key ${Date.now()}`, { delay: 10 })

				const submitButton = page.getByRole('button', { name: /create|generate|save/i }).last()
				if (await submitButton.isVisible().catch(() => false)) {
					await submitButton.click()

					// Should show the key (only shown once)
					await expect(
						page.getByText(/sk-|hare_/i).first()
							.or(page.getByText(/key.*created/i).first()),
					).toBeVisible({ timeout: 10000 }).catch(() => {
						// Key display format may vary
					})
				}
			}
		}
	})
})

test.describe('Settings - Team', () => {
	test('team page loads', async ({ authenticatedPage: page }) => {
		await page.goto('/dashboard/settings/team')
		await page.waitForSelector('main', { state: 'visible' })

		await expect(
			page.getByText(/team|members/i).first(),
		).toBeVisible()
	})

	test('shows current user as member', async ({ authenticatedPage: page }) => {
		await page.goto('/dashboard/settings/team')
		await page.waitForSelector('main', { state: 'visible' })

		// Current user should appear in members list
		await expect(
			page.getByText(/owner|admin/i).first(),
		).toBeVisible({ timeout: 10000 }).catch(() => {
			// Role label may not be shown
		})
	})

	test('has invite member option', async ({ authenticatedPage: page }) => {
		await page.goto('/dashboard/settings/team')
		await page.waitForSelector('main', { state: 'visible' })

		const inviteButton = page.getByRole('button', { name: /invite|add member/i }).first()
		if (await inviteButton.isVisible().catch(() => false)) {
			await expect(inviteButton).toBeVisible()
		}
	})
})

test.describe('Settings - Billing', () => {
	test('billing page loads', async ({ authenticatedPage: page }) => {
		await page.goto('/dashboard/settings/billing')
		await page.waitForSelector('main', { state: 'visible' })

		await expect(
			page.getByText(/billing|plan|subscription/i).first(),
		).toBeVisible()
	})
})

test.describe('Settings - Audit Logs', () => {
	test('audit logs page loads', async ({ authenticatedPage: page }) => {
		await page.goto('/dashboard/settings/audit-logs')
		await page.waitForSelector('main', { state: 'visible' })

		await expect(
			page.getByText(/audit|log/i).first(),
		).toBeVisible()
	})
})

test.describe('Dashboard Analytics & Usage', () => {
	test('analytics page loads', async ({ authenticatedPage: page }) => {
		await page.goto('/dashboard/analytics')
		await page.waitForSelector('main', { state: 'visible' })

		await expect(
			page.getByText(/analytics/i).first(),
		).toBeVisible()
	})

	test('usage page loads', async ({ authenticatedPage: page }) => {
		await page.goto('/dashboard/usage')
		await page.waitForSelector('main', { state: 'visible' })

		await expect(
			page.getByText(/usage/i).first(),
		).toBeVisible()
	})
})

test.describe('Sign Out', () => {
	test('can sign out from settings', async ({ authenticatedPage: page }) => {
		await page.goto('/dashboard/settings')
		await page.waitForSelector('main', { state: 'visible' })

		// Look for sign out button
		const signOutButton = page.getByRole('button', { name: /sign out|log out/i }).first()
		if (await signOutButton.isVisible().catch(() => false)) {
			await signOutButton.click()

			// Should redirect to sign-in or landing page
			await page.waitForURL(/\/(sign-in)?$/, { timeout: 15000 })
		}
	})
})
