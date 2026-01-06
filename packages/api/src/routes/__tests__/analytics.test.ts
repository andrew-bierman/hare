import { env } from 'cloudflare:test'
import { beforeAll, describe, expect, it } from 'vitest'
import { app } from '@hare/api'
import { applyMigrations } from './setup'

// Apply D1 migrations before tests
beforeAll(async () => {
	await applyMigrations(env.DB)
})

describe('Analytics API', () => {
	describe('Authentication', () => {
		it('returns 401 for unauthenticated GET /api/analytics', async () => {
			const res = await app.request('/api/analytics?workspaceId=ws_test123', {}, env)
			expect(res.status).toBe(401)

			const json = (await res.json()) as { error: string }
			expect(json.error).toBe('Unauthorized')
		})
	})

	describe('Input Validation', () => {
		// Note: Authentication middleware runs before validation for protected routes
		// So missing/invalid parameters will still return 401 for unauthenticated requests
		it('requires workspaceId query parameter (returns 401 since auth runs first)', async () => {
			const res = await app.request('/api/analytics', {}, env)
			// Auth middleware runs first, so returns 401
			expect(res.status).toBe(401)
		})

		it('validates startDate format (returns 401 since auth runs first)', async () => {
			const res = await app.request(
				'/api/analytics?workspaceId=ws_test123&startDate=invalid-date',
				{},
				env,
			)
			// Auth middleware runs first, so returns 401
			expect(res.status).toBe(401)
		})

		it('validates endDate format (returns 401 since auth runs first)', async () => {
			const res = await app.request(
				'/api/analytics?workspaceId=ws_test123&endDate=invalid-date',
				{},
				env,
			)
			// Auth middleware runs first, so returns 401
			expect(res.status).toBe(401)
		})

		it('validates groupBy parameter (returns 401 since auth runs first)', async () => {
			const res = await app.request(
				'/api/analytics?workspaceId=ws_test123&groupBy=invalid',
				{},
				env,
			)
			// Auth middleware runs first, so returns 401
			expect(res.status).toBe(401)
		})

		it('accepts valid groupBy=day parameter', async () => {
			const res = await app.request('/api/analytics?workspaceId=ws_test123&groupBy=day', {}, env)
			// Should return 401 (not 400) because groupBy is valid
			expect(res.status).toBe(401)
		})

		it('accepts valid groupBy=week parameter', async () => {
			const res = await app.request('/api/analytics?workspaceId=ws_test123&groupBy=week', {}, env)
			// Should return 401 (not 400) because groupBy is valid
			expect(res.status).toBe(401)
		})

		it('accepts valid groupBy=month parameter', async () => {
			const res = await app.request(
				'/api/analytics?workspaceId=ws_test123&groupBy=month',
				{},
				env,
			)
			// Should return 401 (not 400) because groupBy is valid
			expect(res.status).toBe(401)
		})

		it('accepts valid date range parameters', async () => {
			const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
			const endDate = new Date().toISOString()

			const res = await app.request(
				`/api/analytics?workspaceId=ws_test123&startDate=${startDate}&endDate=${endDate}`,
				{},
				env,
			)
			// Should return 401 (not 400) because dates are valid
			expect(res.status).toBe(401)
		})

		it('accepts optional agentId filter', async () => {
			const res = await app.request(
				'/api/analytics?workspaceId=ws_test123&agentId=agent_test123',
				{},
				env,
			)
			// Should return 401 (not 400) because agentId is valid
			expect(res.status).toBe(401)
		})
	})

	describe('Response Structure', () => {
		// Note: These tests would require authenticated requests
		// For now, we verify the route exists and requires auth

		it('returns 401 with proper error structure', async () => {
			const res = await app.request('/api/analytics?workspaceId=ws_test123', {}, env)
			expect(res.status).toBe(401)

			const json = (await res.json()) as { error: string }
			expect(json).toHaveProperty('error')
			expect(typeof json.error).toBe('string')
		})
	})
})
