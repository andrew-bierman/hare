import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { createId } from '../id'
import { webhooks } from './webhooks'

/**
 * Webhook delivery status options.
 */
export const WEBHOOK_DELIVERY_STATUSES = ['pending', 'success', 'failed'] as const

export type WebhookDeliveryStatus = (typeof WEBHOOK_DELIVERY_STATUSES)[number]

/**
 * Webhook deliveries table - stores delivery attempts for debugging.
 *
 * Each row represents a webhook delivery attempt including the event,
 * payload, response details, and retry information for debugging purposes.
 */
export const webhookDeliveries = sqliteTable(
	'webhook_deliveries',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => createId()),
		webhookId: text('webhookId')
			.notNull()
			.references(() => webhooks.id, { onDelete: 'cascade' }),
		event: text('event').notNull(),
		payload: text('payload', { mode: 'json' }).$type<Record<string, unknown>>().notNull(),
		status: text('status', { enum: WEBHOOK_DELIVERY_STATUSES }).notNull().default('pending'),
		statusCode: integer('statusCode'),
		responseBody: text('responseBody'),
		attemptCount: integer('attemptCount').notNull().default(0),
		nextRetryAt: integer('nextRetryAt', { mode: 'timestamp' }),
		createdAt: integer('createdAt', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date()),
	},
	(table) => [
		index('webhook_deliveries_webhook_id_idx').on(table.webhookId),
		index('webhook_deliveries_created_at_idx').on(table.createdAt),
	],
)
