/**
 * Usage Routes
 *
 * Workspace and agent usage statistics.
 */

import { config } from '@hare/config'
import { agents, usage } from '@hare/db/schema'
import { and, eq, gte, lte, sql } from 'drizzle-orm'
import { Elysia, status } from 'elysia'
import { writePlugin } from '../context'

// =============================================================================
// Routes
// =============================================================================

export const usageRoutes = new Elysia({ prefix: '/usage', name: 'usage-routes' })
	.use(writePlugin)

	// Get workspace usage statistics
	.get(
		'/',
		async ({ db, workspaceId, query }) => {
			const startDate = query?.startDate as string | undefined
			const endDate = query?.endDate as string | undefined

			const defaultStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
			const defaultEndDate = new Date().toISOString()

			const conditions = [eq(usage.workspaceId, workspaceId)]
			if (startDate) {
				conditions.push(gte(usage.createdAt, new Date(startDate)))
			}
			if (endDate) {
				conditions.push(lte(usage.createdAt, new Date(endDate)))
			}

			const [totals] = await db
				.select({
					totalMessages: sql<number>`COUNT(*)`,
					totalTokensIn: sql<number>`COALESCE(SUM(${usage.inputTokens}), 0)`,
					totalTokensOut: sql<number>`COALESCE(SUM(${usage.outputTokens}), 0)`,
					totalCost: sql<number>`COALESCE(SUM(${usage.cost}), 0)`,
				})
				.from(usage)
				.where(and(...conditions))

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
					totalMessages: totals?.totalMessages || 0,
					totalTokensIn: totals?.totalTokensIn || 0,
					totalTokensOut: totals?.totalTokensOut || 0,
					totalCost: (totals?.totalCost || 0) / config.CURRENCY.CENTS_PER_DOLLAR,
					byAgent: byAgentRaw.map((a) => ({
						agentId: a.agentId || 'unknown',
						agentName: a.agentName || 'Unknown Agent',
						messages: a.messages,
						tokensIn: a.tokensIn,
						tokensOut: a.tokensOut,
						cost: a.cost / config.CURRENCY.CENTS_PER_DOLLAR,
					})),
					byDay: byDay.map((d) => ({
						date: d.date,
						messages: d.messages,
						tokensIn: d.tokensIn,
						tokensOut: d.tokensOut,
						cost: d.cost / config.CURRENCY.CENTS_PER_DOLLAR,
					})),
				},
				period: {
					startDate: startDate || defaultStartDate,
					endDate: endDate || defaultEndDate,
				},
			}
		},
		{ writeAccess: true },
	)

	// Get agent usage statistics
	.get(
		'/agents/:id',
		async ({ db, workspaceId, params }) => {
			const agentId = params.id

			const [agent] = await db
				.select()
				.from(agents)
				.where(and(eq(agents.id, agentId), eq(agents.workspaceId, workspaceId)))

			if (!agent) return status(404, { error: 'Agent not found' })

			const agentCondition = and(eq(usage.agentId, agentId), eq(usage.workspaceId, workspaceId))

			const [totals] = await db
				.select({
					totalMessages: sql<number>`COUNT(*)`,
					totalTokensIn: sql<number>`COALESCE(SUM(${usage.inputTokens}), 0)`,
					totalTokensOut: sql<number>`COALESCE(SUM(${usage.outputTokens}), 0)`,
					totalCost: sql<number>`COALESCE(SUM(${usage.cost}), 0)`,
					averageLatency: sql<number>`COALESCE(AVG(json_extract(${usage.metadata}, '$.duration')), 0)`,
				})
				.from(usage)
				.where(agentCondition)

			const byModel = await db
				.select({
					model: sql<string>`json_extract(${usage.metadata}, '$.model')`,
					messages: sql<number>`COUNT(*)`,
					tokensIn: sql<number>`COALESCE(SUM(${usage.inputTokens}), 0)`,
					tokensOut: sql<number>`COALESCE(SUM(${usage.outputTokens}), 0)`,
					cost: sql<number>`COALESCE(SUM(${usage.cost}), 0)`,
				})
				.from(usage)
				.where(agentCondition)
				.groupBy(sql`json_extract(${usage.metadata}, '$.model')`)

			const byDay = await db
				.select({
					date: sql<string>`DATE(${usage.createdAt}, 'unixepoch')`,
					messages: sql<number>`COUNT(*)`,
					tokensIn: sql<number>`COALESCE(SUM(${usage.inputTokens}), 0)`,
					tokensOut: sql<number>`COALESCE(SUM(${usage.outputTokens}), 0)`,
					cost: sql<number>`COALESCE(SUM(${usage.cost}), 0)`,
				})
				.from(usage)
				.where(agentCondition)
				.groupBy(sql`DATE(${usage.createdAt}, 'unixepoch')`)
				.orderBy(sql`DATE(${usage.createdAt}, 'unixepoch')`)

			return {
				agentId,
				usage: {
					totalMessages: totals?.totalMessages || 0,
					totalTokensIn: totals?.totalTokensIn || 0,
					totalTokensOut: totals?.totalTokensOut || 0,
					totalCost: (totals?.totalCost || 0) / config.CURRENCY.CENTS_PER_DOLLAR,
					averageLatencyMs: totals?.averageLatency || 0,
					byModel: byModel.map((m) => ({
						model: m.model || 'unknown',
						messages: m.messages,
						tokensIn: m.tokensIn,
						tokensOut: m.tokensOut,
						cost: m.cost / config.CURRENCY.CENTS_PER_DOLLAR,
					})),
					byDay: byDay.map((d) => ({
						date: d.date,
						messages: d.messages,
						tokensIn: d.tokensIn,
						tokensOut: d.tokensOut,
						cost: d.cost / config.CURRENCY.CENTS_PER_DOLLAR,
					})),
				},
			}
		},
		{ writeAccess: true },
	)
