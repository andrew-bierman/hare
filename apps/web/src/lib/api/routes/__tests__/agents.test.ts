import { SELF } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { app } from 'web-app/lib/api/index'

describe('Agents API', () => {
	describe('Authentication', () => {
		it('returns 401 for unauthenticated GET /api/agents', async () => {
			const res = await app.request('/api/agents', undefined, SELF)
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
				SELF,
			)
			expect(res.status).toBe(401)
		})

		it('returns 401 for unauthenticated GET /api/agents/:id', async () => {
			const res = await app.request('/api/agents/agent_test123', undefined, SELF)
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
				SELF,
			)
			expect(res.status).toBe(401)
		})

		it('returns 401 for unauthenticated DELETE /api/agents/:id', async () => {
			const res = await app.request(
				'/api/agents/agent_test123',
				{
					method: 'DELETE',
				},
				SELF,
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
				SELF,
			)
			expect(res.status).toBe(401)
		})
	})
})
