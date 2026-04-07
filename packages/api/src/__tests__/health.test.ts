/**
 * Health check helper tests.
 *
 * NOTE: Full route tests via app.handle() are not possible in the Cloudflare
 * Workers test environment because Elysia uses `new Function()` internally,
 * which is blocked by the Workers sandbox's CSP. These tests cover the
 * underlying health-check logic directly.
 */

import { env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import {
	checkDatabase,
	checkKV,
	determineOverallStatus,
	type ServiceCheck,
} from '../elysia/routes/health'

// Augment the cloudflare:test module with the bindings we use
declare module 'cloudflare:test' {
	interface ProvidedEnv {
		DB: D1Database
		KV: KVNamespace
	}
}

// =============================================================================
// determineOverallStatus
// =============================================================================

describe('determineOverallStatus', () => {
	it('returns healthy when all services are healthy', () => {
		const services: ServiceCheck[] = [
			{ name: 'database', status: 'healthy' },
			{ name: 'kv', status: 'healthy' },
		]
		expect(determineOverallStatus(services)).toBe('healthy')
	})

	it('returns degraded when at least one service is degraded', () => {
		const services: ServiceCheck[] = [
			{ name: 'database', status: 'healthy' },
			{ name: 'kv', status: 'degraded' },
		]
		expect(determineOverallStatus(services)).toBe('degraded')
	})

	it('returns unhealthy when at least one service is unhealthy', () => {
		const services: ServiceCheck[] = [
			{ name: 'database', status: 'healthy' },
			{ name: 'kv', status: 'unhealthy' },
		]
		expect(determineOverallStatus(services)).toBe('unhealthy')
	})

	it('unhealthy takes precedence over degraded', () => {
		const services: ServiceCheck[] = [
			{ name: 'database', status: 'degraded' },
			{ name: 'kv', status: 'unhealthy' },
		]
		expect(determineOverallStatus(services)).toBe('unhealthy')
	})

	it('returns healthy for empty service list', () => {
		expect(determineOverallStatus([])).toBe('healthy')
	})
})

// =============================================================================
// checkDatabase (real D1 binding in Miniflare)
// =============================================================================

describe('checkDatabase', () => {
	it('returns healthy when D1 is available', async () => {
		const result = await checkDatabase(env.DB)
		expect(result.name).toBe('database')
		expect(['healthy', 'degraded']).toContain(result.status)
		expect(typeof result.latencyMs).toBe('number')
		expect(result.latencyMs).toBeGreaterThanOrEqual(0)
	})

	it('returns unhealthy for invalid DB object', async () => {
		const badDb = {
			prepare: () => ({
				first: async () => {
					throw new Error('Connection refused')
				},
			}),
		} as unknown as D1Database

		const result = await checkDatabase(badDb)
		expect(result.name).toBe('database')
		expect(result.status).toBe('unhealthy')
		expect(result.error).toBeDefined()
	})

	it('includes latency in response', async () => {
		const result = await checkDatabase(env.DB)
		expect(result.latencyMs).toBeGreaterThanOrEqual(0)
	})
})

// =============================================================================
// checkKV (mocked KV namespace)
//
// NOTE: Real env.KV cannot be used here because checkKV's finally block has a
// fire-and-forget kv.delete() that outlives the test's isolated storage frame,
// which triggers an AssertionError in vitest-pool-workers. Use mocks instead.
// =============================================================================

describe('checkKV', () => {
	it('returns healthy when KV read/write succeeds', async () => {
		const store = new Map<string, string>()
		const mockKv = {
			put: async (key: string, value: string) => {
				store.set(key, value)
			},
			get: async (key: string) => store.get(key) ?? null,
			delete: async (key: string) => {
				store.delete(key)
			},
		} as unknown as KVNamespace

		const result = await checkKV(mockKv)
		expect(result.name).toBe('kv')
		expect(['healthy', 'degraded']).toContain(result.status)
		expect(typeof result.latencyMs).toBe('number')
		expect(result.latencyMs).toBeGreaterThanOrEqual(0)
	})

	it('returns unhealthy when KV put throws', async () => {
		const mockKv = {
			put: async () => {
				throw new Error('KV unavailable')
			},
			get: async () => null,
			delete: async () => {},
		} as unknown as KVNamespace

		const result = await checkKV(mockKv)
		expect(result.name).toBe('kv')
		expect(result.status).toBe('unhealthy')
		expect(result.error).toBeDefined()
	})

	it('returns unhealthy when KV read returns wrong value', async () => {
		const mockKv = {
			put: async () => {},
			get: async () => 'wrong-value',
			delete: async () => {},
		} as unknown as KVNamespace

		const result = await checkKV(mockKv)
		expect(result.name).toBe('kv')
		expect(result.status).toBe('unhealthy')
		expect(result.error).toBeDefined()
	})
})
