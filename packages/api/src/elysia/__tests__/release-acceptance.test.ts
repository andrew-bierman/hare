import { applyD1Migrations, env } from 'cloudflare:test'
import { Buffer } from 'node:buffer'
import { config } from '@hare/config'
import { beforeAll, describe, expect, it, vi } from 'vitest'
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
	it('authenticates, isolates workspaces and completes agent CRUD with the real API', async () => {
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
		const updated = await app.fetch(
			new Request(`http://localhost:3000/api/agents/${createdAgent.id}`, {
				method: 'PATCH',
				headers,
				body: JSON.stringify({ name: 'Updated Release Agent' }),
			}),
		)
		expect(updated.status, await updated.clone().text()).toBe(200)
		const readUpdated = await app.fetch(
			new Request(`http://localhost:3000/api/agents/${createdAgent.id}`, { headers }),
		)
		expect(await readUpdated.json()).toMatchObject({
			id: createdAgent.id,
			name: 'Updated Release Agent',
		})
		const outsider = await app.fetch(
			new Request('http://localhost:3000/api/auth/sign-up/email', {
				method: 'POST',
				headers: { 'content-type': 'application/json', origin: 'http://localhost:3000' },
				body: JSON.stringify({
					name: 'Other User',
					email: 'outsider@example.test',
					password: 'test-password-for-outsider',
				}),
			}),
		)
		expect(outsider.status, await outsider.clone().text()).toBe(200)
		const outsiderCookie = outsider.headers
			.getSetCookie()
			.map((value) => value.split(';')[0])
			.join('; ')
		expect(outsiderCookie).toContain('session_token')
		const forbidden = await app.fetch(
			new Request(`http://localhost:3000/api/agents/${createdAgent.id}`, {
				headers: { ...headers, cookie: outsiderCookie },
			}),
		)
		expect(forbidden.status).toBe(403)
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
		const signout = await app.fetch(
			new Request('http://localhost:3000/api/auth/sign-out', {
				method: 'POST',
				headers: { cookie, origin: 'http://localhost:3000' },
			}),
		)
		expect(signout.status).toBe(200)
		expect(
			signout.headers
				.getSetCookie()
				.some((value) => value.includes('session_token=;') && value.includes('Max-Age=0')),
		).toBe(true)
		// Validate database revocation without replaying the five-minute signed cookie cache.
		const tokenOnly = cookie
			.split('; ')
			.filter((value) => value.startsWith('better-auth.session_token='))
			.join('; ')
		expect(tokenOnly).not.toBe('')
		const expired = await app.fetch(
			new Request('http://localhost:3000/api/workspaces', { headers: { cookie: tokenOnly } }),
		)
		expect(expired.status).toBe(401)
		const signin = await app.fetch(
			new Request('http://localhost:3000/api/auth/sign-in/email', {
				method: 'POST',
				headers: { 'content-type': 'application/json', origin: 'http://localhost:3000' },
				body: JSON.stringify({
					email: 'release@example.test',
					password: 'test-password-for-release',
				}),
			}),
		)
		expect(signin.status, await signin.clone().text()).toBe(200)
		expect(signin.headers.getSetCookie().join(';')).toContain('session_token=')
	})

	it('characterizes the existing logout cache window and rejects forged cache data', async () => {
		// This records current behavior, not approval of immediate post-logout replay.
		const signupStartedAt = Date.now()
		const signup = await app.fetch(
			new Request('http://localhost:3000/api/auth/sign-up/email', {
				method: 'POST',
				headers: { 'content-type': 'application/json', origin: 'http://localhost:3000' },
				body: JSON.stringify({
					name: 'Cache Test',
					email: 'cache@example.test',
					password: 'test-password-for-cache',
				}),
			}),
		)
		const signupCompletedAt = Date.now()
		expect(signup.status).toBe(200)
		const cookies = signup.headers.getSetCookie().map((value) => value.split(';')[0] ?? '')
		const cookie = cookies.join('; ')
		const cacheCookie = cookies.find((value) => value.startsWith('better-auth.session_data='))
		expect(cacheCookie).toBeDefined()
		if (!cacheCookie) throw new Error('Expected the configured signed session cache cookie')
		const encoded = cacheCookie.slice(cacheCookie.indexOf('=') + 1)
		const cache = JSON.parse(
			Buffer.from(decodeURIComponent(encoded), 'base64url').toString('utf8'),
		) as {
			expiresAt: number
			session: { user: { email: string } }
		}
		// Check the real cookie's configured lifetime before moving the clock.
		expect(cache.expiresAt).toBeGreaterThanOrEqual(signupStartedAt + 300_000)
		expect(cache.expiresAt).toBeLessThanOrEqual(signupCompletedAt + 300_000)
		cache.session.user.email = 'forged@example.test'
		const forgedCache = Buffer.from(JSON.stringify(cache)).toString('base64url')
		const forgedCookie = cookies
			.map((value) => (value === cacheCookie ? `better-auth.session_data=${forgedCache}` : value))
			.join('; ')
		const forged = await app.fetch(
			new Request('http://localhost:3000/api/workspaces', { headers: { cookie: forgedCookie } }),
		)
		expect(forged.status).toBe(401)
		const signout = await app.fetch(
			new Request('http://localhost:3000/api/auth/sign-out', {
				method: 'POST',
				headers: { cookie, origin: 'http://localhost:3000' },
			}),
		)
		expect(signout.status).toBe(200)
		for (const name of ['session_token', 'session_data']) {
			expect(
				signout.headers
					.getSetCookie()
					.some((value) => value.includes(`${name}=;`) && value.includes('Max-Age=0')),
			).toBe(true)
		}
		const clock = vi.spyOn(Date, 'now')
		try {
			clock.mockReturnValue(cache.expiresAt - 1_000)
			const replay = await app.fetch(
				new Request('http://localhost:3000/api/workspaces', { headers: { cookie } }),
			)
			expect(replay.status).toBe(200)
			clock.mockReturnValue(cache.expiresAt + 1_000)
			const expired = await app.fetch(
				new Request('http://localhost:3000/api/workspaces', { headers: { cookie } }),
			)
			expect(expired.status).toBe(401)
		} finally {
			clock.mockRestore()
		}
	})

	it('rejects unauthenticated workspace access', async () => {
		const response = await app.fetch(new Request('http://localhost:3000/api/workspaces'))
		expect(response.status).toBe(401)
	})
})
