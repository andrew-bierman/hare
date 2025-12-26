import { expect, type Page, test } from '@playwright/test'

test.describe('Agent Creation Form', () => {
	test.beforeEach(async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/agents/new')
	})

	test('displays all required form fields', async ({ page }: { page: Page }) => {
		// Agent name field (label includes asterisk for required)
		await expect(page.getByLabel(/Agent Name/)).toBeVisible()

		// Description field
		await expect(page.getByLabel('Description')).toBeVisible()

		// Model selector (label includes asterisk for required)
		await expect(page.getByLabel(/Model/)).toBeVisible()

		// System Prompt textarea (not "Instructions")
		await expect(page.getByLabel('System Prompt')).toBeVisible()
	})

	test('has create button', async ({ page }: { page: Page }) => {
		await expect(page.getByRole('button', { name: /create/i })).toBeVisible()
	})

	test('can fill in form fields', async ({ page }: { page: Page }) => {
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

test.describe('Settings Form', () => {
	test.beforeEach(async ({ page }: { page: Page }) => {
		await page.goto('/dashboard/settings')
		await page.waitForLoadState('networkidle')
		// Wait for skeleton to disappear and content to load
		await page.waitForSelector('h2:has-text("Settings")', { timeout: 10000 })
	})

	test('displays profile section', async ({ page }: { page: Page }) => {
		await expect(page.getByText('Profile', { exact: true }).first()).toBeVisible()
	})

	test('has name input field', async ({ page }: { page: Page }) => {
		// Look for the Name label in the Profile card
		const nameInput = page.getByLabel('Name')
		await expect(nameInput).toBeVisible()
	})

	test('has email input field', async ({ page }: { page: Page }) => {
		const emailInput = page.getByLabel('Email')
		await expect(emailInput).toBeVisible()
	})
})

test.describe('Sign In Form', () => {
	test.beforeEach(async ({ page }: { page: Page }) => {
		await page.goto('/sign-in')
	})

	test('displays all form fields', async ({ page }: { page: Page }) => {
		await expect(page.getByLabel('Email')).toBeVisible()
		await expect(page.getByLabel('Password')).toBeVisible()
		await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible()
	})

	test('can fill in credentials', async ({ page }: { page: Page }) => {
		await page.getByLabel('Email').fill('test@example.com')
		await expect(page.getByLabel('Email')).toHaveValue('test@example.com')

		await page.getByLabel('Password').fill('password123')
		await expect(page.getByLabel('Password')).toHaveValue('password123')
	})

	test('has link to sign up', async ({ page }: { page: Page }) => {
		await expect(page.getByRole('link', { name: /sign up/i })).toBeVisible()
	})
})

test.describe('Sign Up Form', () => {
	test.beforeEach(async ({ page }: { page: Page }) => {
		await page.goto('/sign-up')
	})

	test('displays all form fields', async ({ page }: { page: Page }) => {
		await expect(page.getByLabel('Full Name')).toBeVisible()
		await expect(page.getByLabel('Email')).toBeVisible()
		await expect(page.getByLabel('Password', { exact: true })).toBeVisible()
		await expect(page.getByLabel('Confirm Password')).toBeVisible()
		await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible()
	})

	test('can fill in registration details', async ({ page }: { page: Page }) => {
		await page.getByLabel('Full Name').fill('John Doe')
		await expect(page.getByLabel('Full Name')).toHaveValue('John Doe')

		await page.getByLabel('Email').fill('john@example.com')
		await expect(page.getByLabel('Email')).toHaveValue('john@example.com')

		await page.getByLabel('Password', { exact: true }).fill('password123')
		await expect(page.getByLabel('Password', { exact: true })).toHaveValue('password123')

		await page.getByLabel('Confirm Password').fill('password123')
		await expect(page.getByLabel('Confirm Password')).toHaveValue('password123')
	})

	test('has link to sign in', async ({ page }: { page: Page }) => {
		await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible()
	})
})
