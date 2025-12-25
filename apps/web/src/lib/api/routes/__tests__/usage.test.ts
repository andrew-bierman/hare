import { env } from 'cloudflare:test'
import { beforeAll, describe, expect, it } from 'vitest'
import { app } from 'web-app/lib/api/index'

// Apply D1 migrations before tests
// NOTE: File system access doesn't work in Cloudflare Workers test environment
// These tests only check authentication which doesn't require migrations
beforeAll(async () => {
	// Migration loading skipped - tests only verify auth responses
})

describe('Usage API', () => {
	describe('Authentication', () => {
		it('returns 401 for unauthenticated GET /api/usage', async () => {
			const res = await app.request('/api/usage', {}, env)
			expect(res.status).toBe(401)

			const json = (await res.json()) as { error: string }
			expect(json.error).toBe('Unauthorized')
		})

		it('returns 401 for unauthenticated GET /api/usage with workspaceId', async () => {
			const res = await app.request('/api/usage?workspaceId=ws_test123', {}, env)
			expect(res.status).toBe(401)
		})

		it('returns 401 for unauthenticated GET /api/usage/agents/:id', async () => {
			const res = await app.request(
				'/api/usage/agents/agent_test123?workspaceId=ws_test123',
				{},
				env,
			)
			expect(res.status).toBe(401)
		})
	})
})
