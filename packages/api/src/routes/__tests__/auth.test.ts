import { env } from 'cloudflare:test'
import { beforeAll, describe, expect, it } from 'vitest'
import { app } from '@hare/api'
import { applyMigrations } from './setup'

// Apply D1 migrations before tests
beforeAll(async () => {
	await applyMigrations(env.DB)
})

describe('Auth API', () => {
	describe('GET /api/auth/providers', () => {
		it('returns available OAuth providers without authentication', async () => {
			const res = await app.request('/api/auth/providers', {}, env)
			expect(res.status).toBe(200)

			const json = (await res.json()) as {
				providers: { google: boolean; github: boolean }
			}
			expect(json).toHaveProperty('providers')
			expect(json.providers).toHaveProperty('google')
			expect(json.providers).toHaveProperty('github')
		})
	})

	describe('GET /api/auth/session', () => {
		it('returns 404 for session endpoint when route not enabled', async () => {
			const res = await app.request('/api/auth/session', {}, env)
			// Better Auth returns 404 for /session, use /get-session instead
			expect(res.status).toBe(404)
		})
	})

	describe('GET /api/auth/get-session', () => {
		it('returns 200 for unauthenticated request', async () => {
			const res = await app.request('/api/auth/get-session', {}, env)
			// Should return 200 - may return null session or empty object
			expect(res.status).toBe(200)
		})
	})

	describe('POST /api/auth/sign-in/email', () => {
		it('returns error for invalid email format', async () => {
			const res = await app.request(
				'/api/auth/sign-in/email',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						email: 'invalid-email',
						password: 'testpassword123',
					}),
				},
				env,
			)
			// Better Auth typically returns 400 or validation error for invalid input
			expect([400, 422].includes(res.status) || res.status >= 400).toBe(true)
		})

		it('returns error for missing password', async () => {
			const res = await app.request(
				'/api/auth/sign-in/email',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						email: 'test@example.com',
					}),
				},
				env,
			)
			// Should fail validation
			expect(res.status >= 400).toBe(true)
		})

		it('returns error for non-existent user', async () => {
			const res = await app.request(
				'/api/auth/sign-in/email',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						email: 'nonexistent@example.com',
						password: 'testpassword123',
					}),
				},
				env,
			)
			// Should return auth error (401 or 400)
			expect(res.status >= 400).toBe(true)
		})
	})

	describe('POST /api/auth/sign-up/email', () => {
		it('returns error for invalid email format', async () => {
			const res = await app.request(
				'/api/auth/sign-up/email',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						email: 'invalid-email',
						password: 'testpassword123',
						name: 'Test User',
					}),
				},
				env,
			)
			// Should fail validation
			expect(res.status >= 400).toBe(true)
		})

		it('returns error for password that is too short', async () => {
			const res = await app.request(
				'/api/auth/sign-up/email',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						email: 'test@example.com',
						password: '123', // Too short
						name: 'Test User',
					}),
				},
				env,
			)
			// Should fail validation
			expect(res.status >= 400).toBe(true)
		})

		it('returns error for missing required fields', async () => {
			const res = await app.request(
				'/api/auth/sign-up/email',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({}),
				},
				env,
			)
			// Should fail validation
			expect(res.status >= 400).toBe(true)
		})
	})

	describe('POST /api/auth/sign-out', () => {
		it('handles sign-out request without session gracefully', async () => {
			const res = await app.request(
				'/api/auth/sign-out',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
				},
				env,
			)
			// Should not crash, may return success or error depending on implementation
			expect([200, 401, 400].includes(res.status)).toBe(true)
		})
	})

	describe('OAuth Routes', () => {
		it('GET /api/auth/sign-in/google returns 404 when not configured', async () => {
			const res = await app.request('/api/auth/sign-in/google', {}, env)
			// Returns 404 when OAuth provider is not configured
			expect(res.status).toBe(404)
		})

		it('GET /api/auth/sign-in/github returns 404 when not configured', async () => {
			const res = await app.request('/api/auth/sign-in/github', {}, env)
			// Returns 404 when OAuth provider is not configured
			expect(res.status).toBe(404)
		})
	})
})
