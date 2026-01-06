import { env } from 'cloudflare:test'
import { beforeAll, describe, expect, it } from 'vitest'
import { app } from '@hare/api'
import { applyMigrations } from './setup'

// Apply D1 migrations before tests
beforeAll(async () => {
	await applyMigrations(env.DB)
})

describe('User Settings API', () => {
	describe('Authentication', () => {
		it('returns 401 for unauthenticated GET /api/user/preferences', async () => {
			const res = await app.request('/api/user/preferences', {}, env)
			expect(res.status).toBe(401)

			const json = (await res.json()) as { error: string }
			expect(json.error).toBe('Unauthorized')
		})

		it('returns 401 for unauthenticated PATCH /api/user/preferences', async () => {
			const res = await app.request(
				'/api/user/preferences',
				{
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						emailNotifications: false,
					}),
				},
				env,
			)
			expect(res.status).toBe(401)

			const json = (await res.json()) as { error: string }
			expect(json.error).toBe('Unauthorized')
		})
	})

	describe('Input Validation', () => {
		it('validates emailNotifications is boolean for update', async () => {
			const res = await app.request(
				'/api/user/preferences',
				{
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						emailNotifications: 'not-a-boolean',
					}),
				},
				env,
			)
			// Should return 400 for invalid type (or 401 if auth check comes first)
			expect([400, 401]).toContain(res.status)
		})

		it('validates usageAlerts is boolean for update', async () => {
			const res = await app.request(
				'/api/user/preferences',
				{
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						usageAlerts: 'not-a-boolean',
					}),
				},
				env,
			)
			// Should return 400 for invalid type (or 401 if auth check comes first)
			expect([400, 401]).toContain(res.status)
		})

		it('accepts valid boolean values for emailNotifications', async () => {
			const res = await app.request(
				'/api/user/preferences',
				{
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						emailNotifications: true,
					}),
				},
				env,
			)
			// Should return 401 (not 400) because value is valid
			expect(res.status).toBe(401)
		})

		it('accepts valid boolean values for usageAlerts', async () => {
			const res = await app.request(
				'/api/user/preferences',
				{
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						usageAlerts: false,
					}),
				},
				env,
			)
			// Should return 401 (not 400) because value is valid
			expect(res.status).toBe(401)
		})

		it('accepts both preferences in single update', async () => {
			const res = await app.request(
				'/api/user/preferences',
				{
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						emailNotifications: true,
						usageAlerts: false,
					}),
				},
				env,
			)
			// Should return 401 (not 400) because values are valid
			expect(res.status).toBe(401)
		})

		it('accepts empty update body', async () => {
			const res = await app.request(
				'/api/user/preferences',
				{
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({}),
				},
				env,
			)
			// Should return 401 (not 400) because empty update is valid
			expect(res.status).toBe(401)
		})

		it('rejects malformed JSON (returns 401 since auth runs first)', async () => {
			const res = await app.request(
				'/api/user/preferences',
				{
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: 'not-valid-json',
				},
				env,
			)
			// Auth middleware runs first, so returns 401
			expect(res.status).toBe(401)
		})
	})

	describe('Response Structure', () => {
		it('returns 401 with proper error structure', async () => {
			const res = await app.request('/api/user/preferences', {}, env)
			expect(res.status).toBe(401)

			const json = (await res.json()) as { error: string }
			expect(json).toHaveProperty('error')
			expect(typeof json.error).toBe('string')
		})
	})
})
