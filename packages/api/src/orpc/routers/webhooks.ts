/**
 * Webhooks Router (oRPC)
 *
 * Manages webhook subscriptions for agents.
 */

import { z } from 'zod'
import { and, count, desc, eq } from 'drizzle-orm'
import {
	agents,
	WEBHOOK_DELIVERY_STATUSES,
	WEBHOOK_EVENT_TYPES,
	WEBHOOK_STATUSES,
	webhookDeliveries,
	webhookLogs,
	webhooks,
} from '@hare/db'
import { requireWrite, requireAdmin, notFound, serverError } from '../base'
import { generateWebhookSecret, reactivateWebhook, retryDelivery } from '../../services/webhooks'

// =============================================================================
// Schemas
// =============================================================================

const webhookEventTypeSchema = z.enum(WEBHOOK_EVENT_TYPES)
const webhookStatusSchema = z.enum(WEBHOOK_STATUSES)

const webhookSchema = z.object({
	id: z.string(),
	agentId: z.string(),
	url: z.string().url(),
	secret: z.string(),
	events: z.array(webhookEventTypeSchema),
	status: webhookStatusSchema,
	description: z.string().nullable(),
	createdAt: z.string(),
	updatedAt: z.string(),
})

const webhookLogSchema = z.object({
	id: z.string(),
	webhookId: z.string(),
	event: z.string(),
	payload: z.record(z.string(), z.unknown()),
	status: z.enum(['success', 'failed', 'pending']),
	responseStatus: z.number().nullable(),
	responseBody: z.string().nullable(),
	attempts: z.number(),
	error: z.string().nullable(),
	createdAt: z.string(),
	completedAt: z.string().nullable(),
})

const webhookDeliveryStatusSchema = z.enum(WEBHOOK_DELIVERY_STATUSES)

const webhookDeliverySchema = z.object({
	id: z.string(),
	webhookId: z.string(),
	event: z.string(),
	payload: z.record(z.string(), z.unknown()),
	status: webhookDeliveryStatusSchema,
	statusCode: z.number().nullable(),
	responseBody: z.string().nullable(),
	attemptCount: z.number(),
	nextRetryAt: z.string().nullable(),
	createdAt: z.string(),
})

// =============================================================================
// Helpers
// =============================================================================

function serializeWebhook(webhook: typeof webhooks.$inferSelect) {
	return {
		id: webhook.id,
		agentId: webhook.agentId,
		url: webhook.url,
		secret: webhook.secret,
		events: webhook.events,
		status: webhook.status,
		description: webhook.description,
		createdAt: webhook.createdAt.toISOString(),
		updatedAt: webhook.updatedAt.toISOString(),
	}
}

function serializeWebhookLog(log: typeof webhookLogs.$inferSelect) {
	return {
		id: log.id,
		webhookId: log.webhookId,
		event: log.event,
		payload: log.payload,
		status: log.status,
		responseStatus: log.responseStatus,
		responseBody: log.responseBody,
		attempts: log.attempts,
		error: log.error,
		createdAt: log.createdAt.toISOString(),
		completedAt: log.completedAt?.toISOString() ?? null,
	}
}

function serializeWebhookDelivery(delivery: typeof webhookDeliveries.$inferSelect) {
	return {
		id: delivery.id,
		webhookId: delivery.webhookId,
		event: delivery.event,
		payload: delivery.payload,
		status: delivery.status,
		statusCode: delivery.statusCode,
		responseBody: delivery.responseBody,
		attemptCount: delivery.attemptCount,
		nextRetryAt: delivery.nextRetryAt?.toISOString() ?? null,
		createdAt: delivery.createdAt.toISOString(),
	}
}

// =============================================================================
// Procedures
// =============================================================================

/**
 * List webhooks for an agent
 */
const list = requireWrite
	.route({ method: 'GET', path: '/agents/{agentId}/webhooks' })
	.input(z.object({ agentId: z.string() }))
	.output(z.object({ webhooks: z.array(webhookSchema) }))
	.handler(async ({ input, context }) => {
		const { db, workspaceId } = context

		// Verify agent exists and belongs to workspace
		const [agent] = await db
			.select()
			.from(agents)
			.where(and(eq(agents.id, input.agentId), eq(agents.workspaceId, workspaceId)))

		if (!agent) {
			notFound('Agent not found')
		}

		const results = await db.select().from(webhooks).where(eq(webhooks.agentId, input.agentId))

		return { webhooks: results.map(serializeWebhook) }
	})

/**
 * Create a new webhook
 */
const create = requireWrite
	.route({ method: 'POST', path: '/agents/{agentId}/webhooks' })
	.input(
		z.object({
			agentId: z.string(),
			url: z.string().url(),
			events: z.array(webhookEventTypeSchema).min(1),
			description: z.string().nullish(),
		}),
	)
	.output(webhookSchema)
	.handler(async ({ input, context }) => {
		const { db, workspaceId } = context

		const [agent] = await db
			.select()
			.from(agents)
			.where(and(eq(agents.id, input.agentId), eq(agents.workspaceId, workspaceId)))

		if (!agent) {
			notFound('Agent not found')
		}

		const secret = generateWebhookSecret()

		const [webhook] = await db
			.insert(webhooks)
			.values({
				agentId: input.agentId,
				url: input.url,
				secret,
				events: input.events,
				description: input.description,
				status: 'active',
			})
			.returning()

		if (!webhook) {
			serverError('Failed to create webhook')
		}

		return serializeWebhook(webhook)
	})

