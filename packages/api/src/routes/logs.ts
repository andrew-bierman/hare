import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { authMiddleware, workspaceMiddleware } from '../middleware'
import { getLogStats, getLogs, type LogQueryParams } from '../middleware/logging'
import { ErrorSchema } from '../schemas'
import type { WorkspaceEnv } from '@hare/types'

// Define log-related schemas
const RequestLogSchema = z.object({
	id: z.string().openapi({ example: 'log_abc123' }),
	method: z.string().openapi({ example: 'POST' }),
	path: z.string().openapi({ example: '/api/chat' }),
	status: z.number().openapi({ example: 200 }),
	latencyMs: z.number().openapi({ example: 150 }),
	userId: z.string().nullable().openapi({ example: 'user_xyz789' }),
	workspaceId: z.string().nullable().openapi({ example: 'ws_abc123' }),
	agentId: z.string().nullable().openapi({ example: 'agent_def456' }),
	userAgent: z.string().nullable().openapi({ example: 'Mozilla/5.0...' }),
	ip: z.string().nullable().openapi({ example: '192.168.1.1' }),
	timestamp: z.string().openapi({ example: '2024-12-26T10:30:00Z' }),
	error: z.string().nullable().openapi({ example: null }),
})

const LogsQuerySchema = z.object({
	workspaceId: z.string().describe('Workspace ID'),
	userId: z.string().optional().describe('Filter by user ID'),
	agentId: z.string().optional().describe('Filter by agent ID'),
	status: z.string().optional().describe('Filter by HTTP status code'),
	startDate: z.string().optional().describe('Start date (ISO 8601)'),
	endDate: z.string().optional().describe('End date (ISO 8601)'),
	limit: z.string().optional().describe('Max results (default 50, max 100)'),
	offset: z.string().optional().describe('Offset for pagination'),
})

const LogsResponseSchema = z.object({
	logs: z.array(RequestLogSchema),
	total: z.number().openapi({ example: 150 }),
	limit: z.number().openapi({ example: 50 }),
	offset: z.number().openapi({ example: 0 }),
})

const LogStatsResponseSchema = z.object({
	totalRequests: z.number().openapi({ example: 1234 }),
	avgLatencyMs: z.number().openapi({ example: 150 }),
	errorRate: z.number().openapi({ example: 2.5 }),
	requestsByStatus: z.record(z.string(), z.number()).openapi({
		example: { '200': 1000, '400': 20, '500': 10 },
	}),
	requestsByDay: z.array(
		z.object({
			date: z.string().openapi({ example: '2024-12-26' }),
			requests: z.number().openapi({ example: 100 }),
			avgLatency: z.number().openapi({ example: 145 }),
			errors: z.number().openapi({ example: 5 }),
		}),
	),
})

// Define routes
const getLogsRoute = createRoute({
	method: 'get',
	path: '/',
	tags: ['Logs'],
	summary: 'List request logs',
	description: 'Retrieve paginated request logs with optional filtering',
	request: {
		query: LogsQuerySchema,
	},
	responses: {
		200: {
			description: 'Request logs',
			content: {
				'application/json': {
					schema: LogsResponseSchema,
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

const getLogStatsRoute = createRoute({
	method: 'get',
	path: '/stats',
	tags: ['Logs'],
	summary: 'Get request log statistics',
	description: 'Retrieve aggregated statistics from request logs',
	request: {
		query: LogsQuerySchema.omit({ limit: true, offset: true }),
	},
	responses: {
		200: {
			description: 'Log statistics',
			content: {
				'application/json': {
					schema: LogStatsResponseSchema,
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
const baseApp = new OpenAPIHono<WorkspaceEnv>()

// Apply middleware
baseApp.use('*', authMiddleware)
baseApp.use('*', workspaceMiddleware)

// Register routes
const app = baseApp.openapi(getLogsRoute, async (c) => {
	const query = c.req.valid('query')
	const workspace = c.get('workspace')

	const params: LogQueryParams = {
		workspaceId: workspace.id,
		userId: query.userId,
		agentId: query.agentId,
		status: query.status ? Number.parseInt(query.status, 10) : undefined,
		startDate: query.startDate,
		endDate: query.endDate,
		limit: query.limit ? Number.parseInt(query.limit, 10) : 50,
		offset: query.offset ? Number.parseInt(query.offset, 10) : 0,
	}

	const result = await getLogs(c.env, params)

	return c.json(
		{
			logs: result.logs,
			total: result.total,
			limit: params.limit || 50,
			offset: params.offset || 0,
		},
		200,
	)
})
.openapi(getLogStatsRoute, async (c) => {
	const query = c.req.valid('query')
	const workspace = c.get('workspace')

	const params: LogQueryParams = {
		workspaceId: workspace.id,
		userId: query.userId,
		agentId: query.agentId,
		status: query.status ? Number.parseInt(query.status, 10) : undefined,
		startDate: query.startDate,
		endDate: query.endDate,
	}

	const stats = await getLogStats(c.env, params)

	// Convert requestsByStatus to use string keys for JSON compatibility
	const requestsByStatus: Record<string, number> = {}
	for (const [key, value] of Object.entries(stats.requestsByStatus)) {
		requestsByStatus[String(key)] = value
	}

	return c.json(
		{
			totalRequests: stats.totalRequests,
			avgLatencyMs: stats.avgLatencyMs,
			errorRate: stats.errorRate,
			requestsByStatus,
			requestsByDay: stats.requestsByDay,
		},
		200,
	)
})

export default app
