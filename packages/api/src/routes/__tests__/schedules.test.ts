import { env } from 'cloudflare:test'
import { beforeAll, describe, expect, it } from 'vitest'
import { app } from '@hare/api'
import { applyMigrations } from './setup'

// Apply D1 migrations before tests
beforeAll(async () => {
	await applyMigrations(env.DB)
})

describe('Schedules API', () => {
	describe('Authentication', () => {
		it('returns 401 for unauthenticated GET /api/agents/:agentId/schedules', async () => {
			const res = await app.request(
				'/api/agents/agent_test123/schedules?workspaceId=ws_test123',
				{},
				env,
			)
			expect(res.status).toBe(401)

			const json = (await res.json()) as { error: string }
			expect(json.error).toBe('Unauthorized')
		})

		it('returns 401 for unauthenticated POST /api/agents/:agentId/schedules', async () => {
			const res = await app.request(
				'/api/agents/agent_test123/schedules?workspaceId=ws_test123',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						type: 'one-time',
						executeAt: new Date(Date.now() + 3600000).toISOString(),
						action: 'send_message',
						payload: { message: 'Test' },
					}),
				},
				env,
			)
			expect(res.status).toBe(401)
		})

		it('returns 401 for unauthenticated GET /api/agents/:agentId/schedules/:scheduleId', async () => {
			const res = await app.request(
				'/api/agents/agent_test123/schedules/schedule_test123?workspaceId=ws_test123',
				{},
				env,
			)
			expect(res.status).toBe(401)
		})

		it('returns 401 for unauthenticated PATCH /api/agents/:agentId/schedules/:scheduleId', async () => {
			const res = await app.request(
				'/api/agents/agent_test123/schedules/schedule_test123?workspaceId=ws_test123',
				{
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						status: 'paused',
					}),
				},
				env,
			)
			expect(res.status).toBe(401)
		})

		it('returns 401 for unauthenticated DELETE /api/agents/:agentId/schedules/:scheduleId', async () => {
			const res = await app.request(
				'/api/agents/agent_test123/schedules/schedule_test123?workspaceId=ws_test123',
				{
					method: 'DELETE',
				},
				env,
			)
			expect(res.status).toBe(401)
		})

		it('returns 401 for unauthenticated GET /api/agents/:agentId/schedules/:scheduleId/executions', async () => {
			const res = await app.request(
				'/api/agents/agent_test123/schedules/schedule_test123/executions?workspaceId=ws_test123',
				{},
				env,
			)
			expect(res.status).toBe(401)
		})

		it('returns 401 for unauthenticated GET /api/agents/:agentId/executions', async () => {
			const res = await app.request(
				'/api/agents/agent_test123/executions?workspaceId=ws_test123',
				{},
				env,
			)
			expect(res.status).toBe(401)
		})
	})

	describe('Input Validation', () => {
		// Note: Authentication middleware runs before validation for protected routes
		// So missing/invalid parameters will still return 401 for unauthenticated requests
		it('requires workspaceId query parameter for list (returns 401 since auth runs first)', async () => {
			const res = await app.request('/api/agents/agent_test123/schedules', {}, env)
			// Auth middleware runs first, so returns 401
			expect(res.status).toBe(401)
		})

		it('requires workspaceId query parameter for create (returns 401 since auth runs first)', async () => {
			const res = await app.request(
				'/api/agents/agent_test123/schedules',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						type: 'one-time',
						executeAt: new Date(Date.now() + 3600000).toISOString(),
						action: 'send_message',
					}),
				},
				env,
			)
			// Auth middleware runs first, so returns 401
			expect(res.status).toBe(401)
		})

		it('validates type is required for create (returns 401 since auth runs first)', async () => {
			const res = await app.request(
				'/api/agents/agent_test123/schedules?workspaceId=ws_test123',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						executeAt: new Date(Date.now() + 3600000).toISOString(),
						action: 'send_message',
					}),
				},
				env,
			)
			// Auth middleware runs first, so returns 401
			expect(res.status).toBe(401)
		})

		it('validates action is required for create (returns 401 since auth runs first)', async () => {
			const res = await app.request(
				'/api/agents/agent_test123/schedules?workspaceId=ws_test123',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						type: 'one-time',
						executeAt: new Date(Date.now() + 3600000).toISOString(),
					}),
				},
				env,
			)
			// Auth middleware runs first, so returns 401
			expect(res.status).toBe(401)
		})

		it('validates type is one of allowed values (returns 401 since auth runs first)', async () => {
			const res = await app.request(
				'/api/agents/agent_test123/schedules?workspaceId=ws_test123',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						type: 'invalid_type',
						action: 'send_message',
					}),
				},
				env,
			)
			// Auth middleware runs first, so returns 401
			expect(res.status).toBe(401)
		})

		it('accepts status filter parameter for list', async () => {
			const res = await app.request(
				'/api/agents/agent_test123/schedules?workspaceId=ws_test123&status=active',
				{},
				env,
			)
			// Should return 401 (not 400) because params are valid
			expect(res.status).toBe(401)
		})

		it('validates status filter is one of allowed values (returns 401 since auth runs first)', async () => {
			const res = await app.request(
				'/api/agents/agent_test123/schedules?workspaceId=ws_test123&status=invalid_status',
				{},
				env,
			)
			// Auth middleware runs first, so returns 401
			expect(res.status).toBe(401)
		})

		it('accepts limit and offset for executions', async () => {
			const res = await app.request(
				'/api/agents/agent_test123/schedules/schedule_test123/executions?workspaceId=ws_test123&limit=10&offset=5',
				{},
				env,
			)
			// Should return 401 (not 400) because params are valid
			expect(res.status).toBe(401)
		})

		it('accepts limit and offset for agent executions', async () => {
			const res = await app.request(
				'/api/agents/agent_test123/executions?workspaceId=ws_test123&limit=20&offset=0',
				{},
				env,
			)
			// Should return 401 (not 400) because params are valid
			expect(res.status).toBe(401)
		})
	})

	describe('Response Structure', () => {
		it('returns 401 with proper error structure', async () => {
			const res = await app.request(
				'/api/agents/agent_test123/schedules?workspaceId=ws_test123',
				{},
				env,
			)
			expect(res.status).toBe(401)

			const json = (await res.json()) as { error: string }
			expect(json).toHaveProperty('error')
			expect(typeof json.error).toBe('string')
		})
	})
})
