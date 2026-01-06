import { env } from 'cloudflare:test'
import { beforeAll, describe, expect, it } from 'vitest'
import { app } from '@hare/api'
import { applyMigrations } from './setup'

// Apply D1 migrations before tests
beforeAll(async () => {
	await applyMigrations(env.DB)
})

describe('Health API', () => {
	describe('GET /api/health', () => {
		it('returns 200 or 503 with health status', async () => {
			const res = await app.request('/api/health', {}, env)

			// Health endpoint should return either 200 (healthy) or 503 (unhealthy)
			expect([200, 503]).toContain(res.status)

			const json = (await res.json()) as {
				status: string
				timestamp: string
				version: string
				uptime: number
				services: Array<{
					name: string
					status: string
					latencyMs?: number
					message?: string
					error?: string
				}>
			}

			// Verify response structure
			expect(json).toHaveProperty('status')
			expect(json).toHaveProperty('timestamp')
			expect(json).toHaveProperty('version')
			expect(json).toHaveProperty('uptime')
			expect(json).toHaveProperty('services')

			// Status should be one of the valid statuses
			expect(['healthy', 'degraded', 'unhealthy']).toContain(json.status)

			// Timestamp should be a valid ISO string
			expect(new Date(json.timestamp).toISOString()).toBe(json.timestamp)

			// Uptime should be a non-negative number
			expect(json.uptime).toBeGreaterThanOrEqual(0)

			// Services should be an array
			expect(Array.isArray(json.services)).toBe(true)
		})

		it('includes database service check', async () => {
			const res = await app.request('/api/health', {}, env)
			const json = (await res.json()) as {
				services: Array<{ name: string; status: string }>
			}

			const dbService = json.services.find((s) => s.name === 'database')
			expect(dbService).toBeDefined()
			expect(['healthy', 'degraded', 'unhealthy']).toContain(dbService?.status)
		})

		it('includes KV service check', async () => {
			const res = await app.request('/api/health', {}, env)
			const json = (await res.json()) as {
				services: Array<{ name: string; status: string }>
			}

			const kvService = json.services.find((s) => s.name === 'kv')
			expect(kvService).toBeDefined()
			expect(['healthy', 'degraded', 'unhealthy']).toContain(kvService?.status)
		})

		it('includes Workers AI service check', async () => {
			const res = await app.request('/api/health', {}, env)
			const json = (await res.json()) as {
				services: Array<{ name: string; status: string }>
			}

			const aiService = json.services.find((s) => s.name === 'workers_ai')
			expect(aiService).toBeDefined()
			expect(['healthy', 'degraded', 'unhealthy']).toContain(aiService?.status)
		})

		it('includes R2 service check', async () => {
			const res = await app.request('/api/health', {}, env)
			const json = (await res.json()) as {
				services: Array<{ name: string; status: string }>
			}

			const r2Service = json.services.find((s) => s.name === 'r2')
			expect(r2Service).toBeDefined()
			expect(['healthy', 'degraded', 'unhealthy']).toContain(r2Service?.status)
		})
	})

	describe('GET /api/health/live', () => {
		it('returns 200 with ok status', async () => {
			const res = await app.request('/api/health/live', {}, env)
			expect(res.status).toBe(200)

			const json = (await res.json()) as { status: string }
			expect(json.status).toBe('ok')
		})

		it('is accessible without authentication', async () => {
			const res = await app.request('/api/health/live', {}, env)
			expect(res.status).toBe(200)
		})
	})

	describe('GET /api/health/ready', () => {
		it('returns 200 with ready status when database is available', async () => {
			const res = await app.request('/api/health/ready', {}, env)

			// Should return 200 if DB is ready, 503 if not
			expect([200, 503]).toContain(res.status)

			if (res.status === 200) {
				const json = (await res.json()) as { status: string; timestamp: string }
				expect(json.status).toBe('ready')
				expect(json).toHaveProperty('timestamp')
				expect(new Date(json.timestamp).toISOString()).toBe(json.timestamp)
			} else {
				const json = (await res.json()) as { error: string }
				expect(json).toHaveProperty('error')
			}
		})

		it('is accessible without authentication', async () => {
			const res = await app.request('/api/health/ready', {}, env)
			// Should not return 401
			expect(res.status).not.toBe(401)
		})
	})
})
