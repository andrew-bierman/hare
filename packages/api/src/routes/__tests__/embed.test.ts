import { env } from 'cloudflare:test'
import { beforeAll, describe, expect, it } from 'vitest'
import { app } from '@hare/api'
import { applyMigrations } from './setup'

// Apply D1 migrations before tests
beforeAll(async () => {
	await applyMigrations(env.DB)
})

describe('Embed API', () => {
	describe('GET /api/embed/agents/:agentId', () => {
		it('returns 404 for non-existent agent', async () => {
			const res = await app.request('/api/embed/agents/agent_nonexistent', {}, env)
			expect(res.status).toBe(404)

			const json = (await res.json()) as { error: string }
			expect(json.error).toBe('Agent not found')
		})

		it('does not require authentication (public endpoint)', async () => {
			const res = await app.request('/api/embed/agents/agent_test123', {}, env)
			// Should return 404 (agent not found) not 401 (unauthorized)
			expect(res.status).toBe(404)
		})

		it('includes CORS headers', async () => {
			const res = await app.request(
				'/api/embed/agents/agent_test123',
				{
					headers: {
						Origin: 'https://example.com',
					},
				},
				env,
			)
			// CORS headers should be present
			expect(res.headers.get('Access-Control-Allow-Origin')).toBeTruthy()
		})
	})

	describe('POST /api/embed/agents/:agentId/chat', () => {
		it('returns 404 for non-existent agent', async () => {
			const res = await app.request(
				'/api/embed/agents/agent_nonexistent/chat',
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

			const json = (await res.json()) as { error: string }
			expect(json.error).toBe('Agent not found')
		})

		it('does not require authentication (public endpoint)', async () => {
			const res = await app.request(
				'/api/embed/agents/agent_test123/chat',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						message: 'Hello, agent!',
					}),
				},
				env,
			)
			// Should return 404 (agent not found) not 401 (unauthorized)
			expect(res.status).toBe(404)
		})

		it('validates message is required', async () => {
			const res = await app.request(
				'/api/embed/agents/agent_test123/chat',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({}),
				},
				env,
			)
			// Should return 400 for missing message
			expect(res.status).toBe(400)
		})

		it('validates message is not empty', async () => {
			const res = await app.request(
				'/api/embed/agents/agent_test123/chat',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						message: '',
					}),
				},
				env,
			)
			// Should return 400 for empty message
			expect(res.status).toBe(400)
		})

		it('accepts optional sessionId', async () => {
			const res = await app.request(
				'/api/embed/agents/agent_test123/chat',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						message: 'Hello!',
						sessionId: 'session_test123',
					}),
				},
				env,
			)
			// Should return 404 (agent not found) not 400 (validation error)
			expect(res.status).toBe(404)
		})

		it('includes CORS headers', async () => {
			const res = await app.request(
				'/api/embed/agents/agent_test123/chat',
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Origin: 'https://example.com',
					},
					body: JSON.stringify({
						message: 'Hello!',
					}),
				},
				env,
			)
			// CORS headers should be present
			expect(res.headers.get('Access-Control-Allow-Origin')).toBeTruthy()
		})

		it('rejects malformed JSON', async () => {
			const res = await app.request(
				'/api/embed/agents/agent_test123/chat',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: 'not-valid-json',
				},
				env,
			)
			// May return 400 or 500 depending on how the framework handles parse errors
			expect([400, 500]).toContain(res.status)
		})

		it('validates message length (max 10000 characters)', async () => {
			const longMessage = 'a'.repeat(10001)
			const res = await app.request(
				'/api/embed/agents/agent_test123/chat',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						message: longMessage,
					}),
				},
				env,
			)
			// Should return 400 for message too long
			expect(res.status).toBe(400)
		})
	})

	describe('OPTIONS /api/embed/agents/:agentId', () => {
		it('handles preflight CORS requests', async () => {
			const res = await app.request(
				'/api/embed/agents/agent_test123',
				{
					method: 'OPTIONS',
					headers: {
						Origin: 'https://example.com',
						'Access-Control-Request-Method': 'GET',
					},
				},
				env,
			)
			// Should return 200 or 204 for preflight
			expect([200, 204]).toContain(res.status)
		})
	})

	describe('OPTIONS /api/embed/agents/:agentId/chat', () => {
		it('handles preflight CORS requests for chat', async () => {
			const res = await app.request(
				'/api/embed/agents/agent_test123/chat',
				{
					method: 'OPTIONS',
					headers: {
						Origin: 'https://example.com',
						'Access-Control-Request-Method': 'POST',
						'Access-Control-Request-Headers': 'Content-Type',
					},
				},
				env,
			)
			// Should return 200 or 204 for preflight
			expect([200, 204]).toContain(res.status)
		})
	})

	describe('Domain Restrictions', () => {
		it('accepts requests without Origin header', async () => {
			const res = await app.request('/api/embed/agents/agent_test123', {}, env)
			// Should return 404 (agent not found) not 403 (forbidden)
			expect(res.status).toBe(404)
		})

		it('accepts requests from any origin by default', async () => {
			const res = await app.request(
				'/api/embed/agents/agent_test123',
				{
					headers: {
						Origin: 'https://random-domain.com',
					},
				},
				env,
			)
			// Should return 404 (agent not found) not 403 (forbidden)
			expect(res.status).toBe(404)
		})
	})
})