/**
 * Get webhook details
 */
const get = requireWrite
	.route({ method: 'GET', path: '/agents/{agentId}/webhooks/{webhookId}' })
	.input(z.object({ agentId: z.string(), webhookId: z.string() }))
	.output(webhookSchema)
	.handler(async ({ input, context }) => {
		const { db, workspaceId } = context

		const [agent] = await db
			.select()
			.from(agents)
			.where(and(eq(agents.id, input.agentId), eq(agents.workspaceId, workspaceId)))

		if (!agent) {
			notFound('Agent not found')
		}

		const [webhook] = await db
			.select()
			.from(webhooks)
			.where(and(eq(webhooks.id, input.webhookId), eq(webhooks.agentId, input.agentId)))

		if (!webhook) {
			notFound('Webhook not found')
		}

		return serializeWebhook(webhook)
	})

/**
 * Update a webhook
 */
const update = requireWrite
	.route({ method: 'PATCH', path: '/agents/{agentId}/webhooks/{webhookId}' })
	.input(
		z.object({
			agentId: z.string(),
			webhookId: z.string(),
			url: z.string().url().optional(),
			events: z.array(webhookEventTypeSchema).min(1).optional(),
			status: webhookStatusSchema.optional(),
			description: z.string().nullish(),
		}),
	)
	.output(webhookSchema)
	.handler(async ({ input, context }) => {
		const { db, workspaceId } = context

		const [agent] = await db
			.select()
			.from(agents)
			.where(and(eq(agents.id, input.agentId), eq(agents.workspaceId, workspaceId)))

		if (!agent) {
			notFound('Agent not found')
		}

		const [existing] = await db
			.select()
			.from(webhooks)
			.where(and(eq(webhooks.id, input.webhookId), eq(webhooks.agentId, input.agentId)))

		if (!existing) {
			notFound('Webhook not found')
		}

		// Handle reactivation
		if (input.status === 'active' && existing.status === 'failed') {
			await reactivateWebhook({ db, webhookId: input.webhookId })
		}

		const updateData: Partial<typeof webhooks.$inferInsert> = {
			updatedAt: new Date(),
			...(input.url !== undefined && { url: input.url }),
			...(input.events !== undefined && { events: input.events }),
			...(input.status !== undefined && { status: input.status }),
			...(input.description !== undefined && { description: input.description }),
		}

		const [webhook] = await db
			.update(webhooks)
			.set(updateData)
			.where(eq(webhooks.id, input.webhookId))
			.returning()

		if (!webhook) {
			serverError('Failed to update webhook')
		}

		return serializeWebhook(webhook)
	})

/**
 * Delete a webhook (admin only)
 */
const deleteWebhook = requireAdmin
	.route({ method: 'DELETE', path: '/agents/{agentId}/webhooks/{webhookId}' })
	.input(z.object({ agentId: z.string(), webhookId: z.string() }))
	.output(z.object({ success: z.boolean() }))
	.handler(async ({ input, context }) => {
		const { db, workspaceId } = context

		const [agent] = await db
			.select()
			.from(agents)
			.where(and(eq(agents.id, input.agentId), eq(agents.workspaceId, workspaceId)))

		if (!agent) {
			notFound('Agent not found')
		}

		const result = await db
			.delete(webhooks)
			.where(and(eq(webhooks.id, input.webhookId), eq(webhooks.agentId, input.agentId)))
			.returning()

		if (result.length === 0) {
			notFound('Webhook not found')
		}

		return { success: true }
	})

/**
 * Get webhook delivery logs
 */
const getLogs = requireWrite
	.route({ method: 'GET', path: '/agents/{agentId}/webhooks/{webhookId}/logs' })
	.input(
		z.object({
			agentId: z.string(),
			webhookId: z.string(),
			limit: z.number().optional().default(50),
			offset: z.number().optional().default(0),
		}),
	)
	.output(z.object({ logs: z.array(webhookLogSchema), total: z.number() }))
	.handler(async ({ input, context }) => {
		const { db, workspaceId } = context

		const [agent] = await db
			.select()
			.from(agents)
			.where(and(eq(agents.id, input.agentId), eq(agents.workspaceId, workspaceId)))

		if (!agent) {
			notFound('Agent not found')
		}

		const [webhook] = await db
			.select()
			.from(webhooks)
			.where(and(eq(webhooks.id, input.webhookId), eq(webhooks.agentId, input.agentId)))

		if (!webhook) {
			notFound('Webhook not found')
		}

		const logs = await db
			.select()
			.from(webhookLogs)
			.where(eq(webhookLogs.webhookId, input.webhookId))
			.orderBy(desc(webhookLogs.createdAt))
			.limit(input.limit)
			.offset(input.offset)

		const allLogs = await db
			.select({ id: webhookLogs.id })
			.from(webhookLogs)
			.where(eq(webhookLogs.webhookId, input.webhookId))

		return {
			logs: logs.map(serializeWebhookLog),
			total: allLogs.length,
		}
	})

