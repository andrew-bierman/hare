import { env } from 'cloudflare:test'
import { beforeAll, describe, expect, it } from 'vitest'
import { app } from '@hare/api'
import { applyMigrations } from './setup'

// Apply D1 migrations before tests
beforeAll(async () => {
	await applyMigrations(env.DB)
})

describe('Agent WebSocket API', () => {
	describe('Authentication', () => {
		it('returns 404 for non-existent agent on GET /api/ws/agents/:id/ws', async () => {
			// Agent lookup happens first, returns 404 because agent doesn't exist
			const res = await app.request('/api/ws/agents/agent_test123/ws', {}, env)
			// Agent not found (route exists but agent doesn't)
			expect(res.status).toBe(404)
		})

		it('returns 404 for GET /api/ws/agents/:id/state (agent not found)', async () => {
			const res = await app.request('/api/ws/agents/agent_test123/state', {}, env)
			// Without agent in DB, returns 404
			expect(res.status).toBe(404)
		})

		it('returns 404 for POST /api/ws/agents/:id/configure (agent not found)', async () => {
			const res = await app.request(
				'/api/ws/agents/agent_test123/configure',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: 'Updated Agent',
					}),
				},
				env,
			)
			// Agent not found
			expect(res.status).toBe(404)
		})

		it('returns 404 for GET /api/ws/agents/:id/schedules (agent not found)', async () => {
			const res = await app.request('/api/ws/agents/agent_test123/schedules', {}, env)
			// Agent not found
			expect(res.status).toBe(404)
		})
	})

	describe('POST /api/ws/agents/:id/chat', () => {
		it('returns 404 for non-existent agent', async () => {
			const res = await app.request(
				'/api/ws/agents/agent_nonexistent/chat',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						message: 'Hello, agent!',
					}),
				},
				env,
			)
			expect(res.status).toBe(404)
		})

		it('returns 404 when message validation would fail (agent lookup happens first)', async () => {
			const res = await app.request(
				'/api/ws/agents/agent_test123/chat',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({}),
				},
				env,
			)
			// Agent lookup happens before validation, returns 404
			expect(res.status).toBe(404)
		})
	})

	describe('GET /api/ws/agents/:id/ws', () => {
		it('returns 404 for non-existent agent', async () => {
			const res = await app.request('/api/ws/agents/agent_test123/ws', {}, env)
			// Agent not found
			expect(res.status).toBe(404)
		})
	})

	describe('POST /api/ws/agents/:id/configure', () => {
		it('returns 404 for non-existent agent', async () => {
			const res = await app.request(
				'/api/ws/agents/agent_test123/configure',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: 'Test Agent',
						instructions: 'You are a helpful assistant.',
						model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
					}),
				},
				env,
			)
			// Agent not found
			expect(res.status).toBe(404)
		})

		it('returns 404 for empty request body (agent lookup happens first)', async () => {
			const res = await app.request(
				'/api/ws/agents/agent_test123/configure',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: '',
				},
				env,
			)
			// Agent lookup happens first, returns 404
			expect(res.status).toBe(404)
		})
	})
})
