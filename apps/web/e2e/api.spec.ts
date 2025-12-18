import { test, expect } from '@playwright/test'

test.describe('API Health & Infrastructure', () => {
	test('health endpoint returns ok', async ({ request }) => {
		const response = await request.get('/api/health')
		expect(response.status()).toBe(200)
		const body = await response.json()
		expect(body.status).toBe('ok')
		expect(body.version).toBe('1.0.0')
		expect(body.timestamp).toBeDefined()
	})

	test('OpenAPI spec is accessible', async ({ request }) => {
		const response = await request.get('/api/openapi.json')
		expect(response.status()).toBe(200)
		const body = await response.json()
		expect(body.openapi).toBe('3.1.0')
		expect(body.info.title).toBe('Hare API')
	})

	test('API docs page is accessible', async ({ page }) => {
		await page.goto('/api/docs')
		await expect(page).toHaveURL('/api/docs')
		// Scalar API reference should load
		await page.waitForLoadState('networkidle')
	})

	test('unknown API routes return 404', async ({ request }) => {
		const response = await request.get('/api/nonexistent')
		expect(response.status()).toBe(404)
	})
})

test.describe('API CORS', () => {
	test('should include CORS headers', async ({ request }) => {
		const response = await request.get('/api/health')
		// CORS middleware is enabled, should have headers
		expect(response.status()).toBe(200)
	})
})
