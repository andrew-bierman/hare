import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { and, eq, gte, lte, sql } from 'drizzle-orm'
import { agents, usage } from 'web-app/db/schema'
import { getDb } from '../db'
import { authMiddleware, workspaceMiddleware } from '../middleware'
import {
	AgentUsageResponseSchema,
	ErrorSchema,
	IdParamSchema,
	UsageQuerySchema,
	UsageResponseSchema,
} from '../schemas'
import type { WorkspaceEnv } from '@hare/types'

// Define routes
const getWorkspaceUsageRoute = createRoute({
	method: 'get',
	path: '/',
	tags: ['Usage'],
	summary: 'Get workspace usage statistics',
	description:
		'Retrieve usage statistics for the workspace, optionally filtered by date range and agent',
	request: {
		query: UsageQuerySchema.extend({
			workspaceId: z.string().describe('Workspace ID'),
		}),
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
		401: {
			description: 'Unauthorized',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		503: {
			description: 'Service unavailable',
			content: { 'application/json': { schema: ErrorSchema } },
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
		query: z.object({
			workspaceId: z.string().describe('Workspace ID'),
		}),
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
		401: {
			description: 'Unauthorized',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		404: {
			description: 'Agent not found',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		503: {
			description: 'Service unavailable',
			content: { 'application/json': { schema: ErrorSchema } },
		},
	},
})

// Create app with proper typing (includes Bindings and Variables)
const app = new OpenAPIHono<WorkspaceEnv>()

// Apply middleware
app.use('*', authMiddleware)
app.use('*', workspaceMiddleware)

// Register routes
app.openapi(getWorkspaceUsageRoute, async (c) => {
	const { startDate, endDate } = c.req.valid('query')
	const db = getDb(c)
	const workspace = c.get('workspace')

	const defaultStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
	const defaultEndDate = new Date().toISOString()

	// Build query conditions
	const conditions = [eq(usage.workspaceId, workspace.id)]
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
		.orderBy(sql`DATE(${usage.createdAt})`)

	return c.json(
		{
			usage: {
				totalMessages: totals?.totalMessages || 0,
				totalTokensIn: totals?.totalTokensIn || 0,
				totalTokensOut: totals?.totalTokensOut || 0,
				totalCost: (totals?.totalCost || 0) / 100,
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
		},
		200,
	)
})

app.openapi(getAgentUsageRoute, async (c) => {
	const { id: agentId } = c.req.valid('param')
	const db = getDb(c)
	const workspace = c.get('workspace')

	// Verify agent belongs to workspace
	const [agent] = await db
		.select()
		.from(agents)
		.where(and(eq(agents.id, agentId), eq(agents.workspaceId, workspace.id)))

	if (!agent) {
		return c.json({ error: 'Agent not found' }, 404)
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
		.orderBy(sql`DATE(${usage.createdAt})`)

	return c.json(
		{
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
		},
		200,
	)
})

export default app
