import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { createId } from '../id'
import { agents } from './agents'

/**
 * Webhook event types that can trigger notifications.
 */
export const WEBHOOK_EVENT_TYPES = [
	'message.received',
	'message.sent',
	'tool.called',
	'error',
	'agent.deployed',
] as const

export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number]

/**
 * Webhook status options.
 */
export const WEBHOOK_STATUSES = ['active', 'inactive', 'failed'] as const

export type WebhookStatus = (typeof WEBHOOK_STATUSES)[number]

/**
 * Webhooks table - stores webhook configurations for agents.
 *
 * Webhooks allow agents to send notifications to external services
 * when specific events occur (messages, tool calls, errors, etc.).
 */
export const webhooks = sqliteTable(
	'webhooks',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => createId()),
		agentId: text('agentId')
			.notNull()
			.references(() => agents.id, { onDelete: 'cascade' }),
		url: text('url').notNull(),
		secret: text('secret').notNull(),
		events: text('events', { mode: 'json' }).$type<WebhookEventType[]>().notNull(),
		status: text('status', { enum: WEBHOOK_STATUSES }).notNull().default('active'),
		description: text('description'),
		createdAt: integer('createdAt', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date()),
		updatedAt: integer('updatedAt', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date()),
	},
	(table) => ({
		agentIdx: index('webhooks_agent_idx').on(table.agentId),
		statusIdx: index('webhooks_status_idx').on(table.status),
	}),
)

/**
 * Webhook delivery log status options.
 */
export const WEBHOOK_LOG_STATUSES = ['success', 'failed', 'pending'] as const

export type WebhookLogStatus = (typeof WEBHOOK_LOG_STATUSES)[number]

/**
 * Webhook logs table - stores delivery history for webhooks.
 *
 * Each row represents an attempt to deliver a webhook payload
 * to the configured URL, including response details for debugging.
 */
export const webhookLogs = sqliteTable(
	'webhook_logs',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => createId()),
		webhookId: text('webhookId')
			.notNull()
			.references(() => webhooks.id, { onDelete: 'cascade' }),
		event: text('event').notNull(),
		payload: text('payload', { mode: 'json' }).$type<Record<string, unknown>>().notNull(),
		status: text('status', { enum: WEBHOOK_LOG_STATUSES }).notNull().default('pending'),
		responseStatus: integer('responseStatus'),
		responseBody: text('responseBody'),
		attempts: integer('attempts').notNull().default(1),
		error: text('error'),
		createdAt: integer('createdAt', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date()),
		completedAt: integer('completedAt', { mode: 'timestamp' }),
	},
	(table) => ({
		webhookIdx: index('webhook_logs_webhook_idx').on(table.webhookId),
		statusIdx: index('webhook_logs_status_idx').on(table.status),
		createdAtIdx: index('webhook_logs_created_at_idx').on(table.createdAt),
	}),
)
