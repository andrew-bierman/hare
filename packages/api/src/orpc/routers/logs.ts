/**
 * oRPC Logs Router
 *
 * Handles request logs with full type safety.
 */

import { z } from 'zod'
import { requireWrite } from '../base'

// =============================================================================
// Type-Safe Schemas
// =============================================================================

const RequestLogSchema = z.object({
	id: z.string(),
	method: z.string(),
	path: z.string(),
	status: z.number(),
	latencyMs: z.number(),
	userId: z.string().nullable(),
	workspaceId: z.string().nullable(),
	agentId: z.string().nullable(),
	userAgent: z.string().nullable(),
	ip: z.string().nullable(),
	timestamp: z.string(),
	error: z.string().nullable(),
})

const LogsQueryInputSchema = z.object({
	userId: z.string().optional(),
	agentId: z.string().optional(),
	status: z.number().optional(),
	startDate: z.string().optional(),
	endDate: z.string().optional(),
	limit: z.number().min(1).max(100).optional().default(50),
	offset: z.number().min(0).optional().default(0),
})

const LogsResponseSchema = z.object({
	logs: z.array(RequestLogSchema),
	total: z.number(),
	limit: z.number(),
	offset: z.number(),
})

const RequestsByDaySchema = z.object({
	date: z.string(),
	requests: z.number(),
	avgLatency: z.number(),
	errors: z.number(),
})

const LogStatsResponseSchema = z.object({
	totalRequests: z.number(),
	avgLatencyMs: z.number(),
	errorRate: z.number(),
	requestsByStatus: z.record(z.string(), z.number()),
	requestsByDay: z.array(RequestsByDaySchema),
})

const LogStatsQueryInputSchema = z.object({
	userId: z.string().optional(),
	agentId: z.string().optional(),
	status: z.number().optional(),
	startDate: z.string().optional(),
	endDate: z.string().optional(),
})

// =============================================================================
// Procedures
// =============================================================================

/**
 * List request logs
 */
export const list = requireWrite
	.route({ method: 'GET', path: '/logs' })
	.input(LogsQueryInputSchema)
	.output(LogsResponseSchema)
	.handler(async ({ input }) => {
		// Note: This requires the getLogs function from middleware/logging
		// For now, return empty results - the actual implementation would call:
		// const result = await getLogs(env, { workspaceId, ...input })

		// Placeholder until logging service is wired up
		return {
			logs: [],
			total: 0,
			limit: input.limit || 50,
			offset: input.offset || 0,
		}
	})

/**
 * Get log statistics
 */
export const getStats = requireWrite
	.route({ method: 'GET', path: '/logs/stats' })
	.input(LogStatsQueryInputSchema)
	.output(LogStatsResponseSchema)
	.handler(async () => {
		// Note: This requires the getLogStats function from middleware/logging
		// For now, return empty results - the actual implementation would call:
		// const stats = await getLogStats(env, { workspaceId, ...input })

		// Placeholder until logging service is wired up
		return {
			totalRequests: 0,
			avgLatencyMs: 0,
			errorRate: 0,
			requestsByStatus: {},
			requestsByDay: [],
		}
	})

// =============================================================================
// Router Export
// =============================================================================

export const logsRouter = {
	list,
	getStats,
}
