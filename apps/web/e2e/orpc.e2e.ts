import { type APIRequestContext, expect, test } from '@playwright/test'

/**
 * oRPC API Endpoints - Tests for the oRPC endpoints at /api/rpc/*
 *
 * Auth & Workspace Context Flow:
 * 1. Unauthenticated requests → 401 "Authentication required"
 * 2. Authenticated but missing workspace → 403 "Workspace access required"
 * 3. Authenticated + X-Workspace-Id header → Success (if user has workspace access)
 *
 * The X-Workspace-Id header is set automatically by the oRPC client via
 * setOrpcWorkspaceId() which is called by WorkspaceProvider.
 */

test.describe('oRPC Endpoints - Unauthenticated', () => {
	test('workspaces.list rejects unauthenticated requests', async ({
		request,
	}: {
		request: APIRequestContext
	}) => {
		const response = await request.post('/api/rpc/workspaces/list', {
			headers: { 'Content-Type': 'application/json' },
			data: {},
		})

		// Should return 401 or 403 (CSRF protection may trigger before auth check)
		expect([401, 403]).toContain(response.status())
	})

	test('agents.list rejects unauthenticated requests', async ({
		request,
	}: {
		request: APIRequestContext
	}) => {
		const response = await request.post('/api/rpc/agents/list', {
			headers: { 'Content-Type': 'application/json' },
			data: {},
		})

		expect([401, 403]).toContain(response.status())
	})

	test('tools.list rejects unauthenticated requests', async ({
		request,
	}: {
		request: APIRequestContext
	}) => {
		const response = await request.post('/api/rpc/tools/list', {
			headers: { 'Content-Type': 'application/json' },
			data: {},
		})

		expect([401, 403]).toContain(response.status())
	})
})

test.describe('oRPC Error Responses', () => {
	test('invalid endpoint returns 403 or 404', async ({
		request,
	}: {
		request: APIRequestContext
	}) => {
		const response = await request.post('/api/rpc/nonexistent/endpoint', {
			headers: { 'Content-Type': 'application/json' },
			data: {},
		})

		// CSRF protection may return 403 before route matching returns 404
		expect([403, 404]).toContain(response.status())
	})
})
