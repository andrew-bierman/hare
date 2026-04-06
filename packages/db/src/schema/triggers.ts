import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { createId } from '../id'
import { agents } from './agents'
import { users } from './auth'

/**
 * Agent Triggers - event-driven agent activation.
 * Supports webhook, email, cron, and manual trigger types.
 */

export const TRIGGER_TYPES = ['webhook', 'email', 'cron', 'manual'] as const
export type TriggerType = (typeof TRIGGER_TYPES)[number]

export const TRIGGER_STATUSES = ['active', 'inactive', 'error'] as const
export type TriggerStatus = (typeof TRIGGER_STATUSES)[number]

export const TRIGGER_EXECUTION_STATUSES = ['pending', 'running', 'completed', 'failed'] as const
export type TriggerExecutionStatus = (typeof TRIGGER_EXECUTION_STATUSES)[number]

export const agentTriggers = sqliteTable(
	'agent_triggers',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => createId()),
		agentId: text('agentId')
			.notNull()
			.references(() => agents.id, { onDelete: 'cascade' }),
		type: text('type', { enum: TRIGGER_TYPES }).notNull().$type<TriggerType>(),
		name: text('name').notNull(),
		description: text('description'),
		/** Type-specific config: webhook={secret}, email={allowedSenders,subjectFilter}, cron={expression,timezone} */
		config: text('config', { mode: 'json' }).$type<Record<string, unknown>>(),
		enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
		status: text('status', { enum: TRIGGER_STATUSES })
			.notNull()
			.default('active')
			.$type<TriggerStatus>(),
		/** Unique path for webhook URLs: /api/triggers/webhook/{webhookPath} */
		webhookPath: text('webhookPath').unique(),
		lastTriggeredAt: integer('lastTriggeredAt', { mode: 'timestamp' }),
		triggerCount: integer('triggerCount').notNull().default(0),
		createdBy: text('createdBy')
			.notNull()
			.references(() => users.id),
		createdAt: integer('createdAt', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date()),
		updatedAt: integer('updatedAt', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date()),
	},
	(table) => [
		index('agent_triggers_agent_idx').on(table.agentId),
		index('agent_triggers_type_idx').on(table.type),
		index('agent_triggers_status_idx').on(table.status),
		index('agent_triggers_webhook_path_idx').on(table.webhookPath),
	],
)

export const triggerExecutions = sqliteTable(
	'trigger_executions',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => createId()),
		triggerId: text('triggerId')
			.notNull()
			.references(() => agentTriggers.id, { onDelete: 'cascade' }),
		agentId: text('agentId')
			.notNull()
			.references(() => agents.id, { onDelete: 'cascade' }),
		status: text('status', { enum: TRIGGER_EXECUTION_STATUSES })
			.notNull()
			.$type<TriggerExecutionStatus>(),
		input: text('input', { mode: 'json' }).$type<Record<string, unknown>>(),
		output: text('output', { mode: 'json' }).$type<Record<string, unknown>>(),
		startedAt: integer('startedAt', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date()),
		completedAt: integer('completedAt', { mode: 'timestamp' }),
		durationMs: integer('durationMs'),
		error: text('error'),
	},
	(table) => [
		index('trigger_executions_trigger_idx').on(table.triggerId),
		index('trigger_executions_agent_idx').on(table.agentId),
		index('trigger_executions_status_idx').on(table.status),
		index('trigger_executions_started_at_idx').on(table.startedAt),
	],
)
