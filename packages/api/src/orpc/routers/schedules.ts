/**
 * oRPC Schedules Router
 *
 * Handles scheduled task management with full type safety.
 */

import { z } from 'zod'
import { and, eq, desc } from 'drizzle-orm'
import { scheduledTasks, scheduleExecutions, agents } from '@hare/db/schema'
import { config, SCHEDULE_TYPES, SCHEDULE_STATUSES, EXECUTION_STATUSES } from '@hare/config'
import { requireWrite, requireAdmin, notFound, serverError, badRequest, type WorkspaceContext } from '../base'
import { SuccessSchema, IdParamSchema } from '../../schemas'

// =============================================================================
// Type-Safe Schemas
// =============================================================================

/** Schedule type enum - one-time or recurring */
const ScheduleTypeSchema = z.enum(SCHEDULE_TYPES)
type ScheduleType = z.infer<typeof ScheduleTypeSchema>

/** Schedule status enum */
const ScheduleStatusSchema = z.enum(SCHEDULE_STATUSES)

/** Execution status enum */
const ExecutionStatusSchema = z.enum(EXECUTION_STATUSES)
type ExecutionStatus = z.infer<typeof ExecutionStatusSchema>

const ScheduleSchema = z.object({
	id: z.string(),
	agentId: z.string(),
	type: ScheduleTypeSchema,
	executeAt: z.string().nullable(),
	cron: z.string().nullable(),
	action: z.string(),
	payload: z.record(z.string(), z.unknown()).nullable(),
	status: ScheduleStatusSchema,
	lastExecutedAt: z.string().nullable(),
	nextExecuteAt: z.string().nullable(),
	executionCount: z.number(),
	createdAt: z.string(),
	updatedAt: z.string(),
})

const CreateScheduleInputSchema = z.object({
	agentId: z.string(),
	type: ScheduleTypeSchema,
	action: z.string(),
	executeAt: z.string().optional(),
	cron: z.string().optional(),
	payload: z.record(z.string(), z.unknown()).optional(),
})

const UpdateScheduleInputSchema = z.object({
	action: z.string().optional(),
	executeAt: z.string().optional(),
	cron: z.string().optional(),
	payload: z.record(z.string(), z.unknown()).optional(),
	status: ScheduleStatusSchema.optional(),
})

const ScheduleExecutionSchema = z.object({
	id: z.string(),
	scheduleId: z.string(),
	agentId: z.string(),
	status: ExecutionStatusSchema,
	startedAt: z.string(),
	completedAt: z.string().nullable(),
	durationMs: z.number().nullable(),
	result: z.record(z.string(), z.unknown()).nullable(),
	error: z.string().nullable(),
})

// =============================================================================
// Helpers
// =============================================================================

function serializeSchedule(schedule: typeof scheduledTasks.$inferSelect): z.infer<typeof ScheduleSchema> {
	return {
		id: schedule.id,
		agentId: schedule.agentId,
		type: schedule.type as ScheduleType,
		executeAt: schedule.executeAt?.toISOString() ?? null,
		cron: schedule.cron ?? null,
		action: schedule.action,
		payload: schedule.payload ?? null,
		status: schedule.status as z.infer<typeof ScheduleStatusSchema>,
		lastExecutedAt: schedule.lastExecutedAt?.toISOString() ?? null,
		nextExecuteAt: schedule.nextExecuteAt?.toISOString() ?? null,
		executionCount: schedule.executionCount,
		createdAt: schedule.createdAt.toISOString(),
		updatedAt: schedule.updatedAt.toISOString(),
	}
}

function serializeExecution(execution: typeof scheduleExecutions.$inferSelect): z.infer<typeof ScheduleExecutionSchema> {
	return {
		id: execution.id,
		scheduleId: execution.scheduleId,
		agentId: execution.agentId,
		status: execution.status as ExecutionStatus,
		startedAt: execution.startedAt.toISOString(),
		completedAt: execution.completedAt?.toISOString() ?? null,
		durationMs: execution.durationMs ?? null,
		result: execution.result ?? null,
		error: execution.error ?? null,
	}
}

async function findSchedule(id: string, db: WorkspaceContext['db']) {
	const [schedule] = await db.select().from(scheduledTasks).where(eq(scheduledTasks.id, id))
	return schedule || null
}

// =============================================================================
// Procedures
// =============================================================================

/**
 * List all schedules for an agent
 */
export const list = requireWrite
	.route({ method: 'GET', path: '/schedules' })
	.input(z.object({ agentId: z.string().optional() }))
	.output(z.object({ schedules: z.array(ScheduleSchema) }))
	.handler(async ({ input, context }) => {
		const { db, workspaceId } = context

		// Get agents in workspace to filter schedules
		const workspaceAgents = await db
			.select({ id: agents.id })
			.from(agents)
			.where(eq(agents.workspaceId, workspaceId))
		const agentIds = workspaceAgents.map((a) => a.id)

		if (agentIds.length === 0) {
			return { schedules: [] }
		}

		let results: (typeof scheduledTasks.$inferSelect)[]
		if (input.agentId) {
			if (!agentIds.includes(input.agentId)) {
				return { schedules: [] }
			}
			results = await db.select().from(scheduledTasks).where(eq(scheduledTasks.agentId, input.agentId))
		} else {
			// Get all schedules for workspace agents
			results = []
			for (const agentId of agentIds) {
				const agentSchedules = await db.select().from(scheduledTasks).where(eq(scheduledTasks.agentId, agentId))
				results.push(...agentSchedules)
			}
		}

		return { schedules: results.map(serializeSchedule) }
	})

