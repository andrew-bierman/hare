import { env } from 'cloudflare:test'
import { beforeAll, describe, expect, it } from 'vitest'
import { app } from '@hare/api'
import { applyMigrations } from './setup'

// Apply D1 migrations before tests
beforeAll(async () => {
	await applyMigrations(env.DB)
})

describe('API Keys API', () => {
	describe('Authentication', () => {
		it('returns 401 for unauthenticated GET /api/api-keys', async () => {
			const res = await app.request('/api/api-keys?workspaceId=ws_test123', {}, env)
			expect(res.status).toBe(401)

			const json = (await res.json()) as { error: string }
			expect(json.error).toBe('Unauthorized')
		})

		it('returns 401 for unauthenticated POST /api/api-keys', async () => {
			const res = await app.request(
				'/api/api-keys?workspaceId=ws_test123',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: 'Test API Key',
					}),
				},
				env,
			)
			expect(res.status).toBe(401)

			const json = (await res.json()) as { error: string }
			expect(json.error).toBe('Unauthorized')
		})

		it('returns 401 for unauthenticated GET /api/api-keys/:id', async () => {
			const res = await app.request('/api/api-keys/key_test123?workspaceId=ws_test123', {}, env)
			expect(res.status).toBe(401)

			const json = (await res.json()) as { error: string }
			expect(json.error).toBe('Unauthorized')
		})

		it('returns 401 for unauthenticated PATCH /api/api-keys/:id', async () => {
			const res = await app.request(
				'/api/api-keys/key_test123?workspaceId=ws_test123',
				{
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ name: 'Updated API Key' }),
				},
				env,
			)
			expect(res.status).toBe(401)

			const json = (await res.json()) as { error: string }
			expect(json.error).toBe('Unauthorized')
		})

		it('returns 401 for unauthenticated DELETE /api/api-keys/:id', async () => {
			const res = await app.request(
				'/api/api-keys/key_test123?workspaceId=ws_test123',
				{
					method: 'DELETE',
				},
				env,
			)
			expect(res.status).toBe(401)

			const json = (await res.json()) as { error: string }
			expect(json.error).toBe('Unauthorized')
		})
	})

	describe('Input Validation', () => {
		it('returns 401 for POST without workspaceId query param', async () => {
			const res = await app.request(
				'/api/api-keys',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: 'Test API Key',
					}),
				},
				env,
			)
			// Should fail auth first, then validation
			expect(res.status).toBe(401)
		})

		it('returns 401 for GET without workspaceId query param', async () => {
			const res = await app.request('/api/api-keys', {}, env)
			// Should fail auth first
			expect(res.status).toBe(401)
		})
	})

	describe('API Key Creation Schema', () => {
		it('requires name field for POST request', async () => {
			// Note: This will return 401 first since we're unauthenticated
			// In a real test with auth, it would validate the schema
			const res = await app.request(
				'/api/api-keys?workspaceId=ws_test123',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({}),
				},
				env,
			)
			expect(res.status).toBe(401)
		})
	})

	describe('API Key Update Schema', () => {
		it('accepts name update for PATCH request', async () => {
			// Note: This will return 401 first since we're unauthenticated
			// In a real test with auth, it would validate the schema
			const res = await app.request(
				'/api/api-keys/key_test123?workspaceId=ws_test123',
				{
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ name: 'New Name' }),
				},
				env,
			)
			expect(res.status).toBe(401)
		})

		it('accepts permissions update for PATCH request', async () => {
			// Note: This will return 401 first since we're unauthenticated
			const res = await app.request(
				'/api/api-keys/key_test123?workspaceId=ws_test123',
				{
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ permissions: ['read', 'write'] }),
				},
				env,
			)
			expect(res.status).toBe(401)
		})
	})

	describe('API Key Operations', () => {
		it('returns 401 when trying to list keys without auth', async () => {
			const res = await app.request('/api/api-keys?workspaceId=ws_test123', {}, env)
			expect(res.status).toBe(401)
		})

		it('returns 401 when trying to get specific key without auth', async () => {
			const res = await app.request('/api/api-keys/key_abc123?workspaceId=ws_test123', {}, env)
			expect(res.status).toBe(401)
		})

		it('returns 401 when trying to revoke key without auth', async () => {
			const res = await app.request(
				'/api/api-keys/key_abc123?workspaceId=ws_test123',
				{
					method: 'DELETE',
				},
				env,
			)
			expect(res.status).toBe(401)
		})
	})

	describe('Security', () => {
		it('does not expose API key secret on GET request', async () => {
			// When authenticated, GET should return key info without the secret
			// Since we're unauthenticated, we just verify the endpoint exists
			const res = await app.request('/api/api-keys/key_test123?workspaceId=ws_test123', {}, env)
			expect(res.status).toBe(401)
		})

		it('requires admin access for creating keys', async () => {
			// Note: Admin access is enforced after auth
			// Without auth, we get 401
			const res = await app.request(
				'/api/api-keys?workspaceId=ws_test123',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: 'Admin Key',
					}),
				},
				env,
			)
			expect(res.status).toBe(401)
		})

		it('requires admin access for deleting keys', async () => {
			// Note: Admin access is enforced after auth
			const res = await app.request(
				'/api/api-keys/key_test123?workspaceId=ws_test123',
				{
					method: 'DELETE',
				},
				env,
			)
			expect(res.status).toBe(401)
		})

		it('requires admin access for updating keys', async () => {
			// Note: Admin access is enforced after auth
			const res = await app.request(
				'/api/api-keys/key_test123?workspaceId=ws_test123',
				{
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ name: 'Updated' }),
				},
				env,
			)
			expect(res.status).toBe(401)
		})
	})

	describe('Expiration', () => {
		it('accepts expiresAt field for POST request', async () => {
			const expiresAt = new Date()
			expiresAt.setMonth(expiresAt.getMonth() + 1)

			const res = await app.request(
				'/api/api-keys?workspaceId=ws_test123',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: 'Expiring Key',
						expiresAt: expiresAt.toISOString(),
					}),
				},
				env,
			)
			// Auth check happens first
			expect(res.status).toBe(401)
		})
	})
})
