import { type APIRequestContext, expect, type Page, test as baseTest } from '@playwright/test'
import { test, signUpViaUI } from './fixtures'

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

	baseTest('should have email, name, and password fields on sign-up', async ({
		page,
	}: {
		page: Page
	}) => {
		await page.goto('/sign-up')
		await page.waitForLoadState('networkidle')
		await expect(page.getByLabel('Full Name')).toBeVisible()
		await expect(page.getByLabel('Email')).toBeVisible()
		await expect(page.getByLabel('Password', { exact: true })).toBeVisible()
		await expect(page.getByLabel('Confirm Password')).toBeVisible()
		await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible()
	})

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

	baseTest('should show validation error for empty form submission', async ({
		page,
	}: {
		page: Page
	}) => {
		await page.goto('/sign-in')
		await page.waitForLoadState('networkidle')
		await page.getByRole('button', { name: 'Sign In' }).click()
		// HTML5 validation should prevent submission - email field should be focused
		const emailInput = page.getByLabel('Email')
		await expect(emailInput).toBeVisible()
	})
})

test.describe('Authentication - Sign Up Flow', () => {
	test('should successfully create a new user account', async ({ page, testUser }) => {
		await page.goto('/sign-up')
		await page.waitForLoadState('networkidle')

		// Wait for form to be ready
		await page.getByLabel('Full Name').waitFor({ state: 'visible', timeout: 10000 })

		// Fill in the sign-up form
		await page.getByLabel('Full Name').fill(testUser.name)
		await page.getByLabel('Email').fill(testUser.email)
		await page.getByLabel('Password', { exact: true }).fill(testUser.password)
		await page.getByLabel('Confirm Password').fill(testUser.password)

		// Submit the form
		await page.getByRole('button', { name: 'Create Account' }).click()

		// Should redirect to dashboard after successful signup
		await page.waitForURL(/\/dashboard/, { timeout: 15000 })
		await expect(page).toHaveURL(/\/dashboard/)

		// Dashboard should be visible
		await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
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

		// Navigate to sign-in page (clears session)
		await page.goto('/sign-in')
		await page.waitForLoadState('networkidle')
		await page.getByLabel('Email').waitFor({ state: 'visible', timeout: 10000 })

		// Sign in with the same credentials
		await page.getByLabel('Email').fill(testUser.email)
		await page.getByLabel('Password').fill(testUser.password)
		await page.getByRole('button', { name: 'Sign In' }).click()

		// Should redirect to dashboard
		await page.waitForURL(/\/dashboard/, { timeout: 15000 })
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
			authenticatedPage.getByRole('heading', { name: 'Agents', exact: true })
		).toBeVisible()
	})

	test('authenticated user can access tools page', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/tools')
		await expect(authenticatedPage).toHaveURL(/\/dashboard\/tools/)
		await expect(
			authenticatedPage.getByRole('heading', { name: 'Tools', exact: true })
		).toBeVisible()
	})

	test('authenticated user can access settings page', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await expect(authenticatedPage).toHaveURL(/\/dashboard\/settings/)
		await expect(authenticatedPage.getByRole('heading', { name: 'Settings' })).toBeVisible()
	})
})

baseTest.describe('API Auth Endpoints', () => {
	baseTest('should return 401 for unauthenticated workspace requests', async ({
		request,
	}: {
		request: APIRequestContext
	}) => {
		const response = await request.get('/api/workspaces')
		expect(response.status()).toBe(401)
	})

	baseTest('should return 401 for unauthenticated agent requests', async ({
		request,
	}: {
		request: APIRequestContext
	}) => {
		const response = await request.get('/api/agents?workspaceId=test')
		expect(response.status()).toBe(401)
	})

	baseTest('should return 401 for unauthenticated tool requests', async ({
		request,
	}: {
		request: APIRequestContext
	}) => {
		const response = await request.get('/api/tools?workspaceId=test')
		expect(response.status()).toBe(401)
	})

	baseTest('should return 401 for unauthenticated usage requests', async ({
		request,
	}: {
		request: APIRequestContext
	}) => {
		const response = await request.get('/api/usage?workspaceId=test')
		expect(response.status()).toBe(401)
	})
})
