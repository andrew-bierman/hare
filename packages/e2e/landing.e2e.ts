import { expect, test } from './fixtures/test-fixtures'

test.describe('Landing Page', () => {
	test('should display hero section', async ({ page }) => {
		await page.goto('/')
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
		await expect(page.getByText(/Build.*Deploy/i)).toBeVisible()
	})

	test('should navigate to sign up', async ({ page }) => {
		await page.goto('/')
		await page.getByRole('link', { name: /get started/i }).click()
		await expect(page).toHaveURL('/sign-up')
	})

	test('should navigate to sign in', async ({ page }) => {
		await page.goto('/')
		await page.getByRole('link', { name: /sign in/i }).click()
		await expect(page).toHaveURL('/sign-in')
	})
})
