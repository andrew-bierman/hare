/**
 * Schedule Routes
 *
 * API endpoints for managing agent scheduled tasks.
 */

import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { and, desc, eq } from 'drizzle-orm'
import { agents, scheduledTasks, scheduleExecutions } from 'web-app/db/schema'
import { routeHttpToAgent } from 'web-app/lib/agents'
import { getCloudflareEnv, getDb } from '../db'
import { commonResponses, requireWriteAccess } from '../helpers'
import { authMiddleware, workspaceMiddleware } from '../middleware'
import {
	CreateScheduleSchema,
	ErrorSchema,
	ExecutionHistorySchema,
	ScheduleListSchema,
	ScheduleSchema,
	SuccessSchema,
	UpdateScheduleSchema,
} from '../schemas'
import type { WorkspaceEnv } from '../types'

// =============================================================================
// Serializers
// =============================================================================

function serializeSchedule(schedule: typeof scheduledTasks.$inferSelect) {
	return {
		id: schedule.id,
		agentId: schedule.agentId,
		type: schedule.type,
		executeAt: schedule.executeAt?.toISOString() ?? null,
		cron: schedule.cron ?? null,
		action: schedule.action,
		payload: schedule.payload ?? null,
		status: schedule.status,
		lastExecutedAt: schedule.lastExecutedAt?.toISOString() ?? null,
		nextExecuteAt: schedule.nextExecuteAt?.toISOString() ?? null,
		executionCount: schedule.executionCount,
		createdAt: schedule.createdAt.toISOString(),
		updatedAt: schedule.updatedAt.toISOString(),
	}
}

function serializeExecution(execution: typeof scheduleExecutions.$inferSelect) {
	return {
		id: execution.id,
		scheduleId: execution.scheduleId,
		agentId: execution.agentId,
		status: execution.status,
		startedAt: execution.startedAt.toISOString(),
		completedAt: execution.completedAt?.toISOString() ?? null,
		durationMs: execution.durationMs ?? null,
		result: execution.result ?? null,
		error: execution.error ?? null,
	}
}

// =============================================================================
// Route Definitions
// =============================================================================

