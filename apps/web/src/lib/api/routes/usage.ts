import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { and, eq, gte, lte, sql } from 'drizzle-orm'
import { getDb } from '../db'
import {
	AgentUsageResponseSchema,
	IdParamSchema,
	UsageQuerySchema,
	UsageResponseSchema,
} from '../schemas'
import { usage } from 'web-app/db/schema'

// Define routes
const getWorkspaceUsageRoute = createRoute({
	method: 'get',
	path: '/',
	tags: ['Usage'],
	summary: 'Get workspace usage statistics',
	description:
		'Retrieve usage statistics for the workspace, optionally filtered by date range and agent',
	request: {
		query: UsageQuerySchema,
	},
	responses: {
		200: {
			description: 'Usage statistics',
			content: {
				'application/json': {
					schema: UsageResponseSchema,
				},
			},
		},
	},
})

const getAgentUsageRoute = createRoute({
	method: 'get',
	path: '/agents/{id}',
	tags: ['Usage'],
	summary: 'Get agent usage statistics',
	description: 'Retrieve usage statistics for a specific agent',
	request: {
		params: IdParamSchema,
	},
	responses: {
		200: {
			description: 'Agent usage statistics',
			content: {
				'application/json': {
					schema: AgentUsageResponseSchema,
				},
			},
		},
	},
})

// Create app and register routes
const app = new OpenAPIHono()
	.openapi(getWorkspaceUsageRoute, async (c) => {
		const { startDate, endDate } = c.req.valid('query')
		const db = getDb(c)

		const defaultStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
		const defaultEndDate = new Date().toISOString()

		// Return mock data for development/testing when DB not available
		if (!db) {
			return c.json({
				usage: {
					totalMessages: 1234,
					totalTokensIn: 50000,
					totalTokensOut: 75000,
					totalCost: 1.25,
					byAgent: [
						{
							agentId: 'agent_xxx',
							agentName: 'Customer Support Agent',
							messages: 800,
							tokensIn: 30000,
							tokensOut: 45000,
							cost: 0.75,
						},
						{
							agentId: 'agent_yyy',
							agentName: 'Sales Agent',
							messages: 434,
							tokensIn: 20000,
							tokensOut: 30000,
							cost: 0.5,
						},
					],
					byDay: [
						{
							date: '2024-12-01',
							messages: 100,
							tokensIn: 4000,
							tokensOut: 6000,
							cost: 0.1,
						},
						{
							date: '2024-12-02',
							messages: 150,
							tokensIn: 6000,
							tokensOut: 9000,
							cost: 0.15,
						},
					],
				},
				period: {
					startDate: startDate || defaultStartDate,
					endDate: endDate || defaultEndDate,
				},
			})
		}

		// TODO: Get actual workspace ID from context
		const workspaceId = 'ws_default'

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

		// Get usage by agent
		const byAgent = await db
			.select({
				agentId: usage.agentId,
				messages: sql<number>`COUNT(*)`,
				tokensIn: sql<number>`COALESCE(SUM(${usage.inputTokens}), 0)`,
				tokensOut: sql<number>`COALESCE(SUM(${usage.outputTokens}), 0)`,
				cost: sql<number>`COALESCE(SUM(${usage.cost}), 0)`,
			})
			.from(usage)
			.where(and(...conditions))
			.groupBy(usage.agentId)

		// Get usage by day
		const byDay = await db
			.select({
				date: sql<string>`DATE(${usage.createdAt})`,
				messages: sql<number>`COUNT(*)`,
				tokensIn: sql<number>`COALESCE(SUM(${usage.inputTokens}), 0)`,
				tokensOut: sql<number>`COALESCE(SUM(${usage.outputTokens}), 0)`,
				cost: sql<number>`COALESCE(SUM(${usage.cost}), 0)`,
			})
			.from(usage)
			.where(and(...conditions))
			.groupBy(sql`DATE(${usage.createdAt})`)

		return c.json({
			usage: {
				totalMessages: totals?.totalMessages || 0,
				totalTokensIn: totals?.totalTokensIn || 0,
				totalTokensOut: totals?.totalTokensOut || 0,
				totalCost: (totals?.totalCost || 0) / 100, // Convert cents to dollars
				byAgent: byAgent.map((a) => ({
					agentId: a.agentId || 'unknown',
					agentName: 'Agent', // TODO: Join with agents table to get name
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
		})
	})
	.openapi(getAgentUsageRoute, async (c) => {
		const { id: agentId } = c.req.valid('param')
		const db = getDb(c)

		// Return mock data for development/testing when DB not available
		if (!db) {
			return c.json({
				agentId,
				usage: {
					totalMessages: 800,
					totalTokensIn: 30000,
					totalTokensOut: 45000,
					totalCost: 0.75,
					averageLatencyMs: 250,
					byModel: [
						{
							model: 'llama-3.3-70b-instruct',
							messages: 800,
							tokensIn: 30000,
							tokensOut: 45000,
							cost: 0.75,
						},
					],
					byDay: [
						{
							date: '2024-12-01',
							messages: 50,
							tokensIn: 2000,
							tokensOut: 3000,
							cost: 0.05,
						},
					],
				},
			})
		}

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
			.where(eq(usage.agentId, agentId))

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
			.where(eq(usage.agentId, agentId))
			.groupBy(sql`json_extract(${usage.metadata}, '$.model')`)

		// Get usage by day
		const byDay = await db
			.select({
				date: sql<string>`DATE(${usage.createdAt})`,
				messages: sql<number>`COUNT(*)`,
				tokensIn: sql<number>`COALESCE(SUM(${usage.inputTokens}), 0)`,
				tokensOut: sql<number>`COALESCE(SUM(${usage.outputTokens}), 0)`,
				cost: sql<number>`COALESCE(SUM(${usage.cost}), 0)`,
			})
			.from(usage)
			.where(eq(usage.agentId, agentId))
			.groupBy(sql`DATE(${usage.createdAt})`)

		return c.json({
			agentId,
			usage: {
				totalMessages: totals?.totalMessages || 0,
				totalTokensIn: totals?.totalTokensIn || 0,
				totalTokensOut: totals?.totalTokensOut || 0,
				totalCost: (totals?.totalCost || 0) / 100,
				averageLatencyMs: totals?.averageLatency || 0,
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
		})
	})

export default app
