// Use native crypto.randomUUID() which is workers/browser compatible
function createId(): string {
	return crypto.randomUUID()
}

import { type APIRequestContext, test as base, expect, type Page } from '@playwright/test'

/**
 * Generate a unique test user for each test run to avoid conflicts.
 */
export function generateTestUser() {
	const uniqueId = createId()
	return {
		email: `test-${uniqueId}@example.com`,
		password: 'TestPassword123!',
		name: `Test User ${uniqueId.slice(0, 8)}`,
	}
}

/**
 * Default test user credentials for shared scenarios.
 */
export const TEST_USER = {
	email: 'test-e2e@example.com',
	password: 'TestPassword123!',
	name: 'E2E Test User',
}

/**
 * Extended test with authentication helpers.
 */
export const test = base.extend<{
	authenticatedPage: Page
	testUser: { email: string; password: string; name: string }
}>({
	// Provide a unique test user for each test
	// biome-ignore lint/correctness/noEmptyPattern: Playwright requires object destructuring for fixtures
	testUser: async ({}, use) => {
		await use(generateTestUser())
	},

	// Authenticated page fixture that automatically signs in
	authenticatedPage: async ({ page, testUser }, use) => {
		const maxRetries = 3
		let lastError: Error | null = null

		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				// Create and sign in the test user
				await page.goto('/sign-up')
				await page.waitForLoadState('networkidle')

				// Wait for form to be ready and stable (OAuth providers may load)
				await page.getByLabel('Full Name').waitFor({ state: 'visible', timeout: 10000 })
				await page.waitForLoadState('networkidle')
				await page.waitForTimeout(1000) // Give React time to settle

				// Fill in the sign-up form - verify each field is filled
				const nameField = page.getByLabel('Full Name')
				await nameField.fill(testUser.name)
				await expect(nameField).toHaveValue(testUser.name)

				const emailField = page.getByLabel('Email')
				await emailField.fill(testUser.email)
				await expect(emailField).toHaveValue(testUser.email)

				const passwordField = page.getByLabel('Password', { exact: true })
				await passwordField.fill(testUser.password)

				const confirmPasswordField = page.getByLabel('Confirm Password')
				await confirmPasswordField.fill(testUser.password)

				// Submit the form and wait for navigation
				const submitButton = page.getByRole('button', { name: 'Create Account' })
				await submitButton.waitFor({ state: 'visible' })
				await expect(submitButton).toBeEnabled()

				// Click and wait for redirect - the API call may complete very quickly
				await submitButton.click()

				// Wait for redirect to dashboard (auth will complete in background)
				await page.waitForURL(/\/dashboard/, { timeout: 30000 })

				// Wait for auth session to be fully valid by polling the API
				// The session may take a few seconds to become valid after sign-up
				let sessionWaitAttempts = 0
				const maxSessionWaitAttempts = 20
				while (sessionWaitAttempts < maxSessionWaitAttempts) {
					const sessionCheckResponse = await page.request.get('/api/auth/get-session')
					if (sessionCheckResponse.ok()) {
						const data = await sessionCheckResponse.json()
						// Session endpoint returns { session, user } when authenticated, null when not
						if (data !== null && data.session) {
							break // Session is now valid
						}
					}
					await page.waitForTimeout(500)
					sessionWaitAttempts++
				}

				if (sessionWaitAttempts >= maxSessionWaitAttempts) {
					throw new Error('Timed out waiting for auth session to become valid')
				}

				// Wait for the page to settle - dashboard components will load data
				await page.waitForLoadState('networkidle')

				// Wait for workspace loading to complete
				// The app shows "Loading workspace..." while fetching workspace data
				let workspaceWaitAttempts = 0
				const maxWorkspaceWaitAttempts = 60 // 30 seconds max
				while (workspaceWaitAttempts < maxWorkspaceWaitAttempts) {
					const loadingVisible = await page
						.getByText('Loading workspace...')
						.isVisible()
						.catch(() => false)
					const settingUpVisible = await page
						.getByText('Setting up your workspace')
						.isVisible()
						.catch(() => false)
					if (!loadingVisible && !settingUpVisible) {
						break
					}
					await page.waitForTimeout(500)
					workspaceWaitAttempts++
				}

				// Wait for network to settle after workspace loads
				await page.waitForLoadState('networkidle')

				// Verify we're on the dashboard by checking for Dashboard heading
				// The heading may take a moment to appear after data loads
				const dashboardHeading = page.getByRole('heading', { name: 'Dashboard' })
				await dashboardHeading.waitFor({ state: 'visible', timeout: 15000 })

				// Success - break out of retry loop
				break
			} catch (error) {
				lastError = error as Error
				if (attempt < maxRetries) {
					// Generate new unique user for retry to avoid duplicate email issues
					// Create new values instead of mutating the input parameter
					const newId = createId()
					testUser = {
						...testUser,
						email: `test-${newId}@example.com`,
						name: `Test User ${newId.slice(0, 8)}`,
					}
					// Only wait if the page is still usable (not closed due to timeout)
					try {
						await page.waitForTimeout(1000)
					} catch {
						// Page was closed, can't wait - just continue to next attempt
					}
				}
			}
		}

		// Check if we successfully navigated to dashboard
		const currentUrl = page.url()
		if (!currentUrl.includes('/dashboard')) {
			throw (
				lastError ??
				new Error(
					`Failed to navigate to /dashboard after ${maxRetries} attempts. Final URL: ${currentUrl}`,
				)
			)
		}

		await use(page)

		// Cleanup: Sign out after the test
		try {
			// Try to sign out if there's a sign-out button/menu
			await page.goto('/dashboard/settings')
			const signOutButton = page.getByRole('button', { name: /sign out/i })
			if (await signOutButton.isVisible({ timeout: 2000 })) {
				await signOutButton.click()
			}
		} catch {
			// Ignore cleanup errors
		}
	},
})

