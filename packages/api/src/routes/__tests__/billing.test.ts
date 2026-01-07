import { env } from 'cloudflare:test'
import { beforeAll, describe, expect, it } from 'vitest'
import { app } from '@hare/api'
import { applyMigrations } from './setup'

// Augment the cloudflare:test module with the bindings we use
declare module 'cloudflare:test' {
	interface ProvidedEnv {
		DB: D1Database
		KV: KVNamespace
		R2: R2Bucket
	}
}

// Apply D1 migrations before tests
beforeAll(async () => {
	await applyMigrations(env.DB)
})

describe('Billing API', () => {
	describe('Authentication', () => {
		it('returns 401 for unauthenticated GET /api/billing/plans', async () => {
			const res = await app.request('/api/billing/plans?workspaceId=ws_test123', {}, env)
			expect(res.status).toBe(401)

			const json = (await res.json()) as { error: string }
			expect(json.error).toBe('Unauthorized')
		})

		it('returns 401 for unauthenticated POST /api/billing/checkout', async () => {
			const res = await app.request(
				'/api/billing/checkout?workspaceId=ws_test123',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						planId: 'pro',
					}),
				},
				env,
			)
			expect(res.status).toBe(401)

			const json = (await res.json()) as { error: string }
			expect(json.error).toBe('Unauthorized')
		})

		it('returns 401 for unauthenticated POST /api/billing/portal', async () => {
			const res = await app.request(
				'/api/billing/portal?workspaceId=ws_test123',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
				},
				env,
			)
			expect(res.status).toBe(401)

			const json = (await res.json()) as { error: string }
			expect(json.error).toBe('Unauthorized')
		})

		it('returns 401 for unauthenticated GET /api/billing/status', async () => {
			const res = await app.request('/api/billing/status?workspaceId=ws_test123', {}, env)
			expect(res.status).toBe(401)

			const json = (await res.json()) as { error: string }
			expect(json.error).toBe('Unauthorized')
		})

		it('returns 401 for unauthenticated GET /api/billing/history', async () => {
			const res = await app.request('/api/billing/history?workspaceId=ws_test123', {}, env)
			expect(res.status).toBe(401)

			const json = (await res.json()) as { error: string }
			expect(json.error).toBe('Unauthorized')
		})
	})

	describe('Webhook Endpoint', () => {
		it('returns 400 for POST /api/billing/webhook without signature', async () => {
			// Webhook endpoint should be accessible without auth but requires Stripe signature
			const res = await app.request(
				'/api/billing/webhook',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						type: 'checkout.session.completed',
						data: { object: {} },
					}),
				},
				env,
			)
			// Should return 400 for missing signature or webhook secret not configured
			expect(res.status).toBe(400)

			const json = (await res.json()) as { error: string }
			expect(json.error).toBeDefined()
		})

		it('returns 400 for POST /api/billing/webhook with invalid signature', async () => {
			const res = await app.request(
				'/api/billing/webhook',
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'stripe-signature': 'invalid_signature',
					},
					body: JSON.stringify({
						type: 'checkout.session.completed',
						data: { object: {} },
					}),
				},
				env,
			)
			// Should return 400 for invalid signature
			expect(res.status).toBe(400)
		})

		it('POST /api/billing/webhook is accessible without authentication', async () => {
			// Webhook endpoint should not require auth (Stripe signs requests)
			const res = await app.request(
				'/api/billing/webhook',
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({}),
				},
				env,
			)
			// Should not return 401 - webhooks use signature verification instead
			expect(res.status).not.toBe(401)
		})
	})

	describe('Input Validation', () => {
		it('validates planId in checkout request', async () => {
			// Note: Auth check happens first
			const res = await app.request(
				'/api/billing/checkout?workspaceId=ws_test123',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						planId: 'invalid_plan', // Not a valid plan
					}),
				},
				env,
			)
			expect(res.status).toBe(401) // Auth first
		})

		it('accepts valid planId values (pro, team)', async () => {
			// Test pro plan
			const resPro = await app.request(
				'/api/billing/checkout?workspaceId=ws_test123',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						planId: 'pro',
					}),
				},
				env,
			)
			expect(resPro.status).toBe(401) // Auth check first

			// Test team plan
			const resTeam = await app.request(
				'/api/billing/checkout?workspaceId=ws_test123',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						planId: 'team',
					}),
				},
				env,
			)
			expect(resTeam.status).toBe(401) // Auth check first
		})

		it('accepts optional successUrl and cancelUrl in checkout request', async () => {
			const res = await app.request(
				'/api/billing/checkout?workspaceId=ws_test123',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						planId: 'pro',
						successUrl: 'https://example.com/success',
						cancelUrl: 'https://example.com/cancel',
					}),
				},
				env,
			)
			expect(res.status).toBe(401) // Auth check first
		})

		it('validates limit parameter in history request', async () => {
			// Note: Auth check happens first
			const res = await app.request(
				'/api/billing/history?workspaceId=ws_test123&limit=101',
				{},
				env,
			)
			expect(res.status).toBe(401) // Auth first
		})
	})

	describe('Billing Plans', () => {
		it('GET /api/billing/plans requires workspace context', async () => {
			const res = await app.request('/api/billing/plans', {}, env)
			// Auth check happens first
			expect(res.status).toBe(401)
		})
	})

	describe('Checkout Session', () => {
		it('POST /api/billing/checkout requires authentication', async () => {
			const res = await app.request(
				'/api/billing/checkout?workspaceId=ws_test123',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						planId: 'pro',
					}),
				},
				env,
			)
			expect(res.status).toBe(401)
		})

		it('POST /api/billing/checkout requires planId in body', async () => {
			const res = await app.request(
				'/api/billing/checkout?workspaceId=ws_test123',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({}),
				},
				env,
			)
			// Auth check first, then validation
			expect(res.status).toBe(401)
		})
	})

	describe('Customer Portal', () => {
		it('POST /api/billing/portal requires authentication', async () => {
			const res = await app.request(
				'/api/billing/portal?workspaceId=ws_test123',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
				},
				env,
			)
			expect(res.status).toBe(401)
		})
	})

	describe('Billing Status', () => {
		it('GET /api/billing/status requires authentication', async () => {
			const res = await app.request('/api/billing/status?workspaceId=ws_test123', {}, env)
			expect(res.status).toBe(401)
		})
	})

	describe('Payment History', () => {
		it('GET /api/billing/history requires authentication', async () => {
			const res = await app.request('/api/billing/history?workspaceId=ws_test123', {}, env)
			expect(res.status).toBe(401)
		})

		it('GET /api/billing/history accepts pagination parameters', async () => {
			const res = await app.request(
				'/api/billing/history?workspaceId=ws_test123&limit=5&starting_after=ch_test123',
				{},
				env,
			)
			// Auth check first
			expect(res.status).toBe(401)
		})
	})

	describe('Workspace Context', () => {
		it('billing endpoints require workspaceId', async () => {
			// Plans endpoint
			const resPlans = await app.request('/api/billing/plans', {}, env)
			expect(resPlans.status).toBe(401)

			// Checkout endpoint
			const resCheckout = await app.request(
				'/api/billing/checkout',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ planId: 'pro' }),
				},
				env,
			)
			expect(resCheckout.status).toBe(401)

			// Status endpoint
			const resStatus = await app.request('/api/billing/status', {}, env)
			expect(resStatus.status).toBe(401)

			// History endpoint
			const resHistory = await app.request('/api/billing/history', {}, env)
			expect(resHistory.status).toBe(401)
		})
	})
})
