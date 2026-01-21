import { type APIRequestContext, test as baseTest, expect, type Page } from '@playwright/test'
import { signUpViaUI, test } from './fixtures'

/**
 * Helper to fill a React form input using pressSequentially
 * This is required because Playwright's .fill() doesn't trigger React's onChange
 */
async function fillInput(page: Page, label: string, value: string, exact = false) {
	const input = page.getByLabel(label, { exact })
	await input.click()
	await input.clear()
	await input.pressSequentially(value, { delay: 15 })
}

baseTest.describe('Authentication - Page Rendering', () => {
	baseTest('should show sign-in page', async ({ page }: { page: Page }) => {
		await page.goto('/sign-in')
		await expect(page).toHaveURL('/sign-in')
		await page.waitForLoadState('networkidle')
		await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible()
	})

	baseTest('should show sign-up page', async ({ page }: { page: Page }) => {
		await page.goto('/sign-up')
		await expect(page).toHaveURL('/sign-up')
		await page.waitForLoadState('networkidle')
		await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible()
	})

	baseTest('should have email and password fields on sign-in', async ({ page }: { page: Page }) => {
		await page.goto('/sign-in')
		await page.waitForLoadState('networkidle')
		await expect(page.getByLabel('Email')).toBeVisible()
		await expect(page.getByLabel('Password')).toBeVisible()
		await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible()
	})

	baseTest(
		'should have email, name, and password fields on sign-up',
		async ({ page }: { page: Page }) => {
			await page.goto('/sign-up')
			await page.waitForLoadState('networkidle')
			await expect(page.getByLabel('Full Name')).toBeVisible()
			await expect(page.getByLabel('Email')).toBeVisible()
			await expect(page.getByLabel('Password', { exact: true })).toBeVisible()
			await expect(page.getByLabel('Confirm Password')).toBeVisible()
			await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible()
		},
	)

	baseTest('should link between sign-in and sign-up pages', async ({ page }: { page: Page }) => {
		await page.goto('/sign-in')
		await page.waitForLoadState('networkidle')
		const signUpLink = page.locator('a[href="/sign-up"]')
		await expect(signUpLink).toBeVisible()
		await expect(signUpLink).toHaveAttribute('href', '/sign-up')
	})

	baseTest('should have sign in link on sign-up page', async ({ page }: { page: Page }) => {
		await page.goto('/sign-up')
		await page.waitForLoadState('networkidle')
		const signInLink = page.locator('a[href="/sign-in"]')
		await expect(signInLink).toBeVisible()
		await expect(signInLink).toHaveAttribute('href', '/sign-in')
	})
})

test.describe('Authentication - Sign Up Flow', () => {
	test('should successfully create a new user account', async ({ page, testUser }) => {
		await page.goto('/sign-up')
		await page.waitForLoadState('networkidle')

		// Wait for form to be ready
		await page.getByLabel('Full Name').waitFor({ state: 'visible', timeout: 10000 })

		// Fill in the sign-up form using pressSequentially for React compatibility
		await fillInput(page, 'Full Name', testUser.name)
		await fillInput(page, 'Email', testUser.email)
		await fillInput(page, 'Password', testUser.password, true)
		await fillInput(page, 'Confirm Password', testUser.password)

		// Submit the form
		await page.getByRole('button', { name: 'Create Account' }).click()

		// Should redirect to dashboard after successful signup
		await page.waitForURL(/\/dashboard/, { timeout: 15000 })
		await expect(page).toHaveURL(/\/dashboard/)
	})

	test('should show error for duplicate email', async ({ page, testUser }) => {
		// First registration
		await signUpViaUI(page, testUser)

		// Sign out by navigating to sign-in (which clears the redirect)
		await page.goto('/sign-in')
		await page.waitForLoadState('networkidle')

		// Try to register again with same email
		await page.goto('/sign-up')
		await page.waitForLoadState('networkidle')

		await fillInput(page, 'Full Name', testUser.name)
		await fillInput(page, 'Email', testUser.email)
		await fillInput(page, 'Password', testUser.password, true)
		await fillInput(page, 'Confirm Password', testUser.password)

		await page.getByRole('button', { name: 'Create Account' }).click()

		// Should stay on sign-up page or show error (duplicate email)
		// Wait a moment for any redirect
		await page.waitForTimeout(2000)
		// Should still be on auth pages (not dashboard)
		expect(page.url()).not.toContain('/dashboard')
	})

	test('should show error for password mismatch', async ({ page, testUser }) => {
		await page.goto('/sign-up')
		await page.waitForLoadState('networkidle')

		await fillInput(page, 'Full Name', testUser.name)
		await fillInput(page, 'Email', testUser.email)
		await fillInput(page, 'Password', testUser.password, true)
		await fillInput(page, 'Confirm Password', 'DifferentPassword123')

		await page.getByRole('button', { name: 'Create Account' }).click()

		// Should stay on sign-up page due to validation error
		await page.waitForTimeout(1000)
		await expect(page).toHaveURL(/sign-up/)
	})
})

