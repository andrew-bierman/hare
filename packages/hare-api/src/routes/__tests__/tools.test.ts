import { env } from 'cloudflare:test'
import { beforeAll, describe, expect, it } from 'vitest'
import { app } from 'web-app/lib/api/index'

// Apply D1 migrations before tests
// NOTE: File system access doesn't work in Cloudflare Workers test environment
// These tests only check authentication which doesn't require migrations
beforeAll(async () => {
	// Migration loading skipped - tests only verify auth responses
})

describe('Tools API', () => {
	describe('Authentication', () => {
		it('returns 401 for unauthenticated GET /api/tools', async () => {
			const res = await app.request('/api/tools', {}, env)
			expect(res.status).toBe(401)

			const json = (await res.json()) as { error: string }
			expect(json.error).toBe('Unauthorized')
		})

		it('returns 401 for unauthenticated POST /api/tools', async () => {
			const res = await app.request(
				'/api/tools',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: 'Test Tool',
						description: 'A test tool',
						type: 'http',
					}),
				},
				env,
			)
			expect(res.status).toBe(401)
		})

		it('returns 401 for unauthenticated GET /api/tools/:id', async () => {
			const res = await app.request('/api/tools/tool_test123', {}, env)
			expect(res.status).toBe(401)
		})

		it('returns 401 for unauthenticated PATCH /api/tools/:id', async () => {
			const res = await app.request(
				'/api/tools/tool_test123',
				{
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ name: 'Updated Tool' }),
				},
				env,
			)
			expect(res.status).toBe(401)
		})

		it('returns 401 for unauthenticated DELETE /api/tools/:id', async () => {
			const res = await app.request(
				'/api/tools/tool_test123',
				{
					method: 'DELETE',
				},
				env,
			)
			expect(res.status).toBe(401)
		})
	})
})