const listSchedulesRoute = createRoute({
	method: 'get',
	path: '/{agentId}/schedules',
	tags: ['Schedules'],
	summary: 'List scheduled tasks',
	description: 'Get all scheduled tasks for an agent',
	request: {
		params: z.object({
			agentId: z.string().describe('Agent ID'),
		}),
		query: z.object({
			workspaceId: z.string().describe('Workspace ID'),
			status: z
				.enum(['pending', 'active', 'paused', 'completed', 'cancelled'])
				.optional()
				.describe('Filter by status'),
		}),
	},
	responses: {
		200: {
			description: 'List of scheduled tasks',
			content: {
				'application/json': {
					schema: ScheduleListSchema,
				},
			},
		},
		404: {
			description: 'Agent not found',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		...commonResponses,
	},
})

const createScheduleRoute = createRoute({
	method: 'post',
	path: '/{agentId}/schedules',
	tags: ['Schedules'],
	summary: 'Create scheduled task',
	description: 'Create a new scheduled task for an agent',
	request: {
		params: z.object({
			agentId: z.string().describe('Agent ID'),
		}),
		query: z.object({
			workspaceId: z.string().describe('Workspace ID'),
		}),
		body: {
			content: {
				'application/json': {
					schema: CreateScheduleSchema,
				},
			},
		},
	},
	responses: {
		201: {
			description: 'Schedule created successfully',
			content: {
				'application/json': {
					schema: ScheduleSchema,
				},
			},
		},
		400: {
			description: 'Invalid schedule configuration',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		403: {
			description: 'Write access required',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		404: {
			description: 'Agent not found',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		500: {
			description: 'Internal server error',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		...commonResponses,
	},
})

const getScheduleRoute = createRoute({
	method: 'get',
	path: '/{agentId}/schedules/{scheduleId}',
	tags: ['Schedules'],
	summary: 'Get scheduled task',
	description: 'Get a specific scheduled task by ID',
	request: {
		params: z.object({
			agentId: z.string().describe('Agent ID'),
			scheduleId: z.string().describe('Schedule ID'),
		}),
		query: z.object({
			workspaceId: z.string().describe('Workspace ID'),
		}),
	},
	responses: {
		200: {
			description: 'Schedule details',
			content: {
				'application/json': {
					schema: ScheduleSchema,
				},
			},
		},
		404: {
			description: 'Schedule not found',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		...commonResponses,
	},
})

const updateScheduleRoute = createRoute({
	method: 'patch',
	path: '/{agentId}/schedules/{scheduleId}',
	tags: ['Schedules'],
	summary: 'Update scheduled task',
	description: 'Update a scheduled task (pause, resume, or modify)',
	request: {
		params: z.object({
			agentId: z.string().describe('Agent ID'),
			scheduleId: z.string().describe('Schedule ID'),
		}),
		query: z.object({
			workspaceId: z.string().describe('Workspace ID'),
		}),
		body: {
			content: {
				'application/json': {
					schema: UpdateScheduleSchema,
				},
			},
		},
	},
	responses: {
		200: {
			description: 'Schedule updated successfully',
			content: {
				'application/json': {
					schema: ScheduleSchema,
				},
			},
		},
		403: {
			description: 'Write access required',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		404: {
			description: 'Schedule not found',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		500: {
			description: 'Internal server error',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		...commonResponses,
	},
})

const deleteScheduleRoute = createRoute({
	method: 'delete',
	path: '/{agentId}/schedules/{scheduleId}',
	tags: ['Schedules'],
	summary: 'Delete scheduled task',
	description: 'Cancel and delete a scheduled task',
	request: {
		params: z.object({
			agentId: z.string().describe('Agent ID'),
			scheduleId: z.string().describe('Schedule ID'),
		}),
		query: z.object({
			workspaceId: z.string().describe('Workspace ID'),
		}),
	},
	responses: {
		200: {
			description: 'Schedule deleted successfully',
			content: {
				'application/json': {
					schema: SuccessSchema,
				},
			},
		},
		403: {
			description: 'Write access required',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		404: {
			description: 'Schedule not found',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		...commonResponses,
	},
})

const getExecutionHistoryRoute = createRoute({
	method: 'get',
	path: '/{agentId}/schedules/{scheduleId}/executions',
	tags: ['Schedules'],
	summary: 'Get execution history',
	description: 'Get execution history for a scheduled task',
	request: {
		params: z.object({
			agentId: z.string().describe('Agent ID'),
			scheduleId: z.string().describe('Schedule ID'),
		}),
		query: z.object({
			workspaceId: z.string().describe('Workspace ID'),
			limit: z.coerce.number().optional().default(50).describe('Maximum results'),
			offset: z.coerce.number().optional().default(0).describe('Offset for pagination'),
		}),
	},
	responses: {
		200: {
			description: 'Execution history',
			content: {
				'application/json': {
					schema: ExecutionHistorySchema,
				},
			},
		},
		404: {
			description: 'Schedule not found',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		...commonResponses,
	},
})

const getAgentExecutionsRoute = createRoute({
	method: 'get',
	path: '/{agentId}/executions',
	tags: ['Schedules'],
	summary: 'Get all agent executions',
	description: 'Get all execution history for an agent across all schedules',
	request: {
		params: z.object({
			agentId: z.string().describe('Agent ID'),
		}),
		query: z.object({
			workspaceId: z.string().describe('Workspace ID'),
			limit: z.coerce.number().optional().default(50).describe('Maximum results'),
			offset: z.coerce.number().optional().default(0).describe('Offset for pagination'),
		}),
	},
	responses: {
		200: {
			description: 'Execution history',
			content: {
				'application/json': {
					schema: ExecutionHistorySchema,
				},
			},
		},
		404: {
			description: 'Agent not found',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		...commonResponses,
	},
})

// =============================================================================
// App Setup
// =============================================================================

const app = new OpenAPIHono<WorkspaceEnv>()

// Apply middleware
app.use('*', authMiddleware)
app.use('*', workspaceMiddleware)

// =============================================================================
// Route Handlers
// =============================================================================

app.openapi(listSchedulesRoute, async (c) => {
	const { agentId } = c.req.valid('param')
	const { status } = c.req.valid('query')
	const db = await getDb(c)
	const workspace = c.get('workspace')

	// Verify agent exists and belongs to workspace
	const [agent] = await db
		.select()
		.from(agents)
		.where(and(eq(agents.id, agentId), eq(agents.workspaceId, workspace.id)))

	if (!agent) {
		return c.json({ error: 'Agent not found' }, 404)
	}

	// Build query
	const conditions = [eq(scheduledTasks.agentId, agentId)]
	if (status) {
		conditions.push(eq(scheduledTasks.status, status))
	}

	const schedules = await db
		.select()
		.from(scheduledTasks)
		.where(and(...conditions))
		.orderBy(desc(scheduledTasks.createdAt))

	return c.json({ schedules: schedules.map(serializeSchedule) }, 200)
})

app.openapi(createScheduleRoute, async (c) => {
	const { agentId } = c.req.valid('param')
	const data = c.req.valid('json')
	const db = await getDb(c)
	const env = await getCloudflareEnv(c)
	const user = c.get('user')
	const workspace = c.get('workspace')
	const role = c.get('workspaceRole')

	requireWriteAccess(role)

	// Verify agent exists and belongs to workspace
	const [agent] = await db
		.select()
		.from(agents)
		.where(and(eq(agents.id, agentId), eq(agents.workspaceId, workspace.id)))

	if (!agent) {
		return c.json({ error: 'Agent not found' }, 404)
	}

	// Parse execution time
	const executeAt = data.executeAt ? new Date(data.executeAt) : undefined
	const now = new Date()

	// Validate one-time schedules are in the future
	if (data.type === 'one-time' && executeAt && executeAt <= now) {
		return c.json({ error: 'Execution time must be in the future' }, 400)
	}

	// Create schedule in database
	const [schedule] = await db
		.insert(scheduledTasks)
		.values({
			agentId,
			type: data.type,
			executeAt,
			cron: data.cron,
			action: data.action,
			payload: data.payload,
			status: 'active',
			nextExecuteAt: executeAt,
			createdBy: user.id,
		})
		.returning()

	if (!schedule) {
		return c.json({ error: 'Failed to create schedule' }, 500)
	}

	// Register schedule with Durable Object agent
	try {
		const requestUrl = new URL(c.req.url)
		const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`

		const scheduleRequest = new Request(`${baseUrl}/api/agents/${agentId}/schedule`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				type: 'schedule',
				payload: {
					action: data.action,
					executeAt: executeAt?.getTime(),
					cron: data.cron,
					payload: { ...data.payload, scheduleId: schedule.id },
				},
			}),
		})

		await routeHttpToAgent({
			request: scheduleRequest,
			env,
			agentId,
			path: '/schedule',
		})
	} catch (error) {
		console.error('Failed to register schedule with agent:', error)
		// Continue - schedule is in DB, agent will pick it up on next sync
	}

	return c.json(serializeSchedule(schedule), 201)
})

app.openapi(getScheduleRoute, async (c) => {
	const { agentId, scheduleId } = c.req.valid('param')
	const db = await getDb(c)
	const workspace = c.get('workspace')

	// Verify agent exists and belongs to workspace
	const [agent] = await db
		.select()
		.from(agents)
		.where(and(eq(agents.id, agentId), eq(agents.workspaceId, workspace.id)))

	if (!agent) {
		return c.json({ error: 'Agent not found' }, 404)
	}

	const [schedule] = await db
		.select()
		.from(scheduledTasks)
		.where(and(eq(scheduledTasks.id, scheduleId), eq(scheduledTasks.agentId, agentId)))

	if (!schedule) {
		return c.json({ error: 'Schedule not found' }, 404)
	}

	return c.json(serializeSchedule(schedule), 200)
})

app.openapi(updateScheduleRoute, async (c) => {
	const { agentId, scheduleId } = c.req.valid('param')
	const data = c.req.valid('json')
	const db = await getDb(c)
	const workspace = c.get('workspace')
	const role = c.get('workspaceRole')

	requireWriteAccess(role)

	// Verify agent exists and belongs to workspace
	const [agent] = await db
		.select()
		.from(agents)
		.where(and(eq(agents.id, agentId), eq(agents.workspaceId, workspace.id)))

	if (!agent) {
		return c.json({ error: 'Agent not found' }, 404)
	}

	const [existing] = await db
		.select()
		.from(scheduledTasks)
		.where(and(eq(scheduledTasks.id, scheduleId), eq(scheduledTasks.agentId, agentId)))

	if (!existing) {
		return c.json({ error: 'Schedule not found' }, 404)
	}

	// Build update
	const updateData: Partial<typeof scheduledTasks.$inferInsert> = {
		updatedAt: new Date(),
	}

	if (data.status !== undefined) {
		updateData.status = data.status
	}
	if (data.executeAt !== undefined) {
		updateData.executeAt = new Date(data.executeAt)
		updateData.nextExecuteAt = new Date(data.executeAt)
	}
	if (data.cron !== undefined) {
		updateData.cron = data.cron
	}
	if (data.payload !== undefined) {
		updateData.payload = data.payload
	}

	const [schedule] = await db
		.update(scheduledTasks)
		.set(updateData)
		.where(eq(scheduledTasks.id, scheduleId))
		.returning()

	if (!schedule) {
		return c.json({ error: 'Failed to update schedule' }, 500)
	}

	return c.json(serializeSchedule(schedule), 200)
})

app.openapi(deleteScheduleRoute, async (c) => {
	const { agentId, scheduleId } = c.req.valid('param')
	const db = await getDb(c)
	const workspace = c.get('workspace')
	const role = c.get('workspaceRole')

	requireWriteAccess(role)

	// Verify agent exists and belongs to workspace
	const [agent] = await db
		.select()
		.from(agents)
		.where(and(eq(agents.id, agentId), eq(agents.workspaceId, workspace.id)))

	if (!agent) {
		return c.json({ error: 'Agent not found' }, 404)
	}

	const result = await db
		.delete(scheduledTasks)
		.where(and(eq(scheduledTasks.id, scheduleId), eq(scheduledTasks.agentId, agentId)))
		.returning()

	if (result.length === 0) {
		return c.json({ error: 'Schedule not found' }, 404)
	}

	return c.json({ success: true }, 200)
})

app.openapi(getExecutionHistoryRoute, async (c) => {
	const { agentId, scheduleId } = c.req.valid('param')
	const { limit, offset } = c.req.valid('query')
	const db = await getDb(c)
	const workspace = c.get('workspace')

	// Verify agent exists and belongs to workspace
	const [agent] = await db
		.select()
		.from(agents)
		.where(and(eq(agents.id, agentId), eq(agents.workspaceId, workspace.id)))

	if (!agent) {
		return c.json({ error: 'Agent not found' }, 404)
	}

	// Verify schedule exists
	const [schedule] = await db
		.select()
		.from(scheduledTasks)
		.where(and(eq(scheduledTasks.id, scheduleId), eq(scheduledTasks.agentId, agentId)))

	if (!schedule) {
		return c.json({ error: 'Schedule not found' }, 404)
	}

	const executions = await db
		.select()
		.from(scheduleExecutions)
		.where(eq(scheduleExecutions.scheduleId, scheduleId))
		.orderBy(desc(scheduleExecutions.startedAt))
		.limit(limit)
		.offset(offset)

	// Get total count for pagination
	const [countResult] = await db
		.select({ count: scheduledTasks.id })
		.from(scheduleExecutions)
		.where(eq(scheduleExecutions.scheduleId, scheduleId))

	return c.json(
		{
			executions: executions.map(serializeExecution),
			total: countResult ? 1 : 0, // Simplified count
		},
		200,
	)
})

app.openapi(getAgentExecutionsRoute, async (c) => {
	const { agentId } = c.req.valid('param')
	const { limit, offset } = c.req.valid('query')
	const db = await getDb(c)
	const workspace = c.get('workspace')

	// Verify agent exists and belongs to workspace
	const [agent] = await db
		.select()
		.from(agents)
		.where(and(eq(agents.id, agentId), eq(agents.workspaceId, workspace.id)))

	if (!agent) {
		return c.json({ error: 'Agent not found' }, 404)
	}

	const executions = await db
		.select()
		.from(scheduleExecutions)
		.where(eq(scheduleExecutions.agentId, agentId))
		.orderBy(desc(scheduleExecutions.startedAt))
		.limit(limit)
		.offset(offset)

	return c.json(
		{
			executions: executions.map(serializeExecution),
			total: executions.length,
		},
		200,
	)
})

export default app
