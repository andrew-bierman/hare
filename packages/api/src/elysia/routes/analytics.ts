/**
 * Analytics Routes
 *
 * Comprehensive analytics with time series, agent breakdown, and model breakdown.
 */

import { getModelName } from '@hare/config'
import { agents, usage } from '@hare/db/schema'
import { and, eq, gte, lte, sql } from 'drizzle-orm'
import { Elysia } from 'elysia'
import { writePlugin } from '../context'

// =============================================================================
// Schemas
// =============================================================================

const GroupByValues = ['day', 'week', 'month'] as const
type GroupBy = (typeof GroupByValues)[number]

// Pre-defined SQL date formats - avoids sql.raw() with dynamic strings
const DATE_FORMAT_SQL = {
	day: "DATE(createdAt, 'unixepoch')",
	week: "DATE(createdAt, 'unixepoch', 'weekday 0', '-6 days')",
	month: "DATE(createdAt, 'unixepoch', 'start of month')",
} as const satisfies Record<GroupBy, string>

// =============================================================================
// Routes
// =============================================================================

export const analyticsRoutes = new Elysia({ prefix: '/analytics', name: 'analytics-routes' })
	.use(writePlugin)

	// Get comprehensive analytics data
	.get(
		'/',
		async ({ db, workspaceId, query }) => {
			const startDate = query?.startDate as string | undefined
			const endDate = query?.endDate as string | undefined
			const agentId = query?.agentId as string | undefined
			const groupBy = (query?.groupBy as GroupBy) || 'day'

			const defaultStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
			const defaultEndDate = new Date().toISOString()

			// Build query conditions
			const conditions = [eq(usage.workspaceId, workspaceId)]
			if (startDate) {
				conditions.push(gte(usage.createdAt, new Date(startDate)))
			}
			if (endDate) {
				conditions.push(lte(usage.createdAt, new Date(endDate)))
			}
			if (agentId) {
				conditions.push(eq(usage.agentId, agentId))
			}

			// Get summary statistics
			const [summary] = await db
				.select({
					totalRequests: sql<number>`COUNT(*)`,
					totalInputTokens: sql<number>`COALESCE(SUM(${usage.inputTokens}), 0)`,
					totalOutputTokens: sql<number>`COALESCE(SUM(${usage.outputTokens}), 0)`,
					totalTokens: sql<number>`COALESCE(SUM(${usage.totalTokens}), 0)`,
					totalCost: sql<number>`COALESCE(SUM(${usage.cost}), 0)`,
					avgLatencyMs: sql<number>`COALESCE(AVG(json_extract(${usage.metadata}, '$.duration')), 0)`,
				})
				.from(usage)
				.where(and(...conditions))

			// Get date format SQL from pre-defined map
			const validGroupBy = GroupByValues.includes(groupBy as GroupBy) ? (groupBy as GroupBy) : 'day'
			const dateFormatSql = DATE_FORMAT_SQL[validGroupBy]

			// Get time series data
			const timeSeries = await db
				.select({
					date: sql<string>`${sql.raw(dateFormatSql)}`,
					inputTokens: sql<number>`COALESCE(SUM(${usage.inputTokens}), 0)`,
					outputTokens: sql<number>`COALESCE(SUM(${usage.outputTokens}), 0)`,
					totalTokens: sql<number>`COALESCE(SUM(${usage.totalTokens}), 0)`,
					requests: sql<number>`COUNT(*)`,
					cost: sql<number>`COALESCE(SUM(${usage.cost}), 0)`,
					avgLatency: sql<number>`COALESCE(AVG(json_extract(${usage.metadata}, '$.duration')), 0)`,
				})
				.from(usage)
				.where(and(...conditions))
				.groupBy(sql.raw(dateFormatSql))
				.orderBy(sql.raw(dateFormatSql))

			// Get usage by agent
			const byAgent = await db
				.select({
					agentId: usage.agentId,
					agentName: agents.name,
					requests: sql<number>`COUNT(*)`,
					inputTokens: sql<number>`COALESCE(SUM(${usage.inputTokens}), 0)`,
					outputTokens: sql<number>`COALESCE(SUM(${usage.outputTokens}), 0)`,
					totalTokens: sql<number>`COALESCE(SUM(${usage.totalTokens}), 0)`,
					cost: sql<number>`COALESCE(SUM(${usage.cost}), 0)`,
				})
				.from(usage)
				.leftJoin(agents, eq(usage.agentId, agents.id))
				.where(and(...conditions))
				.groupBy(usage.agentId, agents.name)
				.orderBy(sql<number>`SUM(${usage.totalTokens}) DESC`)

			// Get usage by model
			const byModel = await db
				.select({
					model: sql<string>`json_extract(${usage.metadata}, '$.model')`,
					requests: sql<number>`COUNT(*)`,
					inputTokens: sql<number>`COALESCE(SUM(${usage.inputTokens}), 0)`,
					outputTokens: sql<number>`COALESCE(SUM(${usage.outputTokens}), 0)`,
					totalTokens: sql<number>`COALESCE(SUM(${usage.totalTokens}), 0)`,
					cost: sql<number>`COALESCE(SUM(${usage.cost}), 0)`,
				})
				.from(usage)
				.where(and(...conditions))
				.groupBy(sql`json_extract(${usage.metadata}, '$.model')`)
				.orderBy(sql<number>`SUM(${usage.totalTokens}) DESC`)

			return {
				summary: {
					totalRequests: summary?.totalRequests || 0,
					totalInputTokens: summary?.totalInputTokens || 0,
					totalOutputTokens: summary?.totalOutputTokens || 0,
					totalTokens: summary?.totalTokens || 0,
					totalCost: (summary?.totalCost || 0) / 100,
					avgLatencyMs: Math.round(summary?.avgLatencyMs || 0),
				},
				timeSeries: timeSeries.map((d) => ({
					date: d.date,
					inputTokens: d.inputTokens,
					outputTokens: d.outputTokens,
					totalTokens: d.totalTokens,
					requests: d.requests,
					cost: d.cost / 100,
					avgLatency: Math.round(d.avgLatency),
				})),
				byAgent: byAgent.map((a) => ({
					agentId: a.agentId || 'unknown',
					agentName: a.agentName || 'Unknown Agent',
					requests: a.requests,
					inputTokens: a.inputTokens,
					outputTokens: a.outputTokens,
					totalTokens: a.totalTokens,
					cost: a.cost / 100,
				})),
				byModel: byModel.map((m) => ({
					model: m.model || 'unknown',
					modelName: getModelName(m.model || ''),
					requests: m.requests,
					inputTokens: m.inputTokens,
					outputTokens: m.outputTokens,
					totalTokens: m.totalTokens,
					cost: m.cost / 100,
				})),
				period: {
					startDate: startDate || defaultStartDate,
					endDate: endDate || defaultEndDate,
				},
			}
		},
		{ writeAccess: true },
	)
