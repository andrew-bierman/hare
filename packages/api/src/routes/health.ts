/**
 * Health Check Routes
 *
 * Simple health endpoints at /api/health for compatibility.
 * These proxy to the oRPC health router but maintain the /api/health URL.
 */

import { Hono } from 'hono'
import type { HonoEnv } from '@hare/types'

// =============================================================================
// Types
// =============================================================================

interface ServiceCheck {
	name: string
	status: 'healthy' | 'degraded' | 'unhealthy'
	latencyMs?: number
	message?: string
	error?: string
}

// =============================================================================
// Health Check Helpers
// =============================================================================

const LATENCY_THRESHOLDS = {
	database: 500,
	kv: 200,
	r2: 300,
} as const

async function checkDatabase(db: D1Database): Promise<ServiceCheck> {
	const start = Date.now()
	try {
		const result = await db.prepare('SELECT 1 as health_check').first<{ health_check: number }>()
		const latencyMs = Date.now() - start

		if (result?.health_check === 1) {
			const isDegraded = latencyMs > LATENCY_THRESHOLDS.database
			return {
				name: 'database',
				status: isDegraded ? 'degraded' : 'healthy',
				latencyMs,
				message: isDegraded ? 'High latency detected' : 'Connected',
			}
		}

		return {
			name: 'database',
			status: 'unhealthy',
			latencyMs,
			error: 'Unexpected query result',
		}
	} catch (error) {
		return {
			name: 'database',
			status: 'unhealthy',
			latencyMs: Date.now() - start,
			error: error instanceof Error ? error.message : 'Connection failed',
		}
	}
}

async function checkKV(kv: KVNamespace): Promise<ServiceCheck> {
	const start = Date.now()
	const testKey = '__health_check_test__'

	try {
		await kv.put(testKey, 'ok', { expirationTtl: 60 })
		const value = await kv.get(testKey)
		const latencyMs = Date.now() - start

		if (value === 'ok') {
			const isDegraded = latencyMs > LATENCY_THRESHOLDS.kv
			return {
				name: 'kv',
				status: isDegraded ? 'degraded' : 'healthy',
				latencyMs,
				message: isDegraded ? 'High latency detected' : 'Connected',
			}
		}

		return {
			name: 'kv',
			status: 'unhealthy',
			latencyMs,
			error: 'Read/write verification failed',
		}
	} catch (error) {
		return {
			name: 'kv',
			status: 'unhealthy',
			latencyMs: Date.now() - start,
			error: error instanceof Error ? error.message : 'Connection failed',
		}
	} finally {
		kv.delete(testKey).catch(() => {})
	}
}

async function checkWorkersAI(ai: Ai): Promise<ServiceCheck> {
	const start = Date.now()

	try {
		if (ai && typeof ai.run === 'function') {
			const latencyMs = Date.now() - start
			return {
				name: 'workers_ai',
				status: 'healthy',
				latencyMs,
				message: 'AI binding available',
			}
		}

		return {
			name: 'workers_ai',
			status: 'unhealthy',
			latencyMs: Date.now() - start,
			error: 'AI binding not configured',
		}
	} catch (error) {
		return {
			name: 'workers_ai',
			status: 'unhealthy',
			latencyMs: Date.now() - start,
			error: error instanceof Error ? error.message : 'AI check failed',
		}
	}
}

async function checkR2(r2: R2Bucket): Promise<ServiceCheck> {
	const start = Date.now()

	try {
		await r2.list({ limit: 1 })
		const latencyMs = Date.now() - start
		const isDegraded = latencyMs > LATENCY_THRESHOLDS.r2

		return {
			name: 'r2',
			status: isDegraded ? 'degraded' : 'healthy',
			latencyMs,
			message: isDegraded ? 'High latency detected' : 'Connected',
		}
	} catch (error) {
		return {
			name: 'r2',
			status: 'unhealthy',
			latencyMs: Date.now() - start,
			error: error instanceof Error ? error.message : 'R2 check failed',
		}
	}
}

function determineOverallStatus(services: ServiceCheck[]): 'healthy' | 'degraded' | 'unhealthy' {
	const hasUnhealthy = services.some((s) => s.status === 'unhealthy')
	const hasDegraded = services.some((s) => s.status === 'degraded')

	if (hasUnhealthy) return 'unhealthy'
	if (hasDegraded) return 'degraded'
	return 'healthy'
}

const startTime = Date.now()

// =============================================================================
// Routes
// =============================================================================

const health = new Hono<HonoEnv>()

/**
 * Full system health check
 */
health.get('/', async (c) => {
	const env = c.env

	const serviceChecks = await Promise.all([
		env?.DB
			? checkDatabase(env.DB)
			: { name: 'database', status: 'unhealthy' as const, error: 'DB binding not available' },
		env?.KV
			? checkKV(env.KV)
			: { name: 'kv', status: 'unhealthy' as const, error: 'KV binding not available' },
		env?.AI
			? checkWorkersAI(env.AI)
			: { name: 'workers_ai', status: 'unhealthy' as const, error: 'AI binding not available' },
		env?.R2
			? checkR2(env.R2)
			: { name: 'r2', status: 'unhealthy' as const, error: 'R2 binding not available' },
	])

	const overallStatus = determineOverallStatus(serviceChecks)
	const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000)

	const response = {
		status: overallStatus,
		timestamp: new Date().toISOString(),
		version: '1.0.0',
		uptime: uptimeSeconds,
		services: serviceChecks,
	}

	return c.json(response, overallStatus === 'unhealthy' ? 503 : 200)
})

/**
 * Liveness probe - simple check that service is running
 */
health.get('/live', async (c) => {
	return c.json({ status: 'ok' }, 200)
})

/**
 * Readiness probe - checks critical dependencies (database)
 */
health.get('/ready', async (c) => {
	const env = c.env

	try {
		if (!env?.DB) {
			return c.json({ error: 'Database not configured' }, 503)
		}

		const dbCheck = await checkDatabase(env.DB)

		if (dbCheck.status === 'unhealthy') {
			return c.json({ error: 'Database not ready' }, 503)
		}

		return c.json({
			status: 'ready' as const,
			timestamp: new Date().toISOString(),
		}, 200)
	} catch {
		return c.json({ error: 'Service not ready' }, 503)
	}
})

export default health
