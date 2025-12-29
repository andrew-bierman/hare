import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { and, eq, gte, lte, sql } from 'drizzle-orm'
import { agents, usage } from 'web-app/db/schema'
import { getDb } from '../db'
import { authMiddleware, workspaceMiddleware } from '../middleware'
import { ErrorSchema, UsageQuerySchema } from '../schemas'
import type { WorkspaceEnv } from '@hare/types'

// Define analytics response schemas
const TimeSeriesDataSchema = z.object({
	date: z.string().openapi({ example: '2024-12-01' }),
	inputTokens: z.number().openapi({ example: 4000 }),
	outputTokens: z.number().openapi({ example: 6000 }),
	totalTokens: z.number().openapi({ example: 10000 }),
	requests: z.number().openapi({ example: 100 }),
	cost: z.number().openapi({ example: 0.1 }),
	avgLatency: z.number().openapi({ example: 250 }),
})

const AgentBreakdownSchema = z.object({
	agentId: z.string().openapi({ example: 'agent_abc123' }),
	agentName: z.string().openapi({ example: 'Customer Support Agent' }),
	requests: z.number().openapi({ example: 800 }),
	inputTokens: z.number().openapi({ example: 30000 }),
	outputTokens: z.number().openapi({ example: 45000 }),
	totalTokens: z.number().openapi({ example: 75000 }),
	cost: z.number().openapi({ example: 0.75 }),
})

const ModelBreakdownSchema = z.object({
	model: z.string().openapi({ example: 'claude-3-5-sonnet-20241022' }),
	modelName: z.string().openapi({ example: 'Claude 3.5 Sonnet' }),
	requests: z.number().openapi({ example: 500 }),
	inputTokens: z.number().openapi({ example: 20000 }),
	outputTokens: z.number().openapi({ example: 30000 }),
	totalTokens: z.number().openapi({ example: 50000 }),
	cost: z.number().openapi({ example: 0.5 }),
})

const AnalyticsSummarySchema = z.object({
	totalRequests: z.number().openapi({ example: 1234 }),
	totalInputTokens: z.number().openapi({ example: 50000 }),
	totalOutputTokens: z.number().openapi({ example: 75000 }),
	totalTokens: z.number().openapi({ example: 125000 }),
	totalCost: z.number().openapi({ example: 1.25 }),
	avgLatencyMs: z.number().openapi({ example: 250 }),
})

const AnalyticsResponseSchema = z.object({
	summary: AnalyticsSummarySchema,
	timeSeries: z.array(TimeSeriesDataSchema),
	byAgent: z.array(AgentBreakdownSchema),
	byModel: z.array(ModelBreakdownSchema),
	period: z.object({
		startDate: z.string().datetime().openapi({ example: '2024-11-01T00:00:00Z' }),
		endDate: z.string().datetime().openapi({ example: '2024-12-01T00:00:00Z' }),
	}),
})

// Define routes
const getAnalyticsRoute = createRoute({
	method: 'get',
	path: '/',
	tags: ['Analytics'],
	summary: 'Get comprehensive analytics data',
	description:
		'Retrieve detailed analytics including time series, agent breakdown, and model usage',
	request: {
		query: UsageQuerySchema.extend({
			workspaceId: z.string().describe('Workspace ID'),
		}),
	},
	responses: {
		200: {
			description: 'Analytics data',
			content: {
				'application/json': {
					schema: AnalyticsResponseSchema,
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

// Create app with proper typing
const app = new OpenAPIHono<WorkspaceEnv>()

// Apply middleware
app.use('*', authMiddleware)
app.use('*', workspaceMiddleware)

// Register routes
app.openapi(getAnalyticsRoute, async (c) => {
	const { startDate, endDate, agentId, groupBy = 'day' } = c.req.valid('query')
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

	// Determine date format based on groupBy
	let dateFormat = `DATE(${usage.createdAt})`
	if (groupBy === 'week') {
		dateFormat = `DATE(${usage.createdAt}, 'weekday 0', '-6 days')`
	} else if (groupBy === 'month') {
		dateFormat = `DATE(${usage.createdAt}, 'start of month')`
	}

	// Get time series data
	const timeSeries = await db
		.select({
			date: sql<string>`${sql.raw(dateFormat)}`,
			inputTokens: sql<number>`COALESCE(SUM(${usage.inputTokens}), 0)`,
			outputTokens: sql<number>`COALESCE(SUM(${usage.outputTokens}), 0)`,
			totalTokens: sql<number>`COALESCE(SUM(${usage.totalTokens}), 0)`,
			requests: sql<number>`COUNT(*)`,
			cost: sql<number>`COALESCE(SUM(${usage.cost}), 0)`,
			avgLatency: sql<number>`COALESCE(AVG(json_extract(${usage.metadata}, '$.duration')), 0)`,
		})
		.from(usage)
		.where(and(...conditions))
		.groupBy(sql.raw(dateFormat))
		.orderBy(sql.raw(dateFormat))

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

	// Import model config to get model names
	const { getModelName } = await import('@hare/config')

	return c.json(
		{
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
		},
		200,
	)
})

export default app
