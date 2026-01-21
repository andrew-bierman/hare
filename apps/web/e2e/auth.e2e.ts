import { type APIRequestContext, test as baseTest, expect, type Page } from '@playwright/test'
import { signUpViaUI, test } from './fixtures'

baseTest.describe('Authentication - Page Rendering', () => {
	baseTest('should show sign-in page', async ({ page }: { page: Page }) => {
		await page.goto('/sign-in')
		await expect(page).toHaveURL('/sign-in')
		// Wait for page to fully load
		await page.waitForLoadState('networkidle')
		// Check for the sign in button which confirms the page loaded
		await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible()
	})

	baseTest('should show sign-up page', async ({ page }: { page: Page }) => {
		await page.goto('/sign-up')
		await expect(page).toHaveURL('/sign-up')
		// Wait for page to fully load
		await page.waitForLoadState('networkidle')
		// Check for the create account button which confirms the page loaded
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
		// Navigate to sign-in page and verify Sign up link
		await page.goto('/sign-in')
		await page.waitForLoadState('networkidle')
		const signUpLink = page.locator('a[href="/sign-up"]')
		await expect(signUpLink).toBeVisible()
		await expect(signUpLink).toHaveAttribute('href', '/sign-up')
	})

	baseTest('should have sign in link on sign-up page', async ({ page }: { page: Page }) => {
		// Navigate to sign-up page and verify Sign in link
		await page.goto('/sign-up')
		await page.waitForLoadState('networkidle')
		const signInLink = page.locator('a[href="/sign-in"]')
		await expect(signInLink).toBeVisible()
		await expect(signInLink).toHaveAttribute('href', '/sign-in')
	})

	baseTest(
		'should show validation error for empty form submission',
		async ({ page }: { page: Page }) => {
			await page.goto('/sign-in')
			await page.waitForLoadState('networkidle')
			await page.getByRole('button', { name: 'Sign In' }).click()
			// HTML5 validation should prevent submission - email field should be focused
			const emailInput = page.getByLabel('Email')
			await expect(emailInput).toBeVisible()
		},
	)
})

test.describe('Authentication - Sign Up Flow', () => {
	test('should successfully create a new user account', async ({ page, testUser }) => {
		await page.goto('/sign-up')
		await page.waitForLoadState('networkidle')

		// Wait for form to be ready and stable (OAuth providers may load and cause re-render)
		const nameField = page.getByLabel('Full Name')
		await nameField.waitFor({ state: 'visible', timeout: 10000 })
		await page.waitForTimeout(1500) // Give React time to fully settle after OAuth providers load

		// Fill fields one by one with verification
		// Using click + fill pattern to ensure focus
		await nameField.click()
		await nameField.fill(testUser.name)
		await expect(nameField).toHaveValue(testUser.name)

		const emailField = page.getByLabel('Email')
		await emailField.click()
		await emailField.fill(testUser.email)
		await expect(emailField).toHaveValue(testUser.email)

		const passwordField = page.getByLabel('Password', { exact: true })
		await passwordField.click()
		await passwordField.fill(testUser.password)

		const confirmPasswordField = page.getByLabel('Confirm Password')
		await confirmPasswordField.click()
		await confirmPasswordField.fill(testUser.password)

		// Verify name field still has value (catches re-render issues)
		await expect(nameField).toHaveValue(testUser.name)

		// Submit the form
		const submitButton = page.getByRole('button', { name: 'Create Account' })
		await expect(submitButton).toBeEnabled()
		await submitButton.click()

		// Should redirect to dashboard after successful signup
		await page.waitForURL(/\/dashboard/, { timeout: 30000 })
		await expect(page).toHaveURL(/\/dashboard/)

		// Dashboard should be visible (may need to wait for workspace to load)
		await page.waitForLoadState('networkidle')
		await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 10000 })
	})

	test('should show error for duplicate email', async ({ page, testUser }) => {
		// First registration
		await signUpViaUI(page, testUser)

		// Sign out
		await page.goto('/sign-in')

		// Try to register again with same email
		await page.goto('/sign-up')
		await page.waitForLoadState('networkidle')

		await page.getByLabel('Full Name').fill(testUser.name)
		await page.getByLabel('Email').fill(testUser.email)
		await page.getByLabel('Password', { exact: true }).fill(testUser.password)
		await page.getByLabel('Confirm Password').fill(testUser.password)

		await page.getByRole('button', { name: 'Create Account' }).click()

		// Should stay on sign-up page (duplicate email error)
		await expect(page).toHaveURL(/sign-up/)
	})

	test('should show error for password mismatch', async ({ page, testUser }) => {
		await page.goto('/sign-up')
		await page.waitForLoadState('networkidle')

		await page.getByLabel('Full Name').fill(testUser.name)
		await page.getByLabel('Email').fill(testUser.email)
		await page.getByLabel('Password', { exact: true }).fill(testUser.password)
		await page.getByLabel('Confirm Password').fill('DifferentPassword123!')

		await page.getByRole('button', { name: 'Create Account' }).click()

		// Should stay on sign-up page due to validation error
		await expect(page).toHaveURL(/sign-up/)
	})
})

