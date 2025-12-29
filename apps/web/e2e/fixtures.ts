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

				// Wait for form to be ready
				await page.getByLabel('Full Name').waitFor({ state: 'visible', timeout: 10000 })

				// Fill in the sign-up form
				await page.getByLabel('Full Name').fill(testUser.name)
				await page.getByLabel('Email').fill(testUser.email)
				await page.getByLabel('Password', { exact: true }).fill(testUser.password)
				await page.getByLabel('Confirm Password').fill(testUser.password)

				// Submit the form and wait for navigation
				const submitButton = page.getByRole('button', { name: 'Create Account' })
				await submitButton.waitFor({ state: 'visible' })

				// Click and wait for either navigation or error
				const [response] = await Promise.all([
					page.waitForResponse(
						(resp) => resp.url().includes('/api/auth') && resp.request().method() === 'POST',
						{ timeout: 30000 },
					),
					submitButton.click(),
				])

				// Check if sign-up was successful
				if (!response.ok()) {
					const errorText = await response.text().catch(() => 'Unknown error')
					throw new Error(`Sign-up API returned ${response.status()}: ${errorText}`)
				}

				// Wait for redirect to dashboard
				await page.waitForURL(/\/dashboard/, { timeout: 15000 })

				// Wait for auth session to be fully valid by polling the API
				// The session may take a few seconds to become valid after sign-up
				let sessionWaitAttempts = 0
				const maxSessionWaitAttempts = 15
				while (sessionWaitAttempts < maxSessionWaitAttempts) {
					const sessionCheckResponse = await page.request.get('/api/workspaces')
					if (sessionCheckResponse.ok()) {
						break // Session is now valid
					}
					await page.waitForTimeout(500)
					sessionWaitAttempts++
				}

				if (sessionWaitAttempts >= maxSessionWaitAttempts) {
					throw new Error('Timed out waiting for auth session to become valid')
				}

				// Now reload the page to ensure React has the session hydrated
				await page.reload()
				await page.waitForLoadState('networkidle')

				// Verify we're on the dashboard by checking for Dashboard heading
				const dashboardHeading = page.getByRole('heading', { name: 'Dashboard' })
				await dashboardHeading.waitFor({ state: 'visible', timeout: 10000 })

				// Wait for a workspace to be created (the app auto-creates one for new users)
				// Poll the workspaces API until we get at least one workspace
				let workspaceWaitAttempts = 0
				const maxWorkspaceWaitAttempts = 30
				while (workspaceWaitAttempts < maxWorkspaceWaitAttempts) {
					const workspacesResponse = await page.request.get('/api/workspaces')
					if (workspacesResponse.ok()) {
						const data = await workspacesResponse.json()
						if (data.workspaces && data.workspaces.length > 0) {
							break
						}
					}
					await page.waitForTimeout(500)
					workspaceWaitAttempts++
				}

				if (workspaceWaitAttempts >= maxWorkspaceWaitAttempts) {
					throw new Error('Timed out waiting for workspace to be created')
				}

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
	await page.getByLabel('Full Name').waitFor({ state: 'visible', timeout: 10000 })
	await page.getByLabel('Full Name').fill(user.name)
	await page.getByLabel('Email').fill(user.email)
	await page.getByLabel('Password', { exact: true }).fill(user.password)
	await page.getByLabel('Confirm Password').fill(user.password)
	await page.getByRole('button', { name: 'Create Account' }).click()
	await page.waitForURL(/\/dashboard/, { timeout: 15000 })
}
