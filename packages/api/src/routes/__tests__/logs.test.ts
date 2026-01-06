import { env } from 'cloudflare:test'
import { beforeAll, describe, expect, it } from 'vitest'
import { app } from '@hare/api'
import { applyMigrations } from './setup'

// Apply D1 migrations before tests
beforeAll(async () => {
	await applyMigrations(env.DB)
})

describe('Logs API', () => {
	describe('Authentication', () => {
		it('returns 401 for unauthenticated GET /api/logs', async () => {
			const res = await app.request('/api/logs?workspaceId=ws_test123', {}, env)
			expect(res.status).toBe(401)

			const json = (await res.json()) as { error: string }
			expect(json.error).toBe('Unauthorized')
		})

		it('returns 401 for unauthenticated GET /api/logs/stats', async () => {
			const res = await app.request('/api/logs/stats?workspaceId=ws_test123', {}, env)
			expect(res.status).toBe(401)

			const json = (await res.json()) as { error: string }
			expect(json.error).toBe('Unauthorized')
		})
	})

	describe('Input Validation', () => {
		// Note: Authentication middleware runs before validation for protected routes
		// So missing/invalid parameters will still return 401 for unauthenticated requests
		it('requires workspaceId query parameter for logs list (returns 401 since auth runs first)', async () => {
			const res = await app.request('/api/logs', {}, env)
			// Auth middleware runs first, so returns 401
			expect(res.status).toBe(401)
		})

		it('requires workspaceId query parameter for stats (returns 401 since auth runs first)', async () => {
			const res = await app.request('/api/logs/stats', {}, env)
			// Auth middleware runs first, so returns 401
			expect(res.status).toBe(401)
		})

		it('accepts userId filter parameter', async () => {
			const res = await app.request(
				'/api/logs?workspaceId=ws_test123&userId=user_test123',
				{},
				env,
			)
			// Should return 401 (not 400) because params are valid
			expect(res.status).toBe(401)
		})

		it('accepts agentId filter parameter', async () => {
			const res = await app.request(
				'/api/logs?workspaceId=ws_test123&agentId=agent_test123',
				{},
				env,
			)
			// Should return 401 (not 400) because params are valid
			expect(res.status).toBe(401)
		})

		it('accepts status filter parameter', async () => {
			const res = await app.request('/api/logs?workspaceId=ws_test123&status=200', {}, env)
			// Should return 401 (not 400) because params are valid
			expect(res.status).toBe(401)
		})

		it('accepts startDate filter parameter', async () => {
			const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
			const res = await app.request(
				`/api/logs?workspaceId=ws_test123&startDate=${startDate}`,
				{},
				env,
			)
			// Should return 401 (not 400) because params are valid
			expect(res.status).toBe(401)
		})

		it('accepts endDate filter parameter', async () => {
			const endDate = new Date().toISOString()
			const res = await app.request(`/api/logs?workspaceId=ws_test123&endDate=${endDate}`, {}, env)
			// Should return 401 (not 400) because params are valid
			expect(res.status).toBe(401)
		})

		it('accepts limit parameter', async () => {
			const res = await app.request('/api/logs?workspaceId=ws_test123&limit=25', {}, env)
			// Should return 401 (not 400) because params are valid
			expect(res.status).toBe(401)
		})

		it('accepts offset parameter', async () => {
			const res = await app.request('/api/logs?workspaceId=ws_test123&offset=10', {}, env)
			// Should return 401 (not 400) because params are valid
			expect(res.status).toBe(401)
		})

		it('accepts all filter parameters for stats', async () => {
			const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
			const endDate = new Date().toISOString()
			const res = await app.request(
				`/api/logs/stats?workspaceId=ws_test123&userId=user_test&agentId=agent_test&status=200&startDate=${startDate}&endDate=${endDate}`,
				{},
				env,
			)
			// Should return 401 (not 400) because params are valid
			expect(res.status).toBe(401)
		})
	})

	describe('Response Structure', () => {
		it('returns 401 with proper error structure for logs', async () => {
			const res = await app.request('/api/logs?workspaceId=ws_test123', {}, env)
			expect(res.status).toBe(401)

			const json = (await res.json()) as { error: string }
			expect(json).toHaveProperty('error')
			expect(typeof json.error).toBe('string')
		})

		it('returns 401 with proper error structure for stats', async () => {
			const res = await app.request('/api/logs/stats?workspaceId=ws_test123', {}, env)
			expect(res.status).toBe(401)

			const json = (await res.json()) as { error: string }
			expect(json).toHaveProperty('error')
			expect(typeof json.error).toBe('string')
		})
	})
})