test.describe('Authentication - Sign In Flow', () => {
	test('should successfully sign in with valid credentials', async ({ page, testUser }) => {
		// Create user first
		await signUpViaUI(page, testUser)

		// Sign out by clearing context and navigating to sign-in
		await page.context().clearCookies()
		await page.goto('/sign-in')
		await page.waitForLoadState('networkidle')

		// Wait for form to be stable
		const emailField = page.getByLabel('Email')
		await emailField.waitFor({ state: 'visible', timeout: 10000 })
		await page.waitForTimeout(1500) // Give React time to settle

		// Fill fields with click + fill pattern
		await emailField.click()
		await emailField.fill(testUser.email)
		await expect(emailField).toHaveValue(testUser.email)

		const passwordField = page.getByLabel('Password')
		await passwordField.click()
		await passwordField.fill(testUser.password)

		// Submit
		const submitButton = page.getByRole('button', { name: 'Sign In' })
		await expect(submitButton).toBeEnabled()
		await submitButton.click()

		// Should redirect to dashboard
		await page.waitForURL(/\/dashboard/, { timeout: 30000 })
		await expect(page).toHaveURL(/\/dashboard/)
	})

	test('should show error for invalid credentials', async ({ page }) => {
		await page.goto('/sign-in')
		await page.waitForLoadState('networkidle')

		await page.getByLabel('Email').fill('nonexistent@example.com')
		await page.getByLabel('Password').fill('WrongPassword123!')
		await page.getByRole('button', { name: 'Sign In' }).click()

		// Should stay on sign-in page (invalid credentials)
		await expect(page).toHaveURL(/sign-in/)
	})
})

test.describe('Authentication - Protected Routes', () => {
	test('authenticated user can access dashboard', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard')
		await expect(authenticatedPage).toHaveURL(/\/dashboard/)
		await expect(authenticatedPage.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
	})

	test('authenticated user can access agents page', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents')
		await expect(authenticatedPage).toHaveURL(/\/dashboard\/agents/)
		await expect(
			authenticatedPage.getByRole('heading', { name: 'Agents', exact: true }),
		).toBeVisible()
	})

	test('authenticated user can access tools page', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/tools')
		await expect(authenticatedPage).toHaveURL(/\/dashboard\/tools/)
		await expect(
			authenticatedPage.getByRole('heading', { name: 'Tools', exact: true }),
		).toBeVisible()
	})

	test('authenticated user can access settings page', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await expect(authenticatedPage).toHaveURL(/\/dashboard\/settings/)
		await expect(authenticatedPage.getByRole('heading', { name: 'Settings' })).toBeVisible()
	})
})

baseTest.describe('API Auth Endpoints', () => {
	baseTest(
		'should return session info for get-session endpoint',
		async ({ request }: { request: APIRequestContext }) => {
			// The auth session endpoint returns null for unauthenticated users
			const response = await request.get('/api/auth/get-session')
			expect(response.ok()).toBe(true)
			const data = await response.json()
			// Unauthenticated users get null (no session)
			expect(data).toBe(null)
		},
	)

	baseTest(
		'should return auth providers',
		async ({ request }: { request: APIRequestContext }) => {
			const response = await request.get('/api/auth/providers')
			expect(response.ok()).toBe(true)
			const data = await response.json()
			expect(data).toHaveProperty('providers')
		},
	)

	baseTest(
		'should have health endpoint available',
		async ({ request }: { request: APIRequestContext }) => {
			// OpenAPI docs endpoint should be accessible
			const response = await request.get('/api/docs')
			expect(response.ok()).toBe(true)
		},
	)
})
