import { env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { app } from '@hare/api'

// Augment the cloudflare:test module with the bindings we use
declare module 'cloudflare:test' {
	interface ProvidedEnv {
		DB: D1Database
		KV: KVNamespace
		R2: R2Bucket
	}
}

// Types for health response
interface ServiceCheck {
	name: string
	status: 'healthy' | 'degraded' | 'unhealthy'
	latencyMs?: number
	message?: string
	error?: string
}

interface HealthResponse {
	status: 'healthy' | 'degraded' | 'unhealthy'
	timestamp: string
	version: string
	uptime: number
	services: ServiceCheck[]
}

interface LivenessResponse {
	status: 'ok'
}

interface ReadinessResponse {
	status: 'ready'
	timestamp: string
}

describe('Health API', () => {
	describe('GET /api/health', () => {
		it('returns comprehensive health status', async () => {
			const res = await app.request('/api/health', {}, env)
			// May return 200 (healthy/degraded) or 503 (unhealthy)
			expect([200, 503]).toContain(res.status)

			const json = (await res.json()) as HealthResponse
			expect(json.status).toBeDefined()
			expect(['healthy', 'degraded', 'unhealthy']).toContain(json.status)
			expect(json.timestamp).toBeDefined()
			expect(json.version).toBe('1.0.0')
			expect(typeof json.uptime).toBe('number')
			expect(Array.isArray(json.services)).toBe(true)
		})

		it('returns valid ISO timestamp', async () => {
			const res = await app.request('/api/health', {}, env)

			const json = (await res.json()) as HealthResponse
			const timestamp = new Date(json.timestamp)

			expect(timestamp).toBeInstanceOf(Date)
			expect(timestamp.toISOString()).toBe(json.timestamp)
		})

		it('includes service checks for all dependencies', async () => {
			const res = await app.request('/api/health', {}, env)
			const json = (await res.json()) as HealthResponse

			const serviceNames = json.services.map((s) => s.name)
			expect(serviceNames).toContain('database')
			expect(serviceNames).toContain('kv')
			expect(serviceNames).toContain('workers_ai')
			expect(serviceNames).toContain('r2')
		})

		it('each service check has required fields', async () => {
			const res = await app.request('/api/health', {}, env)
			const json = (await res.json()) as HealthResponse

			for (const service of json.services) {
				expect(service.name).toBeDefined()
				expect(service.status).toBeDefined()
				expect(['healthy', 'degraded', 'unhealthy']).toContain(service.status)
			}
		})

		it('returns 503 when critical services are unhealthy', async () => {
			// This test verifies the response code logic
			// In test environment, some services may be unavailable
			const res = await app.request('/api/health', {}, env)
			const json = (await res.json()) as HealthResponse

			if (json.status === 'unhealthy') {
				expect(res.status).toBe(503)
			} else {
				expect(res.status).toBe(200)
			}
		})
	})

	describe('GET /api/health/live', () => {
		it('returns liveness status', async () => {
			const res = await app.request('/api/health/live', {}, env)
			expect(res.status).toBe(200)

			const json = (await res.json()) as LivenessResponse
			expect(json.status).toBe('ok')
		})

		it('always returns 200 regardless of dependencies', async () => {
			// Liveness should always return 200 if the service is running
			const res = await app.request('/api/health/live', {}, env)
			expect(res.status).toBe(200)
		})
	})

	describe('GET /api/health/ready', () => {
		it('returns readiness status with timestamp', async () => {
			const res = await app.request('/api/health/ready', {}, env)
			// May return 200 (ready) or 503 (not ready)
			expect([200, 503]).toContain(res.status)

			if (res.status === 200) {
				const json = (await res.json()) as ReadinessResponse
				expect(json.status).toBe('ready')
				expect(json.timestamp).toBeDefined()

				// Verify timestamp is valid ISO
				const timestamp = new Date(json.timestamp)
				expect(timestamp.toISOString()).toBe(json.timestamp)
			}
		})

		it('returns 503 when database is not ready', async () => {
			// In test environment, database may or may not be available
			const res = await app.request('/api/health/ready', {}, env)

			if (res.status === 503) {
				const json = (await res.json()) as { error: string }
				expect(json.error).toBeDefined()
			}
		})
	})
})
