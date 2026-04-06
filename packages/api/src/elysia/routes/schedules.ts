/**
 * Schedule Routes
 *
 * CRUD operations for scheduled tasks, pause/resume, and execution history.
 */

import { config, EXECUTION_STATUSES, SCHEDULE_STATUSES, SCHEDULE_TYPES } from '@hare/config'
import { agents, scheduledTasks, scheduleExecutions } from '@hare/db/schema'
import type { Database } from '@hare/db'
import { and, desc, eq } from 'drizzle-orm'
import { Elysia } from 'elysia'
import { z } from 'zod'
import { adminPlugin, writePlugin } from '../context'

// =============================================================================
// Schemas
// =============================================================================

const ScheduleTypeSchema = z.enum(SCHEDULE_TYPES)
type ScheduleType = z.infer<typeof ScheduleTypeSchema>

const ScheduleStatusSchema = z.enum(SCHEDULE_STATUSES)

const ExecutionStatusSchema = z.enum(EXECUTION_STATUSES)
type ExecutionStatus = z.infer<typeof ExecutionStatusSchema>

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

// =============================================================================
// Helpers
// =============================================================================

function serializeSchedule(schedule: typeof scheduledTasks.$inferSelect) {
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

function serializeExecution(execution: typeof scheduleExecutions.$inferSelect) {
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

async function findSchedule(id: string, db: Database) {
	const [schedule] = await db.select().from(scheduledTasks).where(eq(scheduledTasks.id, id))
	return schedule || null
}

// =============================================================================
// Routes
// =============================================================================

export const scheduleRoutes = new Elysia({ prefix: '/schedules', name: 'schedule-routes' })
	// --- Write-access routes ---
	.use(writePlugin)

	// List schedules
	.get('/', async ({ db, workspaceId, query }) => {
		const agentId = query?.agentId

		const workspaceAgents = await db
			.select({ id: agents.id })
			.from(agents)
			.where(eq(agents.workspaceId, workspaceId))
		const agentIds = workspaceAgents.map((a) => a.id)

		if (agentIds.length === 0) {
			return { schedules: [] }
		}

		let results: (typeof scheduledTasks.$inferSelect)[]
		if (agentId) {
			if (!agentIds.includes(agentId)) {
				return { schedules: [] }
			}
			results = await db
				.select()
				.from(scheduledTasks)
				.where(eq(scheduledTasks.agentId, agentId))
		} else {
			results = []
			for (const id of agentIds) {
				const agentSchedules = await db
					.select()
					.from(scheduledTasks)
					.where(eq(scheduledTasks.agentId, id))
				results.push(...agentSchedules)
			}
		}

		return { schedules: results.map(serializeSchedule) }
	}, { writeAccess: true })

	// Get schedule
	.get('/:id', async ({ db, params, error }) => {
		const schedule = await findSchedule(params.id, db)
		if (!schedule) return error(404, { error: 'Schedule not found' })
		return serializeSchedule(schedule)
	}, { writeAccess: true })

	// Create schedule
	.post('/', async ({ db, workspaceId, user, body, error }) => {
		const [agent] = await db
			.select()
			.from(agents)
			.where(and(eq(agents.id, body.agentId), eq(agents.workspaceId, workspaceId)))

		if (!agent) return error(400, { error: 'Agent not found' })

		const [schedule] = await db
			.insert(scheduledTasks)
			.values({
				agentId: body.agentId,
				type: body.type,
				action: body.action,
				cron: body.cron,
				executeAt: body.executeAt ? new Date(body.executeAt) : undefined,
				payload: body.payload,
				status: config.enums.scheduleStatus.ACTIVE,
				createdBy: user.id,
			})
			.returning()

		if (!schedule) throw new Error('Failed to create schedule')

		return serializeSchedule(schedule)
	}, { writeAccess: true, body: CreateScheduleInputSchema })

	// Update schedule
	.patch('/:id', async ({ db, params, body, error }) => {
		const existing = await findSchedule(params.id, db)
		if (!existing) return error(404, { error: 'Schedule not found' })

		const [schedule] = await db
			.update(scheduledTasks)
			.set({
				...(body.action !== undefined && { action: body.action }),
				...(body.cron !== undefined && { cron: body.cron }),
				...(body.executeAt !== undefined && { executeAt: new Date(body.executeAt) }),
				...(body.payload !== undefined && { payload: body.payload }),
				...(body.status !== undefined && { status: body.status }),
				updatedAt: new Date(),
			})
			.where(eq(scheduledTasks.id, params.id))
			.returning()

		if (!schedule) throw new Error('Failed to update schedule')

		return serializeSchedule(schedule)
	}, { writeAccess: true, body: UpdateScheduleInputSchema })

	// Pause schedule
	.post('/:id/pause', async ({ db, params, error }) => {
		const existing = await findSchedule(params.id, db)
		if (!existing) return error(404, { error: 'Schedule not found' })

		const [schedule] = await db
			.update(scheduledTasks)
			.set({ status: config.enums.scheduleStatus.PAUSED, updatedAt: new Date() })
			.where(eq(scheduledTasks.id, params.id))
			.returning()

		if (!schedule) throw new Error('Failed to pause schedule')

		return serializeSchedule(schedule)
	}, { writeAccess: true })

	// Resume schedule
	.post('/:id/resume', async ({ db, params, error }) => {
		const existing = await findSchedule(params.id, db)
		if (!existing) return error(404, { error: 'Schedule not found' })

		const [schedule] = await db
			.update(scheduledTasks)
			.set({ status: config.enums.scheduleStatus.ACTIVE, updatedAt: new Date() })
			.where(eq(scheduledTasks.id, params.id))
			.returning()

		if (!schedule) throw new Error('Failed to resume schedule')

		return serializeSchedule(schedule)
	}, { writeAccess: true })

	// Get execution history
	.get('/:id/executions', async ({ db, params, error }) => {
		const schedule = await findSchedule(params.id, db)
		if (!schedule) return error(404, { error: 'Schedule not found' })

		const executions = await db
			.select()
			.from(scheduleExecutions)
			.where(eq(scheduleExecutions.scheduleId, params.id))
			.orderBy(desc(scheduleExecutions.startedAt))
			.limit(100)

		return { executions: executions.map(serializeExecution) }
	}, { writeAccess: true })

	// --- Admin-access routes ---
	.use(adminPlugin)

	// Delete schedule
	.delete('/:id', async ({ db, params, error }) => {
		const result = await db
			.delete(scheduledTasks)
			.where(eq(scheduledTasks.id, params.id))
			.returning()

		if (result.length === 0) return error(404, { error: 'Schedule not found' })

		return { success: true }
	}, { adminAccess: true })