test.describe('Authentication - Sign In Flow', () => {
	test('should successfully sign in with valid credentials', async ({ page, testUser }) => {
		// Create user first
		await signUpViaUI(page, testUser)

		// Navigate to sign-in page
		await page.goto('/sign-in')
		await page.waitForLoadState('networkidle')
		await page.getByLabel('Email').waitFor({ state: 'visible', timeout: 10000 })

		// Sign in with the same credentials
		await fillInput(page, 'Email', testUser.email)
		await fillInput(page, 'Password', testUser.password)
		await page.getByRole('button', { name: 'Sign In' }).click()

		// Should redirect to dashboard
		await page.waitForURL(/\/dashboard/, { timeout: 15000 })
		await expect(page).toHaveURL(/\/dashboard/)
	})

	test('should show error for invalid credentials', async ({ page }) => {
		await page.goto('/sign-in')
		await page.waitForLoadState('networkidle')

		await fillInput(page, 'Email', 'nonexistent@example.com')
		await fillInput(page, 'Password', 'WrongPassword123')
		await page.getByRole('button', { name: 'Sign In' }).click()

		// Should stay on sign-in page (invalid credentials)
		await page.waitForTimeout(2000)
		await expect(page).toHaveURL(/sign-in/)
	})
})

test.describe('Authentication - Protected Routes', () => {
	test('authenticated user can access dashboard', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await expect(authenticatedPage).toHaveURL(/\/dashboard/)
		// Wait for page to load and check main content is visible
		await authenticatedPage.waitForLoadState('networkidle')
		await expect(authenticatedPage.locator('main')).toBeVisible()
	})

	test('authenticated user can access agents page', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents')
		await expect(authenticatedPage).toHaveURL(/\/dashboard\/agents/)
		await authenticatedPage.waitForLoadState('networkidle')
	})

	test('authenticated user can access tools page', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/tools')
		await expect(authenticatedPage).toHaveURL(/\/dashboard\/tools/)
		await authenticatedPage.waitForLoadState('networkidle')
	})

	test('authenticated user can access settings page', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await expect(authenticatedPage).toHaveURL(/\/dashboard\/settings/)
		await authenticatedPage.waitForLoadState('networkidle')
	})

	test('authenticated user can access analytics page', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/analytics')
		await expect(authenticatedPage).toHaveURL(/\/dashboard\/analytics/)
		await authenticatedPage.waitForLoadState('networkidle')
	})

	test('authenticated user can access usage page', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/usage')
		await expect(authenticatedPage).toHaveURL(/\/dashboard\/usage/)
		await authenticatedPage.waitForLoadState('networkidle')
	})
})

test.describe('Authentication - Route Protection', () => {
	test('unauthenticated user is redirected from dashboard to sign-in', async ({ page }) => {
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')
		// Should redirect to sign-in
		await page.waitForURL(/\/sign-in/, { timeout: 10000 })
		await expect(page).toHaveURL(/\/sign-in/)
	})

	test('unauthenticated user is redirected from agents to sign-in', async ({ page }) => {
		await page.goto('/dashboard/agents')
		await page.waitForLoadState('networkidle')
		await page.waitForURL(/\/sign-in/, { timeout: 10000 })
		await expect(page).toHaveURL(/\/sign-in/)
	})

	test('unauthenticated user is redirected from settings to sign-in', async ({ page }) => {
		await page.goto('/dashboard/settings')
		await page.waitForLoadState('networkidle')
		await page.waitForURL(/\/sign-in/, { timeout: 10000 })
		await expect(page).toHaveURL(/\/sign-in/)
	})
})

baseTest.describe('API Auth Endpoints', () => {
	baseTest(
		'should return 401 for unauthenticated workspace requests',
		async ({ request }: { request: APIRequestContext }) => {
			// Use the correct oRPC endpoint
			const response = await request.post('/api/rpc/workspaces/list', {
				headers: { 'Content-Type': 'application/json' },
				data: {},
			})
			expect(response.status()).toBe(401)
		},
	)

	baseTest(
		'should return auth error for unauthenticated agent requests',
		async ({ request }: { request: APIRequestContext }) => {
			const response = await request.post('/api/rpc/agents/list', {
				headers: { 'Content-Type': 'application/json' },
				data: {},
			})
			// Accept either 401 (Unauthorized) or 403 (Forbidden) as valid auth errors
			expect([401, 403]).toContain(response.status())
		},
	)

	baseTest(
		'should return auth error for unauthenticated tool requests',
		async ({ request }: { request: APIRequestContext }) => {
			const response = await request.post('/api/rpc/tools/list', {
				headers: { 'Content-Type': 'application/json' },
				data: {},
			})
			// Accept either 401 (Unauthorized) or 403 (Forbidden) as valid auth errors
			expect([401, 403]).toContain(response.status())
		},
	)

	baseTest('auth providers endpoint should be accessible', async ({ request }) => {
		const response = await request.get('/api/auth/providers')
		expect(response.ok()).toBeTruthy()
	})
})
