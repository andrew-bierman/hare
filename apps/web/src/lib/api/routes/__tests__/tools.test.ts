import { describe, expect, it } from 'vitest'
import { app } from 'web-app/lib/api/index'

describe('Tools API', () => {
	describe('Authentication', () => {
		it('returns 401 for unauthenticated GET /api/tools', async () => {
			const res = await app.request('/api/tools')
			expect(res.status).toBe(401)

			const json = (await res.json()) as { error: string }
			expect(json.error).toBe('Unauthorized')
		})

		it('returns 401 for unauthenticated POST /api/tools', async () => {
			const res = await app.request('/api/tools', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: 'Test Tool',
					description: 'A test tool',
					type: 'http',
				}),
			})
			expect(res.status).toBe(401)
		})

		it('returns 401 for unauthenticated GET /api/tools/:id', async () => {
			const res = await app.request('/api/tools/tool_test123')
			expect(res.status).toBe(401)
		})

		it('returns 401 for unauthenticated PATCH /api/tools/:id', async () => {
			const res = await app.request('/api/tools/tool_test123', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: 'Updated Tool' }),
			})
			expect(res.status).toBe(401)
		})

		it('returns 401 for unauthenticated DELETE /api/tools/:id', async () => {
			const res = await app.request('/api/tools/tool_test123', {
				method: 'DELETE',
			})
			expect(res.status).toBe(401)
		})
	})
})
