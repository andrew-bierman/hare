/**
 * Schedule API Schemas
 *
 * Zod schemas for scheduled task request/response validation.
 */

import { config, EXECUTION_STATUSES, SCHEDULE_STATUSES, SCHEDULE_TYPES } from '@hare/config'
import { z } from 'zod'

// Schedule type enum
export const ScheduleTypeSchema = z.enum(SCHEDULE_TYPES)

// Schedule status enum
export const ScheduleStatusSchema = z.enum(SCHEDULE_STATUSES)

// Execution status enum
export const ExecutionStatusSchema = z.enum(EXECUTION_STATUSES)

// Create schedule input
export const CreateScheduleSchema = z
	.object({
		type: ScheduleTypeSchema.describe('Schedule type: one-time or recurring'),
		executeAt: z.string().datetime().optional().describe('ISO timestamp for one-time execution'),
		cron: z.string().optional().describe('Cron expression for recurring schedules'),
		action: z.string().min(1).describe('Action to perform (e.g., sendReminder, runMaintenance)'),
		payload: z.record(z.string(), z.unknown()).optional().describe('JSON payload for the action'),
	})
	.refine(
		(data) => {
			if (data.type === config.enums.scheduleType.ONE_TIME && !data.executeAt) {
				return false
			}
			if (data.type === config.enums.scheduleType.RECURRING && !data.cron) {
				return false
			}
			return true
		},
		{
			message: 'one-time schedules require executeAt, recurring schedules require cron',
		},
	)

// Update schedule input
export const UpdateScheduleSchema = z.object({
	status: ScheduleStatusSchema.optional().describe('Update schedule status'),
	executeAt: z.string().datetime().optional().describe('Update execution time'),
	cron: z.string().optional().describe('Update cron expression'),
	payload: z.record(z.string(), z.unknown()).optional().describe('Update payload'),
})

// Schedule response
export const ScheduleSchema = z.object({
	id: z.string().describe('Schedule ID'),
	agentId: z.string().describe('Agent ID'),
	type: ScheduleTypeSchema,
	executeAt: z.string().datetime().nullable().describe('Execution timestamp'),
	cron: z.string().nullable().describe('Cron expression'),
	action: z.string().describe('Action to perform'),
	payload: z.record(z.string(), z.unknown()).nullable().describe('Action payload'),
	status: ScheduleStatusSchema,
	lastExecutedAt: z.string().datetime().nullable().describe('Last execution timestamp'),
	nextExecuteAt: z.string().datetime().nullable().describe('Next execution timestamp'),
	executionCount: z.number().describe('Number of times executed'),
	createdAt: z.string().datetime().describe('Creation timestamp'),
	updatedAt: z.string().datetime().describe('Last update timestamp'),
})

// Execution result
export const ExecutionResultSchema = z.object({
	success: z.boolean().optional(),
	message: z.string().optional(),
	data: z.unknown().optional(),
	error: z.string().optional(),
})

// Execution history entry
export const ScheduleExecutionSchema = z.object({
	id: z.string().describe('Execution ID'),
	scheduleId: z.string().describe('Schedule ID'),
	agentId: z.string().describe('Agent ID'),
	status: ExecutionStatusSchema,
	startedAt: z.string().datetime().describe('Execution start timestamp'),
	completedAt: z.string().datetime().nullable().describe('Execution end timestamp'),
	durationMs: z.number().nullable().describe('Duration in milliseconds'),
	result: ExecutionResultSchema.nullable().describe('Execution result'),
	error: z.string().nullable().describe('Error message if failed'),
})

// List schedules response
export const ScheduleListSchema = z.object({
	schedules: z.array(ScheduleSchema),
})

// Execution history response
export const ExecutionHistorySchema = z.object({
	executions: z.array(ScheduleExecutionSchema),
	total: z.number().describe('Total number of executions'),
})
