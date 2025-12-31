import {
	Config,
	EXECUTION_STATUSES,
	ExecutionStatus,
	SCHEDULE_STATUSES,
	SCHEDULE_TYPES,
	ScheduleStatus,
	ScheduleType,
} from '@hare/config'
import { createId } from '../id'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { agents } from './agents'
import { users } from './auth'

/**
 * Scheduled tasks table
 *
 * Stores scheduled tasks for agents with support for both
 * one-time and recurring (cron) schedules.
 */
export const scheduledTasks = sqliteTable('scheduled_tasks', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => createId()),
	agentId: text('agentId')
		.notNull()
		.references(() => agents.id, { onDelete: 'cascade' }),
	type: text('type', { enum: SCHEDULE_TYPES }).notNull().$type<ScheduleType>(),
	// For one-time schedules: timestamp when to execute
	executeAt: integer('executeAt', { mode: 'timestamp' }),
	// For recurring schedules: cron expression
	cron: text('cron'),
	// Action to perform (e.g., 'sendReminder', 'runMaintenance')
	action: text('action').notNull(),
	// JSON payload for the action
	payload: text('payload', { mode: 'json' }).$type<Record<string, unknown>>(),
	status: text('status', { enum: SCHEDULE_STATUSES })
		.notNull()
		.default(Config.defaults.scheduleStatus)
		.$type<ScheduleStatus>(),
	// Last execution timestamp
	lastExecutedAt: integer('lastExecutedAt', { mode: 'timestamp' }),
	// Next execution timestamp (calculated for recurring)
	nextExecuteAt: integer('nextExecuteAt', { mode: 'timestamp' }),
	// Number of times executed
	executionCount: integer('executionCount').notNull().default(0),
	// Created by user
	createdBy: text('createdBy')
		.notNull()
		.references(() => users.id),
	createdAt: integer('createdAt', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer('updatedAt', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
})

/**
 * Schedule execution history table
 *
 * Tracks each execution of a scheduled task.
 */
export const scheduleExecutions = sqliteTable('schedule_executions', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => createId()),
	scheduleId: text('scheduleId')
		.notNull()
		.references(() => scheduledTasks.id, { onDelete: 'cascade' }),
	agentId: text('agentId')
		.notNull()
		.references(() => agents.id, { onDelete: 'cascade' }),
	status: text('status', { enum: EXECUTION_STATUSES }).notNull().$type<ExecutionStatus>(),
	// Start and end timestamps
	startedAt: integer('startedAt', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	completedAt: integer('completedAt', { mode: 'timestamp' }),
	// Duration in milliseconds
	durationMs: integer('durationMs'),
	// Result or error message
	result: text('result', { mode: 'json' }).$type<{
		success?: boolean
		message?: string
		data?: unknown
		error?: string
	}>(),
	// Error details if failed
	error: text('error'),
})
