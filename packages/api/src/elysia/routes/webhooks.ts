/**
 * Webhook Routes
 *
 * Webhook subscriptions, delivery logs, retry, and secret regeneration.
 */

import {
	agents,
	WEBHOOK_DELIVERY_STATUSES,
	WEBHOOK_EVENT_TYPES,
	WEBHOOK_STATUSES,
	webhookDeliveries,
	webhookLogs,
	webhooks,
} from '@hare/db'
import type { Database } from '@hare/db'
import { and, count, desc, eq } from 'drizzle-orm'
import { Elysia, status } from 'elysia'
import { z } from 'zod'
import {
	generateWebhookSecret,
	isWebhookUrlSafe,
	reactivateWebhook,
	retryDelivery,
} from '../../services/webhooks'
import { adminPlugin, writePlugin } from '../context'

// =============================================================================
// Schemas
// =============================================================================

const webhookEventTypeSchema = z.enum(WEBHOOK_EVENT_TYPES)
const webhookStatusSchema = z.enum(WEBHOOK_STATUSES)

const CreateWebhookInputSchema = z.object({
	url: z.string().url(),
	events: z.array(webhookEventTypeSchema).min(1),
	description: z.string().nullish(),
})

const UpdateWebhookInputSchema = z.object({
	url: z.string().url().optional(),
	events: z.array(webhookEventTypeSchema).min(1).optional(),
	status: webhookStatusSchema.optional(),
	description: z.string().nullish(),
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

async function verifyAgentInWorkspace(agentId: string, workspaceId: string, db: Database) {
	const [agent] = await db
		.select()
		.from(agents)
		.where(and(eq(agents.id, agentId), eq(agents.workspaceId, workspaceId)))
	return agent || null
}

// =============================================================================
// Routes
// =============================================================================

export const webhookRoutes = new Elysia({ name: 'webhook-routes' })
	// --- Write-access routes ---
	.use(writePlugin)

	// List webhooks for an agent
	.get('/agents/:agentId/webhooks', async ({ db, workspaceId, params}) => {
		const agent = await verifyAgentInWorkspace(params.agentId, workspaceId, db)
		if (!agent) return status(404, { error: 'Agent not found' })

		const results = await db
			.select()
			.from(webhooks)
			.where(eq(webhooks.agentId, params.agentId))

		return { webhooks: results.map(serializeWebhook) }
	}, { writeAccess: true })

	// Create webhook
	.post('/agents/:agentId/webhooks', async ({ db, workspaceId, params, body}) => {
		const urlCheck = isWebhookUrlSafe(body.url)
		if (!urlCheck.safe) return status(400, { error: `Invalid webhook URL: ${urlCheck.reason}` })

		const agent = await verifyAgentInWorkspace(params.agentId, workspaceId, db)
		if (!agent) return status(404, { error: 'Agent not found' })

		const secret = generateWebhookSecret()

		const [webhook] = await db
			.insert(webhooks)
			.values({
				agentId: params.agentId,
				url: body.url,
				secret,
				events: body.events,
				description: body.description,
				status: 'active',
			})
			.returning()

		if (!webhook) throw new Error('Failed to create webhook')

		return serializeWebhook(webhook)
	}, { writeAccess: true, body: CreateWebhookInputSchema })

	// Get webhook details
	.get('/agents/:agentId/webhooks/:webhookId', async ({ db, workspaceId, params}) => {
		const agent = await verifyAgentInWorkspace(params.agentId, workspaceId, db)
		if (!agent) return status(404, { error: 'Agent not found' })

		const [webhook] = await db
			.select()
			.from(webhooks)
			.where(and(eq(webhooks.id, params.webhookId), eq(webhooks.agentId, params.agentId)))

		if (!webhook) return status(404, { error: 'Webhook not found' })

		return serializeWebhook(webhook)
	}, { writeAccess: true })

	// Update webhook
	.patch('/agents/:agentId/webhooks/:webhookId', async ({ db, workspaceId, params, body}) => {
		if (body.url) {
			const urlCheck = isWebhookUrlSafe(body.url)
			if (!urlCheck.safe) return status(400, { error: `Invalid webhook URL: ${urlCheck.reason}` })
		}

		const agent = await verifyAgentInWorkspace(params.agentId, workspaceId, db)
		if (!agent) return status(404, { error: 'Agent not found' })

		const [existing] = await db
			.select()
			.from(webhooks)
			.where(and(eq(webhooks.id, params.webhookId), eq(webhooks.agentId, params.agentId)))

		if (!existing) return status(404, { error: 'Webhook not found' })

		if (body.status === 'active' && existing.status === 'failed') {
			await reactivateWebhook({ db, webhookId: params.webhookId })
		}

		const updateData: Partial<typeof webhooks.$inferInsert> = {
			updatedAt: new Date(),
			...(body.url !== undefined && { url: body.url }),
			...(body.events !== undefined && { events: body.events }),
			...(body.status !== undefined && { status: body.status }),
			...(body.description !== undefined && { description: body.description }),
		}

		const [webhook] = await db
			.update(webhooks)
			.set(updateData)
			.where(eq(webhooks.id, params.webhookId))
			.returning()

		if (!webhook) throw new Error('Failed to update webhook')

		return serializeWebhook(webhook)
	}, { writeAccess: true, body: UpdateWebhookInputSchema })

	// Get webhook delivery logs
	.get('/agents/:agentId/webhooks/:webhookId/logs', async ({ db, workspaceId, params, query}) => {
		const agent = await verifyAgentInWorkspace(params.agentId, workspaceId, db)
		if (!agent) return status(404, { error: 'Agent not found' })

		const [webhook] = await db
			.select()
			.from(webhooks)
			.where(and(eq(webhooks.id, params.webhookId), eq(webhooks.agentId, params.agentId)))

		if (!webhook) return status(404, { error: 'Webhook not found' })

		const limit = Number(query?.limit) || 50
		const offset = Number(query?.offset) || 0

		const logs = await db
			.select()
			.from(webhookLogs)
			.where(eq(webhookLogs.webhookId, params.webhookId))
			.orderBy(desc(webhookLogs.createdAt))
			.limit(limit)
			.offset(offset)

		const allLogs = await db
			.select({ id: webhookLogs.id })
			.from(webhookLogs)
			.where(eq(webhookLogs.webhookId, params.webhookId))

		return { logs: logs.map(serializeWebhookLog), total: allLogs.length }
	}, { writeAccess: true })

	// List webhook deliveries
	.get('/webhooks/:webhookId/deliveries', async ({ db, workspaceId, params, query}) => {
		const [webhook] = await db.select().from(webhooks).where(eq(webhooks.id, params.webhookId))
		if (!webhook) return status(404, { error: 'Webhook not found' })

		const [agent] = await db
			.select()
			.from(agents)
			.where(and(eq(agents.id, webhook.agentId), eq(agents.workspaceId, workspaceId)))

		if (!agent) return status(404, { error: 'Webhook not found' })

		const limit = Number(query?.limit) || 20
		const offset = Number(query?.offset) || 0

		const deliveries = await db
			.select()
			.from(webhookDeliveries)
			.where(eq(webhookDeliveries.webhookId, params.webhookId))
			.orderBy(desc(webhookDeliveries.createdAt))
			.limit(limit)
			.offset(offset)

		const [totalResult] = await db
			.select({ count: count() })
			.from(webhookDeliveries)
			.where(eq(webhookDeliveries.webhookId, params.webhookId))

		return {
			deliveries: deliveries.map(serializeWebhookDelivery),
			total: totalResult?.count ?? 0,
			limit,
			offset,
		}
	}, { writeAccess: true })

	// Retry a failed webhook delivery
	.post('/webhooks/:webhookId/deliveries/:deliveryId/retry', async ({ db, workspaceId, params}) => {
		const [webhook] = await db.select().from(webhooks).where(eq(webhooks.id, params.webhookId))
		if (!webhook) return status(404, { error: 'Webhook not found' })

		const [agent] = await db
			.select()
			.from(agents)
			.where(and(eq(agents.id, webhook.agentId), eq(agents.workspaceId, workspaceId)))

		if (!agent) return status(404, { error: 'Webhook not found' })

		const [delivery] = await db
			.select()
			.from(webhookDeliveries)
			.where(
				and(
					eq(webhookDeliveries.id, params.deliveryId),
					eq(webhookDeliveries.webhookId, params.webhookId),
				),
			)

		if (!delivery) return status(404, { error: 'Delivery not found' })

		const updatedDelivery = await retryDelivery({
			db,
			deliveryId: params.deliveryId,
			webhook: {
				id: webhook.id,
				url: webhook.url,
				secret: webhook.secret,
			},
		})

		return serializeWebhookDelivery(updatedDelivery)
	}, { writeAccess: true })

	// --- Admin-access routes ---
	.use(adminPlugin)

	// Delete webhook
	.delete('/agents/:agentId/webhooks/:webhookId', async ({ db, workspaceId, params}) => {
		const agent = await verifyAgentInWorkspace(params.agentId, workspaceId, db)
		if (!agent) return status(404, { error: 'Agent not found' })

		const result = await db
			.delete(webhooks)
			.where(and(eq(webhooks.id, params.webhookId), eq(webhooks.agentId, params.agentId)))
			.returning()

		if (result.length === 0) return status(404, { error: 'Webhook not found' })

		return { success: true }
	}, { adminAccess: true })

	// Regenerate webhook secret
	.post('/agents/:agentId/webhooks/:webhookId/regenerate-secret', async ({ db, workspaceId, params}) => {
		const agent = await verifyAgentInWorkspace(params.agentId, workspaceId, db)
		if (!agent) return status(404, { error: 'Agent not found' })

		const [existing] = await db
			.select()
			.from(webhooks)
			.where(and(eq(webhooks.id, params.webhookId), eq(webhooks.agentId, params.agentId)))

		if (!existing) return status(404, { error: 'Webhook not found' })

		const newSecret = generateWebhookSecret()

		await db
			.update(webhooks)
			.set({ secret: newSecret, updatedAt: new Date() })
			.where(eq(webhooks.id, params.webhookId))

		return { secret: newSecret }
	}, { adminAccess: true })
