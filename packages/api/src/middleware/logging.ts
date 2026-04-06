import { getErrorMessage } from '@hare/checks'
import { config, logger } from '@hare/config'
import { createId } from '@hare/db'
import type { CloudflareEnv, HonoEnv } from '@hare/types'
import type { Context, Next } from 'hono'

// =============================================================================
// Types
// =============================================================================

/**
 * Request log entry stored in KV/D1.
 */
export interface RequestLog {
	id: string
	method: string
	path: string
	status: number
	latencyMs: number
	userId: string | null
	workspaceId: string | null
	agentId: string | null
	userAgent: string | null
	ip: string | null
	timestamp: string
	error: string | null
}

export interface GetLogKeyOptions {
	/** Workspace ID (null for global) */
	workspaceId: string | null
	/** Log timestamp */
	timestamp: string
	/** Log ID */
	id: string
}

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Generate a KV key for a request log.
 */
function getLogKey(options: GetLogKeyOptions): string {
	const { workspaceId, timestamp, id } = options
	const ws = workspaceId || 'global'
	return `${config.logging.keyPrefix}${ws}:${timestamp}:${id}`
}

/**
 * Extract user ID from context if available.
 */
function getUserId(c: Context<HonoEnv>): string | null {
	try {
		const user = c.get('user' as never) as { id?: string } | null | undefined
		return user?.id || null
	} catch {
		return null
	}
}

/**
 * Extract workspace ID from context or query params.
 */
function getWorkspaceId(c: Context<HonoEnv>): string | null {
	try {
		const workspace = c.get('workspace' as never) as { id?: string } | null | undefined
		if (workspace?.id) return workspace.id
	} catch {
		// Not in workspace context
	}

	// Try query params
	const workspaceId = c.req.query('workspaceId')
	return workspaceId || null
}

/**
 * Extract agent ID from path or query params.
 */
function getAgentId(c: Context<HonoEnv>): string | null {
	// Try path params (e.g., /api/agents/:id)
	const path = c.req.path
	const agentMatch = path.match(/\/agents\/([^/]+)/)
	if (agentMatch?.[1]) return agentMatch[1]

	// Try query params
	const agentId = c.req.query('agentId')
	return agentId || null
}

/**
 * Store a request log in KV.
 */
async function storeLog(env: CloudflareEnv, log: RequestLog): Promise<void> {
	if (!env.KV) {
		logger.warn('KV binding not available, skipping log storage')
		return
	}

	try {
		const key = getLogKey({ workspaceId: log.workspaceId, timestamp: log.timestamp, id: log.id })
		await env.KV.put(key, JSON.stringify(log), { expirationTtl: config.logging.ttlSeconds })

		// Also maintain a recent logs list for the workspace
		const listKey = `${config.logging.keyPrefix}list:${log.workspaceId || 'global'}`
		const existing = await env.KV.get(listKey)
		const logIds: string[] = existing ? JSON.parse(existing) : []

		// Add new log ID and keep only the most recent
		logIds.unshift(log.id)
		if (logIds.length > config.logging.batchSize) {
			logIds.pop()
		}

		await env.KV.put(listKey, JSON.stringify(logIds), { expirationTtl: config.logging.ttlSeconds })
	} catch (error) {
		logger.error('Failed to store request log:', error)
	}
}

/**
 * Request logging middleware.
 *
 * Logs request method, path, status, latency, user_id, workspace_id, and agent_id.
 * Stores logs in KV for retrieval.
 */
export async function loggingMiddleware(
	c: Context<HonoEnv>,
	next: Next,
): Promise<Response | undefined> {
	const startTime = Date.now()
	const logId = createId()

	// Store start time in context for later access
	c.set('requestStartTime' as never, startTime)
	c.set('requestLogId' as never, logId)

	let error: string | null = null
	let shouldSkipLogging = false

	try {
		await next()
	} catch (err) {
		error = getErrorMessage(err)
		throw err
	} finally {
		const endTime = Date.now()
		const latencyMs = endTime - startTime

		// Skip logging for health checks and static assets
		const path = c.req.path
		shouldSkipLogging =
			path.includes('/health') || path.includes('/_next') || path.includes('/static')

		if (!shouldSkipLogging) {
			const log: RequestLog = {
				id: logId,
				method: c.req.method,
				path: path,
				status: c.res?.status || 0,
				latencyMs,
				userId: getUserId(c),
				workspaceId: getWorkspaceId(c),
				agentId: getAgentId(c),
				userAgent: c.req.header('user-agent') || null,
				ip: c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || null,
				timestamp: new Date().toISOString(),
				error,
			}

			// Store log asynchronously (don't block response)
			// Note: executionCtx may not be available in test environments
			try {
				c.executionCtx?.waitUntil(storeLog(c.env, log))
			} catch {
				// In test environment without ExecutionContext, skip logging
				// to avoid isolated storage issues with Vitest
			}
		}
	}

	return undefined
}

