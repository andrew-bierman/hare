import { env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { app } from 'web-app/lib/api/index'

describe('Chat Export API', () => {
	describe('GET /api/chat/conversations/{id}/export', () => {
		it('returns 401 for unauthenticated request', async () => {
			const res = await app.request('/api/chat/conversations/conv_test123/export', {}, env)
			expect(res.status).toBe(401)

			const json = (await res.json()) as { error: string }
			expect(json.error).toBe('Unauthorized')
		})

		it('returns 401 for unauthenticated request with format query', async () => {
			const res = await app.request(
				'/api/chat/conversations/conv_test123/export?format=markdown',
				{},
				env,
			)
			expect(res.status).toBe(401)
		})

		it('returns 401 for unauthenticated request with includeMetadata query', async () => {
			const res = await app.request(
				'/api/chat/conversations/conv_test123/export?format=json&includeMetadata=true',
				{},
				env,
			)
			expect(res.status).toBe(401)
		})
	})
})
