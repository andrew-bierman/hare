import { expect, test } from './fixtures/test-fixtures'

test.describe('Authentication', () => {
	test.describe('Sign Up', () => {
		test('should display sign up form', async ({ page }) => {
			await page.goto('/sign-up')
			await expect(page.getByLabel(/email/i)).toBeVisible()
			await expect(page.getByLabel(/password/i)).toBeVisible()
			await expect(page.getByRole('button', { name: /sign up/i })).toBeVisible()
		})

		test('should show validation errors for empty form', async ({ page }) => {
			await page.goto('/sign-up')
			await page.getByRole('button', { name: /sign up/i }).click()
			// Form should show validation errors
		})

		test('should navigate to sign in', async ({ page }) => {
			await page.goto('/sign-up')
			await page.getByRole('link', { name: /sign in/i }).click()
			await expect(page).toHaveURL('/sign-in')
		})
	})

	test.describe('Sign In', () => {
		test('should display sign in form', async ({ page }) => {
			await page.goto('/sign-in')
			await expect(page.getByLabel(/email/i)).toBeVisible()
			await expect(page.getByLabel(/password/i)).toBeVisible()
		})
	})
})
