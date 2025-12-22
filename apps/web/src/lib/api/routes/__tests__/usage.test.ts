import { env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { app } from 'web-app/lib/api/index'

describe('Usage API', () => {
	describe('Authentication', () => {
		it('returns 401 for unauthenticated GET /api/usage', async () => {
			const res = await app.request('/api/usage', undefined, env)
			expect(res.status).toBe(401)

			const json = (await res.json()) as { error: string }
			expect(json.error).toBe('Unauthorized')
		})

		it('returns 401 for unauthenticated GET /api/usage with workspaceId', async () => {
			const res = await app.request('/api/usage?workspaceId=ws_test123', undefined, env)
			expect(res.status).toBe(401)
		})

		it('returns 401 for unauthenticated GET /api/usage/agents/:id', async () => {
			const res = await app.request(
				'/api/usage/agents/agent_test123?workspaceId=ws_test123',
				undefined,
				env,
			)
			expect(res.status).toBe(401)
		})
	})
})