export { expect }

/**
 * Wait for workspace loading to complete.
 * The app shows "Loading workspace..." while fetching workspace data.
 * Call this after navigating to any authenticated page.
 */
export async function waitForWorkspaceLoad(page: Page): Promise<void> {
	// First wait for network to settle
	await page.waitForLoadState('networkidle')

	// Then poll for the loading message to disappear
	let attempts = 0
	const maxAttempts = 60 // 30 seconds max
	while (attempts < maxAttempts) {
		const loadingVisible = await page.getByText('Loading workspace...').isVisible().catch(() => false)
		const settingUpVisible = await page
			.getByText('Setting up your workspace')
			.isVisible()
			.catch(() => false)
		if (!loadingVisible && !settingUpVisible) {
			break
		}
		await page.waitForTimeout(500)
		attempts++
	}

	// One more network idle wait after content loads
	await page.waitForLoadState('networkidle')
}

/**
 * Helper to create a test user via API.
 */
export async function createTestUser(
	request: APIRequestContext,
	user = TEST_USER,
): Promise<{ success: boolean; response: unknown }> {
	try {
		const response = await request.post('/api/auth/sign-up/email', {
			data: {
				email: user.email,
				password: user.password,
				name: user.name,
			},
		})

		if (response.ok()) {
			return { success: true, response: await response.json() }
		}

		return { success: false, response: await response.json() }
	} catch (error) {
		return { success: false, response: error }
	}
}

/**
 * Helper to sign in a test user via API.
 */
export async function signInTestUser(
	request: APIRequestContext,
	user = TEST_USER,
): Promise<{ success: boolean; response: unknown }> {
	try {
		const response = await request.post('/api/auth/sign-in/email', {
			data: {
				email: user.email,
				password: user.password,
			},
		})

		if (response.ok()) {
			return { success: true, response: await response.json() }
		}

		return { success: false, response: await response.json() }
	} catch (error) {
		return { success: false, response: error }
	}
}

/**
 * Helper to delete a test user via API (if endpoint exists).
 */
export async function deleteTestUser(request: APIRequestContext, userId: string): Promise<void> {
	try {
		await request.delete(`/api/users/${userId}`)
	} catch {
		// Ignore cleanup errors
	}
}

/**
 * Helper to sign in a user via the UI.
 */
export async function signInViaUI(page: Page, user = TEST_USER): Promise<void> {
	await page.goto('/sign-in')
	await page.waitForLoadState('networkidle')
	await page.getByLabel('Email').waitFor({ state: 'visible', timeout: 10000 })
	await page.getByLabel('Email').fill(user.email)
	await page.getByLabel('Password').fill(user.password)
	await page.getByRole('button', { name: 'Sign In' }).click()
	await page.waitForURL(/\/dashboard/, { timeout: 15000 })
}

/**
 * Helper to sign up a user via the UI.
 */
export async function signUpViaUI(page: Page, user = TEST_USER): Promise<void> {
	await page.goto('/sign-up')
	await page.waitForLoadState('networkidle')

	// Wait for form to be ready and stable (OAuth providers may load)
	await page.getByLabel('Full Name').waitFor({ state: 'visible', timeout: 10000 })
	await page.waitForLoadState('networkidle')
	await page.waitForTimeout(1000) // Give React time to settle

	// Fill in the sign-up form - verify each field is filled
	const nameField = page.getByLabel('Full Name')
	await nameField.fill(user.name)
	await expect(nameField).toHaveValue(user.name)

	const emailField = page.getByLabel('Email')
	await emailField.fill(user.email)
	await expect(emailField).toHaveValue(user.email)

	const passwordField = page.getByLabel('Password', { exact: true })
	await passwordField.fill(user.password)

	const confirmPasswordField = page.getByLabel('Confirm Password')
	await confirmPasswordField.fill(user.password)

	const submitButton = page.getByRole('button', { name: 'Create Account' })
	await submitButton.waitFor({ state: 'visible' })
	await expect(submitButton).toBeEnabled()
	await submitButton.click()

	await page.waitForURL(/\/dashboard/, { timeout: 30000 })
}
