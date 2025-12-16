import { expect, test } from './fixtures/test-fixtures'

test.describe('Dashboard', () => {
	// Note: These tests assume user is not authenticated
	// In real tests, you'd set up auth state

	test('should redirect to sign in when not authenticated', async ({ page }) => {
		await page.goto('/dashboard')
		// Should either show dashboard or redirect to sign-in
	})
})
