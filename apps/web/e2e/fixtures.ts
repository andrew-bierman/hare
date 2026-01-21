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

				// Fill in the sign-up form using pressSequentially for React compatibility
				// Note: .fill() doesn't trigger React's onChange, so we use pressSequentially
				const nameInput = page.getByLabel('Full Name')
				const emailInput = page.getByLabel('Email')
				const passwordInput = page.getByLabel('Password', { exact: true })
				const confirmPasswordInput = page.getByLabel('Confirm Password')

				await nameInput.click()
				await nameInput.pressSequentially(testUser.name, { delay: 20 })
				await emailInput.click()
				await emailInput.pressSequentially(testUser.email, { delay: 20 })
				await passwordInput.click()
				await passwordInput.pressSequentially(testUser.password, { delay: 20 })
				await confirmPasswordInput.click()
				await confirmPasswordInput.pressSequentially(testUser.password, { delay: 20 })

				// Submit the form and wait for navigation
				const submitButton = page.getByRole('button', { name: 'Create Account' })
				await submitButton.waitFor({ state: 'visible' })

				// Click and wait for either navigation or error
				// Routes are warmed up by global-setup.ts, so use shorter timeout
				const [response] = await Promise.all([
					page.waitForResponse(
						(resp) => resp.url().includes('/api/auth') && resp.request().method() === 'POST',
						{ timeout: 15000 },
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

				// Wait for dashboard to fully load
				await page.waitForLoadState('networkidle')

				// Ensure default workspace is created by calling the API
				const ensureWorkspaceResponse = await page.request.post('/api/rpc/workspaces/ensureDefault', {
					headers: { 'Content-Type': 'application/json' },
					data: {},
				})

				if (!ensureWorkspaceResponse.ok()) {
					// If this fails, workspace might already exist, continue anyway
					console.log('ensureDefault response:', await ensureWorkspaceResponse.text())
				}

				// Wait for the dashboard content to be visible
				// Try multiple possible headings/content indicators
				try {
					await page.waitForSelector('main', { state: 'visible', timeout: 10000 })
				} catch {
					// Main might not be the right selector, try others
				}

				// Success - break out of retry loop
				break
			} catch (error) {
				lastError = error as Error
				console.log(`Attempt ${attempt} failed:`, lastError.message)
				if (attempt < maxRetries) {
					// Generate new unique user for retry to avoid duplicate email issues
					const newId = createId()
					testUser = {
						...testUser,
						email: `test-${newId}@example.com`,
						name: `Test User ${newId.slice(0, 8)}`,
					}
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
 * Uses pressSequentially for React form compatibility.
 */
export async function signInViaUI(page: Page, user = TEST_USER): Promise<void> {
	await page.goto('/sign-in')
	await page.waitForLoadState('networkidle')

	const emailInput = page.getByLabel('Email')
	const passwordInput = page.getByLabel('Password')

	await emailInput.waitFor({ state: 'visible', timeout: 10000 })

	// Use pressSequentially for React form compatibility
	await emailInput.click()
	await emailInput.pressSequentially(user.email, { delay: 20 })
	await passwordInput.click()
	await passwordInput.pressSequentially(user.password, { delay: 20 })

	await page.getByRole('button', { name: 'Sign In' }).click()
	await page.waitForURL(/\/dashboard/, { timeout: 15000 })
}

/**
 * Helper to sign up a user via the UI.
 * Uses pressSequentially for React form compatibility.
 */
export async function signUpViaUI(page: Page, user = TEST_USER): Promise<void> {
	await page.goto('/sign-up')
	await page.waitForLoadState('networkidle')

	const nameInput = page.getByLabel('Full Name')
	const emailInput = page.getByLabel('Email')
	const passwordInput = page.getByLabel('Password', { exact: true })
	const confirmPasswordInput = page.getByLabel('Confirm Password')

	await nameInput.waitFor({ state: 'visible', timeout: 10000 })

	// Use pressSequentially for React form compatibility
	await nameInput.click()
	await nameInput.pressSequentially(user.name, { delay: 20 })
	await emailInput.click()
	await emailInput.pressSequentially(user.email, { delay: 20 })
	await passwordInput.click()
	await passwordInput.pressSequentially(user.password, { delay: 20 })
	await confirmPasswordInput.click()
	await confirmPasswordInput.pressSequentially(user.password, { delay: 20 })

	await page.getByRole('button', { name: 'Create Account' }).click()
	await page.waitForURL(/\/dashboard/, { timeout: 15000 })
}
