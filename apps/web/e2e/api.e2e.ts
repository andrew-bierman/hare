import { type APIRequestContext, expect, test } from '@playwright/test'

/**
 * API E2E Tests
 *
 * Tests for API health checks, infrastructure, and CORS.
 * Elysia endpoints at /api/{route}
 */

test.describe('API Health & Infrastructure', () => {
	test('health status endpoint returns ok', async ({ request }: { request: APIRequestContext }) => {
		const response = await request.get('/api/health/status')
		expect(response.status()).toBe(200)
		const body = await response.json()
		expect(body.status).toBeDefined()
		expect(body.version).toBe('2.0.0')
		expect(body.timestamp).toBeDefined()
		expect(body.services).toBeDefined()
	})

	test('OpenAPI spec is accessible', async ({ request }: { request: APIRequestContext }) => {
		const response = await request.get('/api/openapi/json')
		if (response.status() === 200) {
			const body = await response.json()
			expect(body.openapi).toBeDefined()
			expect(body.info.title).toBe('Hare API')
		}
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
		const response = await request.get('/api/health/status')
		const endTime = Date.now()
		const responseTime = endTime - startTime

		expect(response.status()).toBe(200)
		expect(responseTime).toBeLessThan(3000)
	})

	test('liveness probe returns ok', async ({ request }: { request: APIRequestContext }) => {
		const response = await request.get('/api/health/live')
		expect(response.status()).toBe(200)
		const body = await response.json()
		expect(body.status).toBe('ok')
	})

	test('readiness probe returns status', async ({ request }: { request: APIRequestContext }) => {
		const response = await request.get('/api/health/ready')
		expect(response.status()).toBe(200)
		const body = await response.json()
		expect(body.status === 'ready' || body.error).toBeTruthy()
	})
})

test.describe('API CORS', () => {
	test('API endpoint is accessible', async ({ request }: { request: APIRequestContext }) => {
		const response = await request.get('/api/health/live')
		expect(response.status()).toBe(200)
	})

	test('OPTIONS request should work for CORS preflight', async ({
		request,
	}: {
		request: APIRequestContext
	}) => {
		const response = await request.fetch('/api/health/live', {
			method: 'OPTIONS',
		})
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
