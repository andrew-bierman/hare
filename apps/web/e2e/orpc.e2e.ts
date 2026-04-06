import { type APIRequestContext, expect, test } from '@playwright/test'

/**
 * API Endpoints - Tests for the Elysia API at /api/*
 *
 * Auth & Workspace Context Flow:
 * 1. Unauthenticated requests → 401 "Authentication required"
 * 2. Authenticated but missing workspace → 403 "Workspace access required"
 * 3. Authenticated + X-Workspace-Id header → Success (if user has workspace access)
 */

test.describe('API Endpoints - Unauthenticated', () => {
	test('workspaces rejects unauthenticated requests', async ({
		request,
	}: {
		request: APIRequestContext
	}) => {
		const response = await request.get('/api/workspaces')

		// Should return 401 or 403
		expect([401, 403]).toContain(response.status())
	})

	test('agents rejects unauthenticated requests', async ({
		request,
	}: {
		request: APIRequestContext
	}) => {
		const response = await request.get('/api/agents')

		expect([401, 403]).toContain(response.status())
	})

	test('tools rejects unauthenticated requests', async ({
		request,
	}: {
		request: APIRequestContext
	}) => {
		const response = await request.get('/api/tools')

		expect([401, 403]).toContain(response.status())
	})
})

test.describe('API Error Responses', () => {
	test('invalid endpoint returns 404', async ({ request }: { request: APIRequestContext }) => {
		const response = await request.get('/api/nonexistent/endpoint')

		expect([403, 404]).toContain(response.status())
	})
})
