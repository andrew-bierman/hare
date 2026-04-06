/**
 * Health Check Router (oRPC)
 *
 * Public endpoints for system health monitoring.
 * Used by container orchestration and monitoring tools.
 */

import { getErrorMessage } from '@hare/checks'
import { z } from 'zod'
import { publicProcedure } from '../base'

// =============================================================================
// Schemas
// =============================================================================

const serviceStatusSchema = z.enum(['healthy', 'degraded', 'unhealthy'])

const serviceCheckSchema = z.object({
	name: z.string(),
	status: serviceStatusSchema,
	latencyMs: z.number().optional(),
	message: z.string().optional(),
	error: z.string().optional(),
})

const healthResponseSchema = z.object({
	status: serviceStatusSchema,
	timestamp: z.string(),
	version: z.string(),
	uptime: z.number(),
	services: z.array(serviceCheckSchema),
})

// =============================================================================
// Health Check Helpers
// =============================================================================

interface ServiceCheck {
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

async function checkDatabase(db: D1Database): Promise<ServiceCheck> {
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
			error: getErrorMessage(error),
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
			error: getErrorMessage(error),
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
			error: getErrorMessage(error),
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
			error: getErrorMessage(error),
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
// Procedures
// =============================================================================

/**
 * Full system health check with all services
 */
const status = publicProcedure
	.route({ method: 'GET', path: '/health' })
	.output(healthResponseSchema)
	.handler(async ({ context }) => {
		const { env } = context

		const serviceChecks = await Promise.all([
			env?.DB
				? checkDatabase(env.DB)
				: { name: 'database', status: 'unhealthy' as const, error: 'DB binding not available' },
			env?.KV
				? checkKV(env.KV)
				: { name: 'kv', status: 'unhealthy' as const, error: 'KV binding not available' },
			env?.AI
				? checkWorkersAI(env.AI)
				: {
						name: 'workers_ai',
						status: 'unhealthy' as const,
						error: 'AI binding not available',
					},
			env?.R2
				? checkR2(env.R2)
				: { name: 'r2', status: 'unhealthy' as const, error: 'R2 binding not available' },
		])

		const overallStatus = determineOverallStatus(serviceChecks)
		const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000)

		return {
			status: overallStatus,
			timestamp: new Date().toISOString(),
			version: '1.0.0',
			uptime: uptimeSeconds,
			services: serviceChecks,
		}
	})

/**
 * Liveness probe - simple check that service is running
 */
const live = publicProcedure
	.route({ method: 'GET', path: '/health/live' })
	.output(z.object({ status: z.literal('ok') }))
	.handler(async () => {
		return { status: 'ok' as const }
	})

/**
 * Readiness probe - checks critical dependencies (database)
 */
const ready = publicProcedure
	.route({ method: 'GET', path: '/health/ready' })
	.output(
		z.union([
			z.object({ status: z.literal('ready'), timestamp: z.string() }),
			z.object({ error: z.string() }),
		]),
	)
	.handler(async ({ context }) => {
		const { env } = context

		try {
			if (!env?.DB) {
				return { error: 'Database not configured' }
			}

			const dbCheck = await checkDatabase(env.DB)

			if (dbCheck.status === 'unhealthy') {
				return { error: 'Database not ready' }
			}

			return {
				status: 'ready' as const,
				timestamp: new Date().toISOString(),
			}
		} catch {
			return { error: 'Service not ready' }
		}
	})

// =============================================================================
// Export
// =============================================================================

export const healthRouter = {
	status,
	live,
	ready,
}
