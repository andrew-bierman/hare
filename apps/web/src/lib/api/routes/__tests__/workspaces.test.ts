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

describe('Workspaces API', () => {
	describe('Authentication', () => {
		it('returns 401 for unauthenticated GET /api/workspaces', async () => {
			const res = await app.request('/api/workspaces', {}, env)
			expect(res.status).toBe(401)

			const json = (await res.json()) as { error: string }
			expect(json.error).toBe('Unauthorized')
		})

		it('returns 401 for unauthenticated POST /api/workspaces', async () => {
			const res = await app.request(
				'/api/workspaces',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: 'Test Workspace',
						description: 'A test workspace',
					}),
				},
				env,
			)
			expect(res.status).toBe(401)
		})

		it('returns 401 for unauthenticated GET /api/workspaces/:id', async () => {
			const res = await app.request('/api/workspaces/ws_test123', {}, env)
			expect(res.status).toBe(401)
		})

		it('returns 401 for unauthenticated PATCH /api/workspaces/:id', async () => {
			const res = await app.request(
				'/api/workspaces/ws_test123',
				{
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ name: 'Updated Workspace' }),
				},
				env,
			)
			expect(res.status).toBe(401)
		})

		it('returns 401 for unauthenticated DELETE /api/workspaces/:id', async () => {
			const res = await app.request(
				'/api/workspaces/ws_test123',
				{
					method: 'DELETE',
				},
				env,
			)
			expect(res.status).toBe(401)
		})
	})
})
