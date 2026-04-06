/**
 * oRPC Analytics Router
 *
 * Handles comprehensive analytics with full type safety.
 */

import { CURRENCY, getModelName } from '@hare/config'
import { agents, usage } from '@hare/db/schema'
import { and, eq, gte, lte, sql } from 'drizzle-orm'
import { z } from 'zod'
import { requireWrite } from '../base'

// =============================================================================
// Type-Safe Schemas
// =============================================================================

const TimeSeriesDataSchema = z.object({
	date: z.string(),
	inputTokens: z.number(),
	outputTokens: z.number(),
	totalTokens: z.number(),
	requests: z.number(),
	cost: z.number(),
	avgLatency: z.number(),
})

const AgentBreakdownSchema = z.object({
	agentId: z.string(),
	agentName: z.string(),
	requests: z.number(),
	inputTokens: z.number(),
	outputTokens: z.number(),
	totalTokens: z.number(),
	cost: z.number(),
})

const ModelBreakdownSchema = z.object({
	model: z.string(),
	modelName: z.string(),
	requests: z.number(),
	inputTokens: z.number(),
	outputTokens: z.number(),
	totalTokens: z.number(),
	cost: z.number(),
})

const AnalyticsSummarySchema = z.object({
	totalRequests: z.number(),
	totalInputTokens: z.number(),
	totalOutputTokens: z.number(),
	totalTokens: z.number(),
	totalCost: z.number(),
	avgLatencyMs: z.number(),
})

const AnalyticsResponseSchema = z.object({
	summary: AnalyticsSummarySchema,
	timeSeries: z.array(TimeSeriesDataSchema),
	byAgent: z.array(AgentBreakdownSchema),
	byModel: z.array(ModelBreakdownSchema),
	period: z.object({
		startDate: z.string(),
		endDate: z.string(),
	}),
})

const GroupByValues = ['day', 'week', 'month'] as const
const GroupBySchema = z.enum(GroupByValues)
type GroupBy = (typeof GroupByValues)[number]

// Pre-defined SQL date formats - avoids sql.raw() with dynamic strings
const DATE_FORMAT_SQL = {
	day: "DATE(createdAt, 'unixepoch')",
	week: "DATE(createdAt, 'unixepoch', 'weekday 0', '-6 days')",
	month: "DATE(createdAt, 'unixepoch', 'start of month')",
} as const satisfies Record<GroupBy, string>

const AnalyticsQueryInputSchema = z.object({
	startDate: z.string().optional(),
	endDate: z.string().optional(),
	agentId: z.string().optional(),
	groupBy: GroupBySchema.optional().default('day'),
})

// =============================================================================
// Procedures
// =============================================================================

/**
 * Get comprehensive analytics data
 */
export const get = requireWrite
	.route({ method: 'GET', path: '/analytics' })
	.input(AnalyticsQueryInputSchema)
	.output(AnalyticsResponseSchema)
	.handler(async ({ input, context }) => {
		const { db, workspaceId } = context
		const { startDate, endDate, agentId, groupBy = 'day' } = input

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

		// Get date format SQL from pre-defined map (validated by Zod schema)
		const dateFormatSql = DATE_FORMAT_SQL[groupBy]

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
				totalCost: (summary?.totalCost || 0) / CURRENCY.CENTS_PER_DOLLAR,
				avgLatencyMs: Math.round(summary?.avgLatencyMs || 0),
			},
			timeSeries: timeSeries.map((d) => ({
				date: d.date,
				inputTokens: d.inputTokens,
				outputTokens: d.outputTokens,
				totalTokens: d.totalTokens,
				requests: d.requests,
				cost: d.cost / CURRENCY.CENTS_PER_DOLLAR,
				avgLatency: Math.round(d.avgLatency),
			})),
			byAgent: byAgent.map((a) => ({
				agentId: a.agentId || 'unknown',
				agentName: a.agentName || 'Unknown Agent',
				requests: a.requests,
				inputTokens: a.inputTokens,
				outputTokens: a.outputTokens,
				totalTokens: a.totalTokens,
				cost: a.cost / CURRENCY.CENTS_PER_DOLLAR,
			})),
			byModel: byModel.map((m) => ({
				model: m.model || 'unknown',
				modelName: getModelName(m.model || ''),
				requests: m.requests,
				inputTokens: m.inputTokens,
				outputTokens: m.outputTokens,
				totalTokens: m.totalTokens,
				cost: m.cost / CURRENCY.CENTS_PER_DOLLAR,
			})),
			period: {
				startDate: startDate || defaultStartDate,
				endDate: endDate || defaultEndDate,
			},
		}
	})

// =============================================================================
// Router Export
// =============================================================================

export const analyticsRouter = {
	get,
}