/**
 * Get single schedule by ID
 */
export const get = requireWrite
	.route({ method: 'GET', path: '/schedules/{id}' })
	.input(IdParamSchema)
	.output(ScheduleSchema)
	.handler(async ({ input, context }) => {
		const { db } = context

		const schedule = await findSchedule(input.id, db)
		if (!schedule) notFound('Schedule not found')

		return serializeSchedule(schedule)
	})

/**
 * Create new schedule
 */
export const create = requireWrite
	.route({ method: 'POST', path: '/schedules', successStatus: 201 })
	.input(CreateScheduleInputSchema)
	.output(ScheduleSchema)
	.handler(async ({ input, context }) => {
		const { db, workspaceId, user } = context

		// Verify agent exists in workspace
		const [agent] = await db
			.select()
			.from(agents)
			.where(and(eq(agents.id, input.agentId), eq(agents.workspaceId, workspaceId)))

		if (!agent) badRequest('Agent not found')

		const [schedule] = await db
			.insert(scheduledTasks)
			.values({
				agentId: input.agentId,
				type: input.type,
				action: input.action,
				cron: input.cron,
				executeAt: input.executeAt ? new Date(input.executeAt) : undefined,
				payload: input.payload,
				status: config.enums.scheduleStatus.ACTIVE,
				createdBy: user.id,
			})
			.returning()

		if (!schedule) serverError('Failed to create schedule')

		return serializeSchedule(schedule)
	})

/**
 * Update schedule
 */
export const update = requireWrite
	.route({ method: 'PATCH', path: '/schedules/{id}' })
	.input(IdParamSchema.merge(UpdateScheduleInputSchema))
	.output(ScheduleSchema)
	.handler(async ({ input, context }) => {
		const { id, ...data } = input
		const { db } = context

		const existing = await findSchedule(id, db)
		if (!existing) notFound('Schedule not found')

		const [schedule] = await db
			.update(scheduledTasks)
			.set({
				...(data.action !== undefined && { action: data.action }),
				...(data.cron !== undefined && { cron: data.cron }),
				...(data.executeAt !== undefined && { executeAt: new Date(data.executeAt) }),
				...(data.payload !== undefined && { payload: data.payload }),
				...(data.status !== undefined && { status: data.status }),
				updatedAt: new Date(),
			})
			.where(eq(scheduledTasks.id, id))
			.returning()

		if (!schedule) serverError('Failed to update schedule')

		return serializeSchedule(schedule)
	})

/**
 * Delete schedule
 */
export const remove = requireAdmin
	.route({ method: 'DELETE', path: '/schedules/{id}' })
	.input(IdParamSchema)
	.output(SuccessSchema)
	.handler(async ({ input, context }) => {
		const { db } = context

		const result = await db.delete(scheduledTasks).where(eq(scheduledTasks.id, input.id)).returning()

		if (result.length === 0) notFound('Schedule not found')

		return { success: true }
	})

/**
 * Pause schedule
 */
export const pause = requireWrite
	.route({ method: 'POST', path: '/schedules/{id}/pause' })
	.input(IdParamSchema)
	.output(ScheduleSchema)
	.handler(async ({ input, context }) => {
		const { db } = context

		const existing = await findSchedule(input.id, db)
		if (!existing) notFound('Schedule not found')

		const [schedule] = await db
			.update(scheduledTasks)
			.set({ status: config.enums.scheduleStatus.PAUSED, updatedAt: new Date() })
			.where(eq(scheduledTasks.id, input.id))
			.returning()

		if (!schedule) serverError('Failed to pause schedule')

		return serializeSchedule(schedule)
	})

/**
 * Resume schedule
 */
export const resume = requireWrite
	.route({ method: 'POST', path: '/schedules/{id}/resume' })
	.input(IdParamSchema)
	.output(ScheduleSchema)
	.handler(async ({ input, context }) => {
		const { db } = context

		const existing = await findSchedule(input.id, db)
		if (!existing) notFound('Schedule not found')

		const [schedule] = await db
			.update(scheduledTasks)
			.set({ status: config.enums.scheduleStatus.ACTIVE, updatedAt: new Date() })
			.where(eq(scheduledTasks.id, input.id))
			.returning()

		if (!schedule) serverError('Failed to resume schedule')

		return serializeSchedule(schedule)
	})

/**
 * Get execution history for a schedule
 */
export const getExecutions = requireWrite
	.route({ method: 'GET', path: '/schedules/{id}/executions' })
	.input(IdParamSchema)
	.output(z.object({ executions: z.array(ScheduleExecutionSchema) }))
	.handler(async ({ input, context }) => {
		const { db } = context

		const schedule = await findSchedule(input.id, db)
		if (!schedule) notFound('Schedule not found')

		const executions = await db
			.select()
			.from(scheduleExecutions)
			.where(eq(scheduleExecutions.scheduleId, input.id))
			.orderBy(desc(scheduleExecutions.startedAt))
			.limit(100)

		return { executions: executions.map(serializeExecution) }
	})

// =============================================================================
// Router Export
// =============================================================================

export const schedulesRouter = {
	list,
	get,
	create,
	update,
	delete: remove,
	pause,
	resume,
	getExecutions,
}
