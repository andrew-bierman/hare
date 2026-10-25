import { applyD1Migrations, env } from 'cloudflare:test'
import { config } from '@hare/config'
import { beforeAll, describe, expect, it } from 'vitest'
import { app } from '../app'

const migrations = import.meta.glob('../../../../../apps/web/migrations/*.sql', {
	eager: true,
	query: '?raw',
	import: 'default',
}) as Record<string, string>

beforeAll(async () => {
	await applyD1Migrations(
		(env as { DB: D1Database }).DB,
		Object.entries(migrations)
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([name, sql]) => ({
				name,
				queries: sql
					.split('--> statement-breakpoint')
					.map((query) => query.trim())
					.filter(Boolean),
			})),
	)
})

describe('release acceptance in local Workers runtime', () => {
	it('signs up, reads the session and creates a workspace with the real API', async () => {
		const signup = await app.fetch(
			new Request('http://localhost:3000/api/auth/sign-up/email', {
				method: 'POST',
				headers: { 'content-type': 'application/json', origin: 'http://localhost:3000' },
				body: JSON.stringify({
					name: 'Release Test',
					email: 'release@example.test',
					password: 'test-password-for-release',
				}),
			}),
		)
		expect(signup.status, await signup.clone().text()).toBe(200)
		const cookie = signup.headers
			.getSetCookie()
			.map((value) => value.split(';')[0])
			.join('; ')
		expect(cookie).toContain('session_token')
		const session = await app.fetch(
			new Request('http://localhost:3000/api/auth/get-session', { headers: { cookie } }),
		)
		expect(session.status).toBe(200)
		expect(await session.json()).toMatchObject({ user: { email: 'release@example.test' } })
		const workspace = await app.fetch(
			new Request('http://localhost:3000/api/workspaces', {
				method: 'POST',
				headers: { cookie, 'content-type': 'application/json' },
				body: JSON.stringify({ name: 'Release Test', slug: 'release-test' }),
			}),
		)
		expect(workspace.status, await workspace.clone().text()).toBe(201)
		const createdWorkspace = (await workspace.json()) as { id: string; name: string; slug: string }
		expect(createdWorkspace).toMatchObject({ name: 'Release Test', slug: 'release-test' })
		const headers = {
			cookie,
			'content-type': 'application/json',
			'X-Workspace-Id': createdWorkspace.id,
		}
		const agent = await app.fetch(
			new Request('http://localhost:3000/api/agents', {
				method: 'POST',
				headers,
				body: JSON.stringify({
					name: 'Release Agent',
					model: config.agents.defaults.model,
					instructions: 'Help with local acceptance testing.',
				}),
			}),
		)
		expect(agent.status, await agent.clone().text()).toBe(200)
		const createdAgent = (await agent.json()) as { id: string }
		const list = await app.fetch(new Request('http://localhost:3000/api/agents', { headers }))
		expect(await list.json()).toMatchObject({
			agents: [{ id: createdAgent.id, name: 'Release Agent' }],
		})
		const removed = await app.fetch(
			new Request(`http://localhost:3000/api/agents/${createdAgent.id}`, {
				method: 'DELETE',
				headers,
			}),
		)
		expect(removed.status).toBe(200)
		const missing = await app.fetch(
			new Request(`http://localhost:3000/api/agents/${createdAgent.id}`, { headers }),
		)
		expect(missing.status).toBe(404)
	})

	it('rejects unauthenticated workspace access', async () => {
		const response = await app.fetch(new Request('http://localhost:3000/api/workspaces'))
		expect(response.status).toBe(401)
	})
})
