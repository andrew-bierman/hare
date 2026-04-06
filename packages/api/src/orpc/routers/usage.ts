/**
 * oRPC Usage Router
 *
 * Handles usage statistics with full type safety.
 */

import { agents, usage } from '@hare/db/schema'
import { and, eq, gte, lte, sql } from 'drizzle-orm'
import {
	AgentUsageResponseSchema,
	IdParamSchema,
	UsageQuerySchema,
	UsageResponseSchema,
} from '../../schemas'
import { notFound, requireWrite } from '../base'

// =============================================================================
// Procedures
// =============================================================================

/**
 * Get workspace usage statistics
 */
export const getWorkspaceUsage = requireWrite
	.route({ method: 'GET', path: '/usage' })
	.input(UsageQuerySchema)
	.output(UsageResponseSchema)
	.handler(async ({ input, context }) => {
		const { db, workspaceId } = context
		const { startDate, endDate } = input

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

		// Get aggregated usage data
		const [totals] = await db
			.select({
				totalMessages: sql<number>`COUNT(*)`,
				totalTokensIn: sql<number>`COALESCE(SUM(${usage.inputTokens}), 0)`,
				totalTokensOut: sql<number>`COALESCE(SUM(${usage.outputTokens}), 0)`,
				totalCost: sql<number>`COALESCE(SUM(${usage.cost}), 0)`,
			})
			.from(usage)
			.where(and(...conditions))

		// Get usage by agent with agent names
		const byAgentRaw = await db
			.select({
				agentId: usage.agentId,
				agentName: agents.name,
				messages: sql<number>`COUNT(*)`,
				tokensIn: sql<number>`COALESCE(SUM(${usage.inputTokens}), 0)`,
				tokensOut: sql<number>`COALESCE(SUM(${usage.outputTokens}), 0)`,
				cost: sql<number>`COALESCE(SUM(${usage.cost}), 0)`,
			})
			.from(usage)
			.leftJoin(agents, eq(usage.agentId, agents.id))
			.where(and(...conditions))
			.groupBy(usage.agentId, agents.name)

		// Get usage by day (createdAt is stored as epoch seconds, so use 'unixepoch' modifier)
		const byDay = await db
			.select({
				date: sql<string>`DATE(${usage.createdAt}, 'unixepoch')`,
				messages: sql<number>`COUNT(*)`,
				tokensIn: sql<number>`COALESCE(SUM(${usage.inputTokens}), 0)`,
				tokensOut: sql<number>`COALESCE(SUM(${usage.outputTokens}), 0)`,
				cost: sql<number>`COALESCE(SUM(${usage.cost}), 0)`,
			})
			.from(usage)
			.where(and(...conditions))
			.groupBy(sql`DATE(${usage.createdAt}, 'unixepoch')`)
			.orderBy(sql`DATE(${usage.createdAt}, 'unixepoch')`)

		return {
			usage: {
				totalMessages: totals?.totalMessages ?? 0,
				totalTokensIn: totals?.totalTokensIn ?? 0,
				totalTokensOut: totals?.totalTokensOut ?? 0,
				totalCost: (totals?.totalCost ?? 0) / 100,
				byAgent: byAgentRaw.map((a) => ({
					agentId: a.agentId || 'unknown',
					agentName: a.agentName || 'Unknown Agent',
					messages: a.messages,
					tokensIn: a.tokensIn,
					tokensOut: a.tokensOut,
					cost: a.cost / 100,
				})),
				byDay: byDay.map((d) => ({
					date: d.date,
					messages: d.messages,
					tokensIn: d.tokensIn,
					tokensOut: d.tokensOut,
					cost: d.cost / 100,
				})),
			},
			period: {
				startDate: startDate || defaultStartDate,
				endDate: endDate || defaultEndDate,
			},
		}
	})

/**
 * Get agent usage statistics
 */
export const getAgentUsage = requireWrite
	.route({ method: 'GET', path: '/usage/agents/{id}' })
	.input(IdParamSchema)
	.output(AgentUsageResponseSchema)
	.handler(async ({ input, context }) => {
		const { db, workspaceId } = context
		const { id: agentId } = input

		// Verify agent belongs to workspace
		const [agent] = await db
			.select()
			.from(agents)
			.where(and(eq(agents.id, agentId), eq(agents.workspaceId, workspaceId)))

		if (!agent) notFound('Agent not found')

		// Scope all queries to both agentId AND workspaceId for defense-in-depth
		const agentUsageConditions = and(
			eq(usage.agentId, agentId),
			eq(usage.workspaceId, workspaceId),
		)

		// Get aggregated usage data for specific agent
		const [totals] = await db
			.select({
				totalMessages: sql<number>`COUNT(*)`,
				totalTokensIn: sql<number>`COALESCE(SUM(${usage.inputTokens}), 0)`,
				totalTokensOut: sql<number>`COALESCE(SUM(${usage.outputTokens}), 0)`,
				totalCost: sql<number>`COALESCE(SUM(${usage.cost}), 0)`,
				averageLatency: sql<number>`COALESCE(AVG(json_extract(${usage.metadata}, '$.duration')), 0)`,
			})
			.from(usage)
			.where(agentUsageConditions)

		// Get usage by model
		const byModel = await db
			.select({
				model: sql<string>`json_extract(${usage.metadata}, '$.model')`,
				messages: sql<number>`COUNT(*)`,
				tokensIn: sql<number>`COALESCE(SUM(${usage.inputTokens}), 0)`,
				tokensOut: sql<number>`COALESCE(SUM(${usage.outputTokens}), 0)`,
				cost: sql<number>`COALESCE(SUM(${usage.cost}), 0)`,
			})
			.from(usage)
			.where(agentUsageConditions)
			.groupBy(sql`json_extract(${usage.metadata}, '$.model')`)

		// Get usage by day (createdAt is stored as epoch seconds, so use 'unixepoch' modifier)
		const byDay = await db
			.select({
				date: sql<string>`DATE(${usage.createdAt}, 'unixepoch')`,
				messages: sql<number>`COUNT(*)`,
				tokensIn: sql<number>`COALESCE(SUM(${usage.inputTokens}), 0)`,
				tokensOut: sql<number>`COALESCE(SUM(${usage.outputTokens}), 0)`,
				cost: sql<number>`COALESCE(SUM(${usage.cost}), 0)`,
			})
			.from(usage)
			.where(agentUsageConditions)
			.groupBy(sql`DATE(${usage.createdAt}, 'unixepoch')`)
			.orderBy(sql`DATE(${usage.createdAt}, 'unixepoch')`)

		return {
			agentId,
			usage: {
				totalMessages: totals?.totalMessages ?? 0,
				totalTokensIn: totals?.totalTokensIn ?? 0,
				totalTokensOut: totals?.totalTokensOut ?? 0,
				totalCost: (totals?.totalCost ?? 0) / 100,
				averageLatencyMs: totals?.averageLatency ?? 0,
				byModel: byModel.map((m) => ({
					model: m.model || 'unknown',
					messages: m.messages,
					tokensIn: m.tokensIn,
					tokensOut: m.tokensOut,
					cost: m.cost / 100,
				})),
				byDay: byDay.map((d) => ({
					date: d.date,
					messages: d.messages,
					tokensIn: d.tokensIn,
					tokensOut: d.tokensOut,
					cost: d.cost / 100,
				})),
			},
		}
	})

// =============================================================================
// Router Export
// =============================================================================

export const usageRouter = {
	getWorkspaceUsage,
	getAgentUsage,
}
