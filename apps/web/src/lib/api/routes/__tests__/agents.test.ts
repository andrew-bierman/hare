import { env } from 'cloudflare:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { app } from 'web-app/lib/api/index'

// Apply D1 migrations before tests
beforeAll(async () => {
	const migration = readFileSync(
		join(__dirname, '../../../../../../migrations/0000_slow_invaders.sql'),
		'utf-8',
	)
	await env.DB.exec(migration)
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
	})
})
