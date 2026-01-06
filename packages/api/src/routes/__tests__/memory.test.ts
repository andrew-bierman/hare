import { env } from 'cloudflare:test'
import { beforeAll, describe, expect, it } from 'vitest'
import { app } from '@hare/api'
import { applyMigrations } from './setup'

// Apply D1 migrations before tests
beforeAll(async () => {
	await applyMigrations(env.DB)
})

describe('Memory API', () => {
	describe('Authentication', () => {
		it('returns 401 for unauthenticated GET /api/agents/:id/memories', async () => {
			const res = await app.request(
				'/api/agents/agent_test123/memories?workspaceId=ws_test123',
				{},
				env,
			)
			expect(res.status).toBe(401)

			const json = (await res.json()) as { error: string }
			expect(json.error).toBe('Unauthorized')
		})

		it('returns 401 for unauthenticated POST /api/agents/:id/memories', async () => {
			const res = await app.request(
				'/api/agents/agent_test123/memories?workspaceId=ws_test123',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						content: 'This is a test memory',
						type: 'fact',
					}),
				},
				env,
			)
			expect(res.status).toBe(401)
		})

		it('returns 401 for unauthenticated POST /api/agents/:id/memories/search', async () => {
			const res = await app.request(
				'/api/agents/agent_test123/memories/search?workspaceId=ws_test123',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						query: 'test query',
						topK: 5,
					}),
				},
				env,
			)
			expect(res.status).toBe(401)
		})

		it('returns 401 for unauthenticated DELETE /api/agents/:id/memories/:memoryId', async () => {
			const res = await app.request(
				'/api/agents/agent_test123/memories/mem_test123?workspaceId=ws_test123',
				{
					method: 'DELETE',
				},
				env,
			)
			expect(res.status).toBe(401)
		})

		it('returns 401 for unauthenticated PATCH /api/agents/:id/memories/:memoryId', async () => {
			const res = await app.request(
				'/api/agents/agent_test123/memories/mem_test123?workspaceId=ws_test123',
				{
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						content: 'Updated memory content',
					}),
				},
				env,
			)
			expect(res.status).toBe(401)
		})

		it('returns 401 for unauthenticated DELETE /api/agents/:id/memories (clear all)', async () => {
			const res = await app.request(
				'/api/agents/agent_test123/memories?workspaceId=ws_test123',
				{
					method: 'DELETE',
				},
				env,
			)
			expect(res.status).toBe(401)
		})
	})

	describe('Input Validation', () => {
		// Note: Authentication middleware runs before validation for protected routes
		// So missing/invalid parameters will still return 401 for unauthenticated requests
		it('requires workspaceId query parameter for list (returns 401 since auth runs first)', async () => {
			const res = await app.request('/api/agents/agent_test123/memories', {}, env)
			// Auth middleware runs first, so returns 401
			expect(res.status).toBe(401)
		})

		it('requires workspaceId query parameter for create (returns 401 since auth runs first)', async () => {
			const res = await app.request(
				'/api/agents/agent_test123/memories',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						content: 'Test memory',
					}),
				},
				env,
			)
			// Auth middleware runs first, so returns 401
			expect(res.status).toBe(401)
		})

		it('requires workspaceId query parameter for search (returns 401 since auth runs first)', async () => {
			const res = await app.request(
				'/api/agents/agent_test123/memories/search',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						query: 'test',
					}),
				},
				env,
			)
			// Auth middleware runs first, so returns 401
			expect(res.status).toBe(401)
		})

		it('validates content is required for create (returns 401 since auth runs first)', async () => {
			const res = await app.request(
				'/api/agents/agent_test123/memories?workspaceId=ws_test123',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({}),
				},
				env,
			)
			// Auth middleware runs first, so returns 401
			expect(res.status).toBe(401)
		})

		it('validates query is required for search (returns 401 since auth runs first)', async () => {
			const res = await app.request(
				'/api/agents/agent_test123/memories/search?workspaceId=ws_test123',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({}),
				},
				env,
			)
			// Auth middleware runs first, so returns 401
			expect(res.status).toBe(401)
		})

		it('validates memory type is one of allowed values (returns 401 since auth runs first)', async () => {
			const res = await app.request(
				'/api/agents/agent_test123/memories?workspaceId=ws_test123',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						content: 'Test memory',
						type: 'invalid_type',
					}),
				},
				env,
			)
			// Auth middleware runs first, so returns 401
			expect(res.status).toBe(401)
		})

		it('validates content length for update (returns 401 since auth runs first)', async () => {
			const res = await app.request(
				'/api/agents/agent_test123/memories/mem_test123?workspaceId=ws_test123',
				{
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						content: '', // Empty content should fail
					}),
				},
				env,
			)
			// Auth middleware runs first, so returns 401
			expect(res.status).toBe(401)
		})
	})
})
