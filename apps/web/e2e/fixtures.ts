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

	// Authenticated page fixture that signs up via API for speed, then navigates
	authenticatedPage: async ({ page, testUser }, use) => {
		const maxRetries = 3
		let lastError: Error | null = null

		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				// Sign up via API (much faster than UI form typing)
				const origin = process.env.BASE_URL || `http://localhost:${process.env.PORT || '3000'}`
				const signUpResponse = await page.request.post('/api/auth/sign-up/email', {
					headers: { Origin: origin },
					data: {
						email: testUser.email,
						password: testUser.password,
						name: testUser.name,
					},
				})

				if (!signUpResponse.ok()) {
					const errorText = await signUpResponse.text().catch(() => 'Unknown error')
					throw new Error(`Sign-up API returned ${signUpResponse.status()}: ${errorText}`)
				}

				// Ensure default workspace is created
				// First, make a GET request to seed the CSRF cookie (auth routes run before CSRF middleware)
				await page.request.get('/api/rpc/health/live')
				const cookies = await page.context().cookies()
				const csrfCookie =
					cookies.find((c) => c.name === 'csrf') ?? cookies.find((c) => c.name === '__Host-csrf')
				const csrfToken = csrfCookie?.value ?? ''

				const ensureWorkspaceResponse = await page.request.post(
					'/api/rpc/workspaces/ensureDefault',
					{
						headers: {
							'Content-Type': 'application/json',
							...(csrfToken && { 'X-CSRF-Token': csrfToken }),
						},
						data: {},
					},
				)

				if (!ensureWorkspaceResponse.ok()) {
					console.log('ensureDefault response:', await ensureWorkspaceResponse.text())
				}

				// Navigate to dashboard and wait for it to load
				await page.goto('/dashboard')
				await page.waitForSelector('main', { state: 'visible', timeout: 15000 })

				// Success - break out of retry loop
				break
			} catch (error) {
				lastError = error as Error
				console.log(`Attempt ${attempt} failed:`, lastError.message)
				if (attempt < maxRetries) {
					const newId = createId()
					testUser = {
						...testUser,
						email: `test-${newId}@example.com`,
						name: `Test User ${newId.slice(0, 8)}`,
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
	await page.waitForSelector('form', { state: 'visible', timeout: 10000 })

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
	await page.waitForSelector('form', { state: 'visible', timeout: 10000 })

	// Wait for React hydration - the form inputs need event handlers attached
	// Click the name field and wait for it to become focused (proves hydration)
	const nameInput = page.locator('#name')
	await nameInput.waitFor({ state: 'visible', timeout: 10000 })
	await nameInput.click()
	// Wait for React hydration to complete (SSR form is visible before event handlers attach)
	await page.waitForTimeout(1000)

	// Use pressSequentially for React controlled input compatibility
	await nameInput.pressSequentially(user.name, { delay: 30 })

	const emailInput = page.locator('#email')
	await emailInput.click()
	await emailInput.pressSequentially(user.email, { delay: 20 })

	const passwordInput = page.locator('#password')
	await passwordInput.click()
	await passwordInput.pressSequentially(user.password, { delay: 20 })

	const confirmInput = page.locator('#confirm-password')
	await confirmInput.click()
	await confirmInput.pressSequentially(user.password, { delay: 20 })

	await page.getByRole('button', { name: 'Create Account' }).click()
	await page.waitForURL(/\/dashboard/, { timeout: 15000 })
}