/**
 * Regenerate webhook secret (admin only)
 */
const regenerateSecret = requireAdmin
	.route({ method: 'POST', path: '/agents/{agentId}/webhooks/{webhookId}/regenerate-secret' })
	.input(z.object({ agentId: z.string(), webhookId: z.string() }))
	.output(z.object({ secret: z.string() }))
	.handler(async ({ input, context }) => {
		const { db, workspaceId } = context

		const [agent] = await db
			.select()
			.from(agents)
			.where(and(eq(agents.id, input.agentId), eq(agents.workspaceId, workspaceId)))

		if (!agent) {
			notFound('Agent not found')
		}

		const [existing] = await db
			.select()
			.from(webhooks)
			.where(and(eq(webhooks.id, input.webhookId), eq(webhooks.agentId, input.agentId)))

		if (!existing) {
			notFound('Webhook not found')
		}

		const newSecret = generateWebhookSecret()

		await db
			.update(webhooks)
			.set({
				secret: newSecret,
				updatedAt: new Date(),
			})
			.where(eq(webhooks.id, input.webhookId))

		return { secret: newSecret }
	})

/**
 * List webhook deliveries
 * GET /webhooks/{webhookId}/deliveries
 */
const listDeliveries = requireWrite
	.route({ method: 'GET', path: '/webhooks/{webhookId}/deliveries' })
	.input(
		z.object({
			webhookId: z.string(),
			limit: z.number().min(1).max(100).optional().default(20),
			offset: z.number().min(0).optional().default(0),
		}),
	)
	.output(
		z.object({
			deliveries: z.array(webhookDeliverySchema),
			total: z.number(),
			limit: z.number(),
			offset: z.number(),
		}),
	)
	.handler(async ({ input, context }) => {
		const { db, workspaceId } = context

		// Find the webhook and verify it belongs to an agent in the user's workspace
		const [webhook] = await db.select().from(webhooks).where(eq(webhooks.id, input.webhookId))

		if (!webhook) {
			notFound('Webhook not found')
		}

		// Verify the agent belongs to the user's workspace
		const [agent] = await db
			.select()
			.from(agents)
			.where(and(eq(agents.id, webhook.agentId), eq(agents.workspaceId, workspaceId)))

		if (!agent) {
			notFound('Webhook not found')
		}

		// Get deliveries sorted by createdAt descending
		const deliveries = await db
			.select()
			.from(webhookDeliveries)
			.where(eq(webhookDeliveries.webhookId, input.webhookId))
			.orderBy(desc(webhookDeliveries.createdAt))
			.limit(input.limit)
			.offset(input.offset)

		// Get total count
		const [totalResult] = await db
			.select({ count: count() })
			.from(webhookDeliveries)
			.where(eq(webhookDeliveries.webhookId, input.webhookId))

		return {
			deliveries: deliveries.map(serializeWebhookDelivery),
			total: totalResult?.count ?? 0,
			limit: input.limit,
			offset: input.offset,
		}
	})

/**
 * Retry a failed webhook delivery
 * POST /webhooks/{webhookId}/deliveries/{deliveryId}/retry
 */
const retryDeliveryEndpoint = requireWrite
	.route({ method: 'POST', path: '/webhooks/{webhookId}/deliveries/{deliveryId}/retry' })
	.input(z.object({ webhookId: z.string(), deliveryId: z.string() }))
	.output(webhookDeliverySchema)
	.handler(async ({ input, context }) => {
		const { db, workspaceId } = context

		// Find the webhook and verify it belongs to an agent in the user's workspace
		const [webhook] = await db.select().from(webhooks).where(eq(webhooks.id, input.webhookId))

		if (!webhook) {
			notFound('Webhook not found')
		}

		// Verify the agent belongs to the user's workspace
		const [agent] = await db
			.select()
			.from(agents)
			.where(and(eq(agents.id, webhook.agentId), eq(agents.workspaceId, workspaceId)))

		if (!agent) {
			notFound('Webhook not found')
		}

		// Find the delivery
		const [delivery] = await db
			.select()
			.from(webhookDeliveries)
			.where(
				and(
					eq(webhookDeliveries.id, input.deliveryId),
					eq(webhookDeliveries.webhookId, input.webhookId),
				),
			)

		if (!delivery) {
			notFound('Delivery not found')
		}

		// Retry the delivery
		const updatedDelivery = await retryDelivery({
			db,
			deliveryId: input.deliveryId,
			webhook: {
				id: webhook.id,
				url: webhook.url,
				secret: webhook.secret,
			},
		})

		return serializeWebhookDelivery(updatedDelivery)
	})

// =============================================================================
// Export
// =============================================================================

export const webhooksRouter = {
	list,
	create,
	get,
	update,
	delete: deleteWebhook,
	getLogs,
	regenerateSecret,
	listDeliveries,
	retryDelivery: retryDeliveryEndpoint,
}
