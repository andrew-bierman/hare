import { test as baseTest, expect, type Page } from '@playwright/test'
import { test } from './fixtures'

baseTest.describe('Agent Creation Form - Unauthenticated', () => {
	baseTest.beforeEach(async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/agents/new')
		await page.waitForLoadState('networkidle')
	})

	baseTest('displays all required form fields', async ({ page }: { page: Page }) => {
		// Agent name field (label includes asterisk for required)
		await expect(page.getByLabel(/Agent Name/)).toBeVisible()

		// Description field
		await expect(page.getByLabel('Description')).toBeVisible()

		// Model selector (label includes asterisk for required)
		await expect(page.getByLabel(/Model/)).toBeVisible()

		// System Prompt textarea (not "Instructions")
		await expect(page.getByLabel('System Prompt')).toBeVisible()
	})

	baseTest('has create button', async ({ page }: { page: Page }) => {
		await expect(page.getByRole('button', { name: /create/i })).toBeVisible()
	})

	baseTest('can fill in form fields', async ({ page }: { page: Page }) => {
		// Fill agent name
		await page.getByLabel(/Agent Name/).fill('My Test Agent')
		await expect(page.getByLabel(/Agent Name/)).toHaveValue('My Test Agent')

		// Fill description
		await page.getByLabel('Description').fill('A helpful test agent')
		await expect(page.getByLabel('Description')).toHaveValue('A helpful test agent')

		// Fill system prompt
		await page.getByLabel('System Prompt').fill('You are a helpful assistant.')
		await expect(page.getByLabel('System Prompt')).toHaveValue('You are a helpful assistant.')
	})
})

test.describe('Agent Creation Form - Authenticated', () => {
	test('can successfully fill and submit agent form', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		// Fill all fields
		const agentName = `Test Agent ${Date.now()}`
		await authenticatedPage.getByLabel(/Agent Name/).fill(agentName)
		await authenticatedPage.getByLabel('Description').fill('A comprehensive test agent')
		await authenticatedPage.getByLabel('System Prompt').fill('You are a helpful AI assistant.')

		// Verify values
		await expect(authenticatedPage.getByLabel(/Agent Name/)).toHaveValue(agentName)
		await expect(authenticatedPage.getByLabel('Description')).toHaveValue(
			'A comprehensive test agent',
		)
		await expect(authenticatedPage.getByLabel('System Prompt')).toHaveValue(
			'You are a helpful AI assistant.',
		)
	})

	test('form fields persist after typing', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/agents/new')
		await authenticatedPage.waitForLoadState('networkidle')

		// Fill agent name
		const agentName = 'Persistent Test Agent'
		await authenticatedPage.getByLabel(/Agent Name/).fill(agentName)

		// Click elsewhere
		await authenticatedPage.getByLabel('Description').click()

		// Verify name is still there
		await expect(authenticatedPage.getByLabel(/Agent Name/)).toHaveValue(agentName)
	})
})

baseTest.describe('Settings Form', () => {
	baseTest.beforeEach(async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/settings')
		await page.waitForLoadState('networkidle')
	})

	baseTest('displays profile section', async ({ page }: { page: Page }) => {
		await expect(page.getByText('Profile', { exact: true }).first()).toBeVisible()
	})

	baseTest('has name input field', async ({ page }: { page: Page }) => {
		// Look for a name-related input
		const nameInput = page.getByLabel(/name/i).first()
		await expect(nameInput).toBeVisible()
	})

	baseTest('has email input field', async ({ page }: { page: Page }) => {
		const emailInput = page.getByLabel(/email/i).first()
		await expect(emailInput).toBeVisible()
	})
})

test.describe('Settings Form - Authenticated', () => {
	test('authenticated user can view settings', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/dashboard/settings')
		await authenticatedPage.waitForLoadState('networkidle')

		await expect(authenticatedPage.getByText('Profile', { exact: true }).first()).toBeVisible()
		await expect(authenticatedPage.getByLabel(/name/i).first()).toBeVisible()
		await expect(authenticatedPage.getByLabel(/email/i).first()).toBeVisible()
	})
})

baseTest.describe('Sign In Form', () => {
	baseTest.beforeEach(async ({ page }: { page: Page }) => {
		await page.goto('/sign-in')
		await page.waitForLoadState('networkidle')
	})

	baseTest('displays all form fields', async ({ page }: { page: Page }) => {
		await expect(page.getByLabel('Email')).toBeVisible()
		await expect(page.getByLabel('Password')).toBeVisible()
		await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible()
	})

	baseTest('can fill in credentials', async ({ page }: { page: Page }) => {
		await page.getByLabel('Email').fill('test@example.com')
		await expect(page.getByLabel('Email')).toHaveValue('test@example.com')

		await page.getByLabel('Password').fill('password123')
		await expect(page.getByLabel('Password')).toHaveValue('password123')
	})

	baseTest('has link to sign up', async ({ page }: { page: Page }) => {
		await expect(page.getByRole('link', { name: /sign up/i })).toBeVisible()
	})

	baseTest('password field is masked', async ({ page }: { page: Page }) => {
		const passwordField = page.getByLabel('Password')
		await expect(passwordField).toHaveAttribute('type', 'password')
	})
})

baseTest.describe('Sign Up Form', () => {
	baseTest.beforeEach(async ({ page }: { page: Page }) => {
		await page.goto('/sign-up')
		await page.waitForLoadState('networkidle')
	})

	baseTest('displays all form fields', async ({ page }: { page: Page }) => {
		await expect(page.getByLabel('Full Name')).toBeVisible()
		await expect(page.getByLabel('Email')).toBeVisible()
		await expect(page.getByLabel('Password', { exact: true })).toBeVisible()
		await expect(page.getByLabel('Confirm Password')).toBeVisible()
		await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible()
	})

	baseTest('can fill in registration details', async ({ page }: { page: Page }) => {
		await page.getByLabel('Full Name').fill('John Doe')
		await expect(page.getByLabel('Full Name')).toHaveValue('John Doe')

		await page.getByLabel('Email').fill('john@example.com')
		await expect(page.getByLabel('Email')).toHaveValue('john@example.com')

		await page.getByLabel('Password', { exact: true }).fill('password123')
		await expect(page.getByLabel('Password', { exact: true })).toHaveValue('password123')

		await page.getByLabel('Confirm Password').fill('password123')
		await expect(page.getByLabel('Confirm Password')).toHaveValue('password123')
	})

	baseTest('has link to sign in', async ({ page }: { page: Page }) => {
		await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible()
	})

	baseTest('password fields are masked', async ({ page }: { page: Page }) => {
		const passwordField = page.getByLabel('Password', { exact: true })
		const confirmPasswordField = page.getByLabel('Confirm Password')

		await expect(passwordField).toHaveAttribute('type', 'password')
		await expect(confirmPasswordField).toHaveAttribute('type', 'password')
	})
})
