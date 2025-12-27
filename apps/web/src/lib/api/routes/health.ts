import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { getCloudflareEnv } from '../db'
import type { HonoEnv } from '../types'

// =============================================================================
// Health Check Schemas
// =============================================================================

const ServiceStatusSchema = z.enum(['healthy', 'degraded', 'unhealthy'])

const ServiceCheckSchema = z.object({
	name: z.string().describe('Service name'),
	status: ServiceStatusSchema.describe('Service health status'),
	latencyMs: z.number().optional().describe('Check latency in milliseconds'),
	message: z.string().optional().describe('Additional status message'),
	error: z.string().optional().describe('Error message if unhealthy'),
})

const HealthResponseSchema = z.object({
	status: ServiceStatusSchema.describe('Overall system health status'),
	timestamp: z.string().describe('ISO timestamp of health check'),
	version: z.string().describe('API version'),
	uptime: z.number().describe('Process uptime in seconds'),
	services: z.array(ServiceCheckSchema).describe('Individual service health checks'),
})

const ErrorResponseSchema = z.object({
	error: z.string(),
})

// =============================================================================
// Routes
// =============================================================================

const healthRoute = createRoute({
	method: 'get',
	path: '/',
	tags: ['Health'],
	summary: 'Get system health status',
	description:
		'Returns the health status of the API and its dependent services including database, cache, and AI.',
	responses: {
		200: {
			description: 'System is healthy',
			content: {
				'application/json': {
					schema: HealthResponseSchema,
				},
			},
		},
		503: {
			description: 'System is unhealthy',
			content: {
				'application/json': {
					schema: HealthResponseSchema,
				},
			},
		},
	},
})

const livenessRoute = createRoute({
	method: 'get',
	path: '/live',
	tags: ['Health'],
	summary: 'Liveness probe',
	description:
		'Simple liveness check for container orchestration. Returns 200 if the service is running.',
	responses: {
		200: {
			description: 'Service is alive',
			content: {
				'application/json': {
					schema: z.object({
						status: z.literal('ok'),
					}),
				},
			},
		},
	},
})

const readinessRoute = createRoute({
	method: 'get',
	path: '/ready',
	tags: ['Health'],
	summary: 'Readiness probe',
	description: 'Checks if the service is ready to accept traffic. Verifies critical dependencies.',
	responses: {
		200: {
			description: 'Service is ready',
			content: {
				'application/json': {
					schema: z.object({
						status: z.literal('ready'),
						timestamp: z.string(),
					}),
				},
			},
		},
		503: {
			description: 'Service is not ready',
			content: {
				'application/json': {
					schema: ErrorResponseSchema,
				},
			},
		},
	},
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

// Latency thresholds for degraded status (in milliseconds)
// These are based on typical Cloudflare edge performance expectations:
// - D1: 500ms is high for edge-colocated SQLite
// - KV: 200ms is high for global KV reads
// - R2: 300ms is high for bucket operations
const LATENCY_THRESHOLDS = {
	database: 500,
	kv: 200,
	r2: 300,
} as const

async function checkDatabase(db: D1Database): Promise<ServiceCheck> {
	const start = Date.now()
	try {
		// Simple query to verify database connectivity
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
			error: error instanceof Error ? error.message : 'Connection failed',
		}
	}
}

async function checkKV(kv: KVNamespace): Promise<ServiceCheck> {
	const start = Date.now()
	// Use unique key per check to avoid conflicts; 60s TTL ensures cleanup even if delete fails
	const testKey = '__health_check_test__'

	try {
		// Write and read to verify KV is working
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
		// Best-effort cleanup; 60s TTL ensures eventual cleanup if this fails
		kv.delete(testKey).catch(() => {})
	}
}

async function checkWorkersAI(ai: Ai): Promise<ServiceCheck> {
	const start = Date.now()

	try {
		// Use a lightweight model check - just verify the binding exists and responds
		// We don't actually run inference as that would be wasteful
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
		// Verify R2 binding by listing (with limit 1 to minimize overhead)
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

// Track start time for uptime calculation
const startTime = Date.now()

// =============================================================================
// Route Handlers
// =============================================================================

const app = new OpenAPIHono<HonoEnv>()

app.openapi(healthRoute, async (c) => {
	// Try to get env from Hono context, fall back to Cloudflare context for Next.js dev mode
	let env = c.env as CloudflareEnv | undefined
	if (!env?.DB) {
		try {
			env = await getCloudflareEnv(c)
		} catch {
			// Cloudflare env not available
		}
	}

	// Run all health checks in parallel
	const serviceChecks = await Promise.all([
		env?.DB
			? checkDatabase(env.DB)
			: Promise.resolve({
					name: 'database',
					status: 'unhealthy' as const,
					error: 'DB binding not available',
				}),
		env?.KV
			? checkKV(env.KV)
			: Promise.resolve({
					name: 'kv',
					status: 'unhealthy' as const,
					error: 'KV binding not available',
				}),
		env?.AI
			? checkWorkersAI(env.AI)
			: Promise.resolve({
					name: 'workers_ai',
					status: 'unhealthy' as const,
					error: 'AI binding not available',
				}),
		env?.R2
			? checkR2(env.R2)
			: Promise.resolve({
					name: 'r2',
					status: 'unhealthy' as const,
					error: 'R2 binding not available',
				}),
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

	// Return 503 if any critical service is unhealthy
	const statusCode = overallStatus === 'unhealthy' ? 503 : 200
	return c.json(response, statusCode)
})

app.openapi(livenessRoute, (c) => {
	return c.json({ status: 'ok' as const }, 200)
})

app.openapi(readinessRoute, async (c) => {
	const env = c.env

	try {
		// Readiness only checks database connectivity because:
		// 1. Database is the critical dependency for all API operations
		// 2. KV/R2/AI are optional enhancements that shouldn't block traffic
		// 3. Keeps readiness probe fast for Kubernetes health checks
		const dbCheck = await checkDatabase(env.DB)

		if (dbCheck.status === 'unhealthy') {
			return c.json({ error: 'Database not ready' }, 503)
		}

		return c.json(
			{
				status: 'ready' as const,
				timestamp: new Date().toISOString(),
			},
			200,
		)
	} catch {
		return c.json({ error: 'Service not ready' }, 503)
	}
})

export default app
