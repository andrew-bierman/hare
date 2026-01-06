import { type APIRequestContext, expect, test } from '@playwright/test'

/**
 * oRPC API Endpoints - Tests for the oRPC endpoints at /api/rpc/*
 *
 * These tests verify that unauthenticated requests return 401 (not 500).
 * This is the key fix - previously these endpoints would return 500 errors
 * when the user context was missing, now they properly return 401.
 */

test.describe('oRPC Endpoints - Unauthenticated', () => {
	test('workspaces.list returns 401 when not authenticated', async ({
		request,
	}: {
		request: APIRequestContext
	}) => {
		const response = await request.post('/api/rpc/workspaces/list', {
			headers: { 'Content-Type': 'application/json' },
			data: {},
		})

		// Should return 401 Unauthorized, NOT 500 Internal Server Error
		expect(response.status()).toBe(401)

		const body = await response.json()
		// oRPC wraps response in { json: { ... } }
		const message = body.json?.message || body.message || body.error?.message
		expect(message).toContain('Authentication required')
	})

	test('agents.list returns 401 when not authenticated', async ({
		request,
	}: {
		request: APIRequestContext
	}) => {
		const response = await request.post('/api/rpc/agents/list', {
			headers: { 'Content-Type': 'application/json' },
			data: {},
		})

		// Should return 401 Unauthorized, NOT 500 Internal Server Error
		expect(response.status()).toBe(401)

		const body = await response.json()
		const message = body.json?.message || body.message || body.error?.message
		expect(message).toContain('Authentication required')
	})

	test('tools.list returns 401 when not authenticated', async ({
		request,
	}: {
		request: APIRequestContext
	}) => {
		const response = await request.post('/api/rpc/tools/list', {
			headers: { 'Content-Type': 'application/json' },
			data: {},
		})

		// Should return 401 Unauthorized, NOT 500 Internal Server Error
		expect(response.status()).toBe(401)

		const body = await response.json()
		const message = body.json?.message || body.message || body.error?.message
		expect(message).toContain('Authentication required')
	})
})

test.describe('oRPC Error Responses', () => {
	test('invalid endpoint returns 404', async ({ request }: { request: APIRequestContext }) => {
		const response = await request.post('/api/rpc/nonexistent/endpoint', {
			headers: { 'Content-Type': 'application/json' },
			data: {},
		})

		// Should return 404 Not Found
		expect(response.status()).toBe(404)
	})
})
