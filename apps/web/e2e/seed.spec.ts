/**
 * Seed test file for Playwright Test Agents
 *
 * This file demonstrates the testing patterns, fixtures, and conventions
 * used in this project. The Playwright agents use this as context when
 * generating and healing tests.
 *
 * Key patterns:
 * - Use fixtures from './fixtures' for authentication and test users
 * - Tests use sequential execution (workers: 1) due to SQLite database
 * - All tests use the Chromium project defined in playwright.config.ts
 */

import { expect, test } from './fixtures'

test.describe('Environment Seed', () => {
	/**
	 * Basic page test - demonstrates navigation and assertions
	 */
	test('seed - can navigate to landing page', async ({ page }) => {
		await page.goto('/')
		await expect(page).toHaveTitle(/Hare/)
	})

	/**
	 * Authenticated test - demonstrates using the authenticatedPage fixture
	 * The fixture automatically creates a user, signs them in, and navigates to dashboard
	 */
	test('seed - authenticated user can access dashboard', async ({ authenticatedPage }) => {
		// authenticatedPage fixture already signed in and navigated to /dashboard
		await expect(authenticatedPage).toHaveURL(/\/dashboard/)

		// Verify dashboard elements are visible
		const dashboardHeading = authenticatedPage.getByRole('heading', { name: 'Dashboard' })
		await expect(dashboardHeading).toBeVisible()
	})

	/**
	 * API test - demonstrates testing API endpoints
	 */
	test('seed - health check endpoint works', async ({ request }) => {
		const response = await request.get('/api/health/live')
		expect(response.ok()).toBeTruthy()
	})
})