/**
 * Query logs from KV.
 */
export interface LogQueryParams {
	workspaceId?: string
	userId?: string
	agentId?: string
	status?: number
	startDate?: string
	endDate?: string
	limit?: number
	offset?: number
}

/**
 * Retrieve request logs from KV.
 */
export async function getLogs(
	env: CloudflareEnv,
	params: LogQueryParams,
): Promise<{ logs: RequestLog[]; total: number }> {
	if (!env.KV) {
		return { logs: [], total: 0 }
	}

	const workspaceId = params.workspaceId || 'global'
	const limit = Math.min(params.limit || config.logging.defaultLimit, config.logging.maxLimit)
	const offset = params.offset || 0

	try {
		// List all log keys for the workspace
		const prefix = `${config.logging.keyPrefix}${workspaceId}:`
		const list = await env.KV.list({ prefix, limit: config.logging.statsLimit })

		const allLogs: RequestLog[] = []

		// Fetch logs in parallel
		const fetchPromises = list.keys.map(async (key: { name: string }) => {
			const value = await env.KV!.get(key.name)
			if (value) {
				return JSON.parse(value) as RequestLog
			}
			return null
		})

		const results = await Promise.all(fetchPromises)

		for (const log of results) {
			if (!log) continue

			// Apply filters
			if (params.userId && log.userId !== params.userId) continue
			if (params.agentId && log.agentId !== params.agentId) continue
			if (params.status && log.status !== params.status) continue

			if (params.startDate) {
				const start = new Date(params.startDate)
				const logDate = new Date(log.timestamp)
				if (logDate < start) continue
			}

			if (params.endDate) {
				const end = new Date(params.endDate)
				const logDate = new Date(log.timestamp)
				if (logDate > end) continue
			}

			allLogs.push(log)
		}

		// Sort by timestamp descending
		allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

		// Apply pagination
		const paginatedLogs = allLogs.slice(offset, offset + limit)

		return { logs: paginatedLogs, total: allLogs.length }
	} catch (error) {
		logger.error('Failed to retrieve logs:', error)
		return { logs: [], total: 0 }
	}
}

/**
 * Get aggregated stats from logs.
 */
export interface LogStats {
	totalRequests: number
	avgLatencyMs: number
	errorRate: number
	requestsByStatus: Record<number, number>
	requestsByDay: Array<{ date: string; requests: number; avgLatency: number; errors: number }>
}

/**
 * Calculate stats from logs.
 */
export async function getLogStats(env: CloudflareEnv, params: LogQueryParams): Promise<LogStats> {
	const { logs } = await getLogs(env, { ...params, limit: config.logging.statsLimit })

	const stats: LogStats = {
		totalRequests: logs.length,
		avgLatencyMs: 0,
		errorRate: 0,
		requestsByStatus: {},
		requestsByDay: [],
	}

	if (logs.length === 0) {
		return stats
	}

	// Calculate totals
	let totalLatency = 0
	let errorCount = 0
	const byDay: Record<string, { requests: number; latency: number; errors: number }> = {}

	for (const log of logs) {
		totalLatency += log.latencyMs
		if (log.status >= 400) errorCount++

		// Count by status
		stats.requestsByStatus[log.status] = (stats.requestsByStatus[log.status] || 0) + 1

		// Group by day
		const day = log.timestamp.split('T')[0] ?? 'unknown'
		if (!byDay[day]) {
			byDay[day] = { requests: 0, latency: 0, errors: 0 }
		}
		byDay[day].requests++
		byDay[day].latency += log.latencyMs
		if (log.status >= 400) byDay[day].errors++
	}

	stats.avgLatencyMs = Math.round(totalLatency / logs.length)
	stats.errorRate = Number(((errorCount / logs.length) * 100).toFixed(2))

	// Convert byDay to array
	stats.requestsByDay = Object.entries(byDay)
		.map(([date, data]) => ({
			date,
			requests: data.requests,
			avgLatency: Math.round(data.latency / data.requests),
			errors: data.errors,
		}))
		.sort((a, b) => a.date.localeCompare(b.date))

	return stats
}
