import { env } from 'cloudflare:test'
import { beforeAll, describe, expect, it } from 'vitest'
import { app } from 'web-app/lib/api/index'

// Apply D1 migrations before tests
// NOTE: File system access doesn't work in Cloudflare Workers test environment
// These tests only check authentication which doesn't require migrations
beforeAll(async () => {
	// Migration loading skipped - tests only verify auth responses
})

describe('Agents API', () => {
	describe('Authentication', () => {
		it('returns 401 for unauthenticated GET /api/agents', async () => {
			const res = await app.request('/api/agents', {}, env)
			expect(res.status).toBe(401)

			const json = (await res.json()) as { error: string }
			expect(json.error).toBe('Unauthorized')
		})

		it('returns 401 for unauthenticated POST /api/agents', async () => {
			const res = await app.request(
				'/api/agents',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: 'Test Agent',
						model: 'llama-3.3-70b-instruct',
						instructions: 'You are a helpful assistant.',
					}),
				},
				env,
			)
			expect(res.status).toBe(401)
		})

		it('returns 401 for unauthenticated GET /api/agents/:id', async () => {
			const res = await app.request('/api/agents/agent_test123', {}, env)
			expect(res.status).toBe(401)
		})

		it('returns 401 for unauthenticated PATCH /api/agents/:id', async () => {
			const res = await app.request(
				'/api/agents/agent_test123',
				{
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ name: 'Updated Agent' }),
				},
				env,
			)
			expect(res.status).toBe(401)
		})

		it('returns 401 for unauthenticated DELETE /api/agents/:id', async () => {
			const res = await app.request(
				'/api/agents/agent_test123',
				{
					method: 'DELETE',
				},
				env,
			)
			expect(res.status).toBe(401)
		})

		it('returns 401 for unauthenticated POST /api/agents/:id/deploy', async () => {
			const res = await app.request(
				'/api/agents/agent_test123/deploy',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ version: '1.0.0' }),
				},
				env,
			)
			expect(res.status).toBe(401)
		})

		it('returns 401 for unauthenticated POST /api/agents/validate', async () => {
			const res = await app.request(
				'/api/agents/validate',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: 'Test Agent',
						model: 'claude-3-5-sonnet-20241022',
						instructions: 'You are a helpful assistant.',
					}),
				},
				env,
			)
			expect(res.status).toBe(401)
		})
	})
})
