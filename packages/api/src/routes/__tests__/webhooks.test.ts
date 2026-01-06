import { env } from 'cloudflare:test'
import { beforeAll, describe, expect, it } from 'vitest'
import { app } from '@hare/api'
import { applyMigrations } from './setup'

// Apply D1 migrations before tests
beforeAll(async () => {
	await applyMigrations(env.DB)
})

describe('Webhooks API', () => {
	describe('Authentication', () => {
		it('returns 401 for unauthenticated GET /api/agents/:id/webhooks', async () => {
			const res = await app.request(
				'/api/agents/agent_test123/webhooks?workspaceId=ws_test123',
				{},
				env,
			)
			expect(res.status).toBe(401)

			const json = (await res.json()) as { error: string }
			expect(json.error).toBe('Unauthorized')
		})

		it('returns 401 for unauthenticated POST /api/agents/:id/webhooks', async () => {
			const res = await app.request(
				'/api/agents/agent_test123/webhooks?workspaceId=ws_test123',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						url: 'https://example.com/webhook',
						events: ['agent.deployed'],
					}),
				},
				env,
			)
			expect(res.status).toBe(401)
		})

		it('returns 401 for unauthenticated GET /api/agents/:id/webhooks/:webhookId', async () => {
			const res = await app.request(
				'/api/agents/agent_test123/webhooks/webhook_test123?workspaceId=ws_test123',
				{},
				env,
			)
			expect(res.status).toBe(401)
		})

		it('returns 401 for unauthenticated PATCH /api/agents/:id/webhooks/:webhookId', async () => {
			const res = await app.request(
				'/api/agents/agent_test123/webhooks/webhook_test123?workspaceId=ws_test123',
				{
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						url: 'https://example.com/webhook-updated',
					}),
				},
				env,
			)
			expect(res.status).toBe(401)
		})

		it('returns 401 for unauthenticated DELETE /api/agents/:id/webhooks/:webhookId', async () => {
			const res = await app.request(
				'/api/agents/agent_test123/webhooks/webhook_test123?workspaceId=ws_test123',
				{
					method: 'DELETE',
				},
				env,
			)
			expect(res.status).toBe(401)
		})

		it('returns 401 for unauthenticated GET /api/agents/:id/webhooks/:webhookId/logs', async () => {
			const res = await app.request(
				'/api/agents/agent_test123/webhooks/webhook_test123/logs?workspaceId=ws_test123',
				{},
				env,
			)
			expect(res.status).toBe(401)
		})

		it('returns 401 for unauthenticated POST /api/agents/:id/webhooks/:webhookId/regenerate-secret', async () => {
			const res = await app.request(
				'/api/agents/agent_test123/webhooks/webhook_test123/regenerate-secret?workspaceId=ws_test123',
				{
					method: 'POST',
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
			const res = await app.request('/api/agents/agent_test123/webhooks', {}, env)
			// Auth middleware runs first, so returns 401
			expect(res.status).toBe(401)
		})

		it('requires workspaceId query parameter for create (returns 401 since auth runs first)', async () => {
			const res = await app.request(
				'/api/agents/agent_test123/webhooks',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						url: 'https://example.com/webhook',
						events: ['agent.deployed'],
					}),
				},
				env,
			)
			// Auth middleware runs first, so returns 401
			expect(res.status).toBe(401)
		})

		it('validates URL is required for create (returns 401 since auth runs first)', async () => {
			const res = await app.request(
				'/api/agents/agent_test123/webhooks?workspaceId=ws_test123',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						events: ['agent.deployed'],
					}),
				},
				env,
			)
			// Auth middleware runs first, so returns 401
			expect(res.status).toBe(401)
		})

		it('validates events are required for create (returns 401 since auth runs first)', async () => {
			const res = await app.request(
				'/api/agents/agent_test123/webhooks?workspaceId=ws_test123',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						url: 'https://example.com/webhook',
					}),
				},
				env,
			)
			// Auth middleware runs first, so returns 401
			expect(res.status).toBe(401)
		})

		it('validates events must not be empty (returns 401 since auth runs first)', async () => {
			const res = await app.request(
				'/api/agents/agent_test123/webhooks?workspaceId=ws_test123',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						url: 'https://example.com/webhook',
						events: [],
					}),
				},
				env,
			)
			// Auth middleware runs first, so returns 401
			expect(res.status).toBe(401)
		})

		it('validates URL format (returns 401 since auth runs first)', async () => {
			const res = await app.request(
				'/api/agents/agent_test123/webhooks?workspaceId=ws_test123',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						url: 'not-a-valid-url',
						events: ['agent.deployed'],
					}),
				},
				env,
			)
			// Auth middleware runs first, so returns 401
			expect(res.status).toBe(401)
		})

		it('validates event type is one of allowed values (returns 401 since auth runs first)', async () => {
			const res = await app.request(
				'/api/agents/agent_test123/webhooks?workspaceId=ws_test123',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						url: 'https://example.com/webhook',
						events: ['invalid.event.type'],
					}),
				},
				env,
			)
			// Auth middleware runs first, so returns 401
			expect(res.status).toBe(401)
		})

		it('validates status is one of allowed values for update (returns 401 since auth runs first)', async () => {
			const res = await app.request(
				'/api/agents/agent_test123/webhooks/webhook_test123?workspaceId=ws_test123',
				{
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						status: 'invalid_status',
					}),
				},
				env,
			)
			// Auth middleware runs first, so returns 401
			expect(res.status).toBe(401)
		})
	})
})
