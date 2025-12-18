import { test as base, expect, type Page, type APIRequestContext } from '@playwright/test'

/**
 * Test user credentials for E2E tests.
 */
export const TEST_USER = {
	email: 'test@example.com',
	password: 'testpassword123',
	name: 'Test User',
}

/**
 * Extended test with authentication helpers.
 */
export const test = base.extend<{
	authenticatedPage: Page
}>({
	authenticatedPage: async ({ page }, use) => {
		// For now, we'll use the page without auth
		// In a real implementation, you'd:
		// 1. Create a test user in beforeAll
		// 2. Sign in programmatically
		// 3. Save the auth state
		await use(page)
	},
})

export { expect }

/**
 * Helper to create a test user via API.
 */
export async function createTestUser(request: APIRequestContext) {
	const response = await request.post('/api/auth/sign-up/email', {
		data: {
			email: TEST_USER.email,
			password: TEST_USER.password,
			name: TEST_USER.name,
		},
	})
	return response
}

/**
 * Helper to sign in a test user via API.
 */
export async function signInTestUser(request: APIRequestContext) {
	const response = await request.post('/api/auth/sign-in/email', {
		data: {
			email: TEST_USER.email,
			password: TEST_USER.password,
		},
	})
	return response
}
