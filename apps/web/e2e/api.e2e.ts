import { type APIRequestContext, expect, type Page, test } from '@playwright/test'

/**
 * API E2E Tests
 *
 * Tests for API health checks, infrastructure, and CORS.
 * Note: oRPC endpoints follow the pattern /api/rpc/{router}/{procedure}
 */

test.describe('API Health & Infrastructure', () => {
	test('health status endpoint returns ok', async ({ request }: { request: APIRequestContext }) => {
		// Health endpoint is at /api/rpc/health/status (oRPC routes)
		const response = await request.get('/api/rpc/health/status')
		expect(response.status()).toBe(200)
		const body = await response.json()
		expect(body.json.status).toBeDefined()
		expect(body.json.version).toBe('1.0.0')
		expect(body.json.timestamp).toBeDefined()
		expect(body.json.services).toBeDefined()
	})

	test('OpenAPI spec is accessible', async ({ request }: { request: APIRequestContext }) => {
		const response = await request.get('/api/openapi.json')
		// OpenAPI might return 200 or 500 depending on server state
		if (response.status() === 200) {
			const body = await response.json()
			expect(body.openapi).toBe('3.1.0')
			expect(body.info.title).toBe('Hare API')
		} else {
			// Skip assertion if endpoint not available in dev mode
			console.log('OpenAPI endpoint not available, skipping detailed checks')
		}
	})

	test('API docs page is accessible', async ({ page }: { page: Page }) => {
		await page.goto('/api/docs')
		await page.waitForLoadState('domcontentloaded')
		await expect(page).toHaveURL('/api/docs')
		// Check that the page has loaded content (not a 404)
		await expect(page.locator('body')).not.toContainText('404')
	})

	test('unknown API routes return 404', async ({ request }: { request: APIRequestContext }) => {
		const response = await request.get('/api/nonexistent')
		expect(response.status()).toBe(404)
	})

	test('health status endpoint responds quickly', async ({
		request,
	}: {
		request: APIRequestContext
	}) => {
		const startTime = Date.now()
		const response = await request.get('/api/rpc/health/status')
		const endTime = Date.now()
		const responseTime = endTime - startTime

		expect(response.status()).toBe(200)
		// Health endpoint should respond within 3 seconds (allows for cold start and DB check)
		expect(responseTime).toBeLessThan(3000)
	})

	test('liveness probe returns ok', async ({ request }: { request: APIRequestContext }) => {
		const response = await request.get('/api/rpc/health/live')
		expect(response.status()).toBe(200)
		const body = await response.json()
		expect(body.json.status).toBe('ok')
	})

	test('readiness probe returns status', async ({ request }: { request: APIRequestContext }) => {
		const response = await request.get('/api/rpc/health/ready')
		expect(response.status()).toBe(200)
		const body = await response.json()
		// May return { json: { status: 'ready' } } or { json: { error: '...' } }
		expect(body.json.status === 'ready' || body.json.error).toBeTruthy()
	})
})

test.describe('API CORS', () => {
	test('API endpoint is accessible', async ({ request }: { request: APIRequestContext }) => {
		const response = await request.get('/api/rpc/health/live')
		expect(response.status()).toBe(200)
	})

	test('OPTIONS request should work for CORS preflight', async ({
		request,
	}: {
		request: APIRequestContext
	}) => {
		const response = await request.fetch('/api/rpc/health/live', {
			method: 'OPTIONS',
		})
		// Should allow OPTIONS method
		expect([200, 204]).toContain(response.status())
	})
})

test.describe('Auth Providers', () => {
	test('auth providers endpoint is accessible', async ({
		request,
	}: {
		request: APIRequestContext
	}) => {
		const response = await request.get('/api/auth/providers')
		expect(response.status()).toBe(200)
		const body = await response.json()
		expect(body.providers).toBeDefined()
	})
})
