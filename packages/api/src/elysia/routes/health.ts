/**
 * Health Check Routes
 *
 * Public endpoints for system health monitoring.
 */

import { getErrorMessage } from '@hare/checks'
import { Elysia } from 'elysia'
import { cfContext } from '../context'

// =============================================================================
// Health Check Helpers
// =============================================================================

export interface ServiceCheck {
	name: string
	status: 'healthy' | 'degraded' | 'unhealthy'
	latencyMs?: number
	message?: string
	error?: string
}

const LATENCY_THRESHOLDS = {
	database: 500,
	kv: 200,
	r2: 300,
} as const

export async function checkDatabase(db: D1Database): Promise<ServiceCheck> {
	const start = Date.now()
	try {
		const result = await db.prepare('SELECT 1 as health_check').first()
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
		return { name: 'database', status: 'unhealthy', latencyMs, error: 'Unexpected query result' }
	} catch (error) {
		return {
			name: 'database',
			status: 'unhealthy',
			latencyMs: Date.now() - start,
			error: getErrorMessage(error) || 'Connection failed',
		}
	}
}

export async function checkKV(kv: KVNamespace): Promise<ServiceCheck> {
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
		return { name: 'kv', status: 'unhealthy', latencyMs, error: 'Read/write verification failed' }
	} catch (error) {
		return {
			name: 'kv',
			status: 'unhealthy',
			latencyMs: Date.now() - start,
			error: getErrorMessage(error) || 'Connection failed',
		}
	} finally {
		kv.delete(testKey).catch(() => {
			// empty
		})
	}
}

export async function checkWorkersAI(ai: Ai): Promise<ServiceCheck> {
	const start = Date.now()
	try {
		if (ai && typeof ai.run === 'function') {
			return {
				name: 'workers_ai',
				status: 'healthy',
				latencyMs: Date.now() - start,
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
			error: getErrorMessage(error) || 'AI check failed',
		}
	}
}

export async function checkR2(r2: R2Bucket): Promise<ServiceCheck> {
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
			error: getErrorMessage(error) || 'R2 check failed',
		}
	}
}

export function determineOverallStatus(services: ServiceCheck[]): 'healthy' | 'degraded' | 'unhealthy' {
	if (services.some((s) => s.status === 'unhealthy')) return 'unhealthy'
	if (services.some((s) => s.status === 'degraded')) return 'degraded'
	return 'healthy'
}

const startTime = Date.now()

// =============================================================================
// Routes
// =============================================================================

export const healthRoutes = new Elysia({ prefix: '/health', name: 'health-routes' })
	.use(cfContext)
	.get('/status', async ({ cfEnv }) => {
		const serviceChecks = await Promise.all([
			cfEnv?.DB
				? checkDatabase(cfEnv.DB)
				: { name: 'database', status: 'unhealthy' as const, error: 'DB binding not available' },
			cfEnv?.KV
				? checkKV(cfEnv.KV)
				: { name: 'kv', status: 'unhealthy' as const, error: 'KV binding not available' },
			cfEnv?.AI
				? checkWorkersAI(cfEnv.AI)
				: { name: 'workers_ai', status: 'unhealthy' as const, error: 'AI binding not available' },
			cfEnv?.R2
				? checkR2(cfEnv.R2)
				: { name: 'r2', status: 'unhealthy' as const, error: 'R2 binding not available' },
		])

		return {
			status: determineOverallStatus(serviceChecks),
			timestamp: new Date().toISOString(),
			version: '2.0.0',
			uptime: Math.floor((Date.now() - startTime) / 1000),
			services: serviceChecks,
		}
	})
	.get('/live', () => ({ status: 'ok' as const }))
	.get('/ready', async ({ cfEnv }) => {
		try {
			if (!cfEnv?.DB) return { error: 'Database not configured' }
			const dbCheck = await checkDatabase(cfEnv.DB)
			if (dbCheck.status === 'unhealthy') return { error: 'Database not ready' }
			return { status: 'ready' as const, timestamp: new Date().toISOString() }
		} catch {
			return { error: 'Service not ready' }
		}
	})
