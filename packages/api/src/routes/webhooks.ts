import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { and, desc, eq } from 'drizzle-orm'
import {
	agents,
	WEBHOOK_EVENT_TYPES,
	WEBHOOK_STATUSES,
	webhookLogs,
	webhooks,
} from '@hare/db'
import { getDb } from '../db'
import { commonResponses, requireAdminAccess, requireWriteAccess } from '../helpers'
import { authMiddleware, workspaceMiddleware } from '../middleware'
import { ErrorSchema, SuccessSchema } from '../schemas'
import { generateWebhookSecret, reactivateWebhook } from '../services/webhooks'
import type { WorkspaceEnv } from '@hare/types'

// =============================================================================
// Schemas
// =============================================================================

const WebhookEventTypeSchema = z.enum(WEBHOOK_EVENT_TYPES)

const WebhookStatusSchema = z.enum(WEBHOOK_STATUSES)

const WebhookSchema = z
	.object({
		id: z.string(),
		agentId: z.string(),
		url: z.string().url(),
		secret: z.string(),
		events: z.array(WebhookEventTypeSchema),
		status: WebhookStatusSchema,
		description: z.string().nullable(),
		createdAt: z.string(),
		updatedAt: z.string(),
	})
	.openapi('Webhook')

const WebhookLogSchema = z
	.object({
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
	.openapi('WebhookLog')

const CreateWebhookSchema = z
	.object({
		url: z.string().url().describe('The URL to send webhook payloads to'),
		events: z.array(WebhookEventTypeSchema).min(1).describe('List of event types to subscribe to'),
		description: z.string().nullish().describe('Optional description for the webhook'),
	})
	.openapi('CreateWebhook')

const UpdateWebhookSchema = z
	.object({
		url: z.string().url().optional().describe('The URL to send webhook payloads to'),
		events: z
			.array(WebhookEventTypeSchema)
			.min(1)
			.optional()
			.describe('List of event types to subscribe to'),
		status: WebhookStatusSchema.optional().describe('Webhook status'),
		description: z.string().nullish().describe('Optional description for the webhook'),
	})
	.openapi('UpdateWebhook')

const AgentIdParamSchema = z.object({
	id: z.string().openapi({ param: { name: 'id', in: 'path' }, example: 'agent_abc123' }),
})

const WebhookIdParamSchema = z.object({
	id: z.string().openapi({ param: { name: 'id', in: 'path' }, example: 'agent_abc123' }),
	webhookId: z
		.string()
		.openapi({ param: { name: 'webhookId', in: 'path' }, example: 'webhook_xyz789' }),
})

// =============================================================================
// Route Definitions
// =============================================================================

const listWebhooksRoute = createRoute({
	method: 'get',
	path: '/{id}/webhooks',
	tags: ['Webhooks'],
	summary: 'List webhooks for an agent',
	description: 'Get all webhooks configured for a specific agent',
	request: {
		params: AgentIdParamSchema,
		query: z.object({
			workspaceId: z.string().describe('Workspace ID'),
		}),
	},
	responses: {
		200: {
			description: 'List of webhooks',
			content: {
				'application/json': {
					schema: z.object({
						webhooks: z.array(WebhookSchema),
					}),
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

const createWebhookRoute = createRoute({
	method: 'post',
	path: '/{id}/webhooks',
	tags: ['Webhooks'],
	summary: 'Create a webhook',
	description: 'Create a new webhook subscription for an agent',
	request: {
		params: AgentIdParamSchema,
		query: z.object({
			workspaceId: z.string().describe('Workspace ID'),
		}),
		body: {
			content: {
				'application/json': {
					schema: CreateWebhookSchema,
				},
			},
		},
	},
	responses: {
		201: {
			description: 'Webhook created successfully',
			content: {
				'application/json': {
					schema: WebhookSchema,
				},
			},
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
			description: 'Failed to create webhook',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		...commonResponses,
	},
})

const getWebhookRoute = createRoute({
	method: 'get',
	path: '/{id}/webhooks/{webhookId}',
	tags: ['Webhooks'],
	summary: 'Get webhook details',
	description: 'Get details of a specific webhook',
	request: {
		params: WebhookIdParamSchema,
		query: z.object({
			workspaceId: z.string().describe('Workspace ID'),
		}),
	},
	responses: {
		200: {
			description: 'Webhook details',
			content: {
				'application/json': {
					schema: WebhookSchema,
				},
			},
		},
		404: {
			description: 'Webhook not found',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		...commonResponses,
	},
})

const updateWebhookRoute = createRoute({
	method: 'patch',
	path: '/{id}/webhooks/{webhookId}',
	tags: ['Webhooks'],
	summary: 'Update a webhook',
	description: 'Update webhook configuration',
	request: {
		params: WebhookIdParamSchema,
		query: z.object({
			workspaceId: z.string().describe('Workspace ID'),
		}),
		body: {
			content: {
				'application/json': {
					schema: UpdateWebhookSchema,
				},
			},
		},
	},
	responses: {
		200: {
			description: 'Webhook updated successfully',
			content: {
				'application/json': {
					schema: WebhookSchema,
				},
			},
		},
		403: {
			description: 'Write access required',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		404: {
			description: 'Webhook not found',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		500: {
			description: 'Failed to update webhook',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		...commonResponses,
	},
})

const deleteWebhookRoute = createRoute({
	method: 'delete',
	path: '/{id}/webhooks/{webhookId}',
	tags: ['Webhooks'],
	summary: 'Delete a webhook',
	description: 'Remove a webhook subscription',
	request: {
		params: WebhookIdParamSchema,
		query: z.object({
			workspaceId: z.string().describe('Workspace ID'),
		}),
	},
	responses: {
		200: {
			description: 'Webhook deleted successfully',
			content: {
				'application/json': {
					schema: SuccessSchema,
				},
			},
		},
		403: {
			description: 'Admin access required',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		404: {
			description: 'Webhook not found',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		...commonResponses,
	},
})

const getWebhookLogsRoute = createRoute({
	method: 'get',
	path: '/{id}/webhooks/{webhookId}/logs',
	tags: ['Webhooks'],
	summary: 'Get webhook delivery logs',
	description: 'Get the delivery history for a specific webhook',
	request: {
		params: WebhookIdParamSchema,
		query: z.object({
			workspaceId: z.string().describe('Workspace ID'),
			limit: z.coerce.number().optional().default(50).describe('Maximum number of logs to return'),
			offset: z.coerce.number().optional().default(0).describe('Number of logs to skip'),
		}),
	},
	responses: {
		200: {
			description: 'Webhook delivery logs',
			content: {
				'application/json': {
					schema: z.object({
						logs: z.array(WebhookLogSchema),
						total: z.number(),
					}),
				},
			},
		},
		404: {
			description: 'Webhook not found',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		...commonResponses,
	},
})

const regenerateSecretRoute = createRoute({
	method: 'post',
	path: '/{id}/webhooks/{webhookId}/regenerate-secret',
	tags: ['Webhooks'],
	summary: 'Regenerate webhook secret',
	description: 'Generate a new secret for the webhook (invalidates old signatures)',
	request: {
		params: WebhookIdParamSchema,
		query: z.object({
			workspaceId: z.string().describe('Workspace ID'),
		}),
	},
	responses: {
		200: {
			description: 'New secret generated',
			content: {
				'application/json': {
					schema: z.object({
						secret: z.string(),
					}),
				},
			},
		},
		403: {
			description: 'Admin access required',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		404: {
			description: 'Webhook not found',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		...commonResponses,
	},
})

// =============================================================================
// Helper Functions
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

async function verifyAgentAccess(options: {
	db: Awaited<ReturnType<typeof getDb>>
	agentId: string
	workspaceId: string
}): Promise<{ exists: boolean; error?: string }> {
	const { db, agentId, workspaceId } = options
	const [agent] = await db
		.select()
		.from(agents)
		.where(and(eq(agents.id, agentId), eq(agents.workspaceId, workspaceId)))

	if (!agent) {
		return { exists: false, error: 'Agent not found' }
	}
	return { exists: true }
}

async function findWebhook(options: {
	db: Awaited<ReturnType<typeof getDb>>
	webhookId: string
	agentId: string
}): Promise<typeof webhooks.$inferSelect | null> {
	const { db, webhookId, agentId } = options
	const [webhook] = await db
		.select()
		.from(webhooks)
		.where(and(eq(webhooks.id, webhookId), eq(webhooks.agentId, agentId)))

	return webhook ?? null
}

// =============================================================================
// Route Handlers
// =============================================================================

const baseApp = new OpenAPIHono<WorkspaceEnv>()

// Apply middleware
baseApp.use('*', authMiddleware)
baseApp.use('*', workspaceMiddleware)

// List webhooks for an agent
const app = baseApp.openapi(listWebhooksRoute, async (c) => {
	const { id: agentId } = c.req.valid('param')
	const db = getDb(c)
	const workspace = c.get('workspace')

	const access = await verifyAgentAccess({ db, agentId, workspaceId: workspace.id })
	if (!access.exists) {
		return c.json({ error: access.error ?? 'Agent not found' }, 404)
	}

	const results = await db.select().from(webhooks).where(eq(webhooks.agentId, agentId))

	return c.json({ webhooks: results.map(serializeWebhook) }, 200)
})
// Create a new webhook
.openapi(createWebhookRoute, async (c) => {
	const { id: agentId } = c.req.valid('param')
	const data = c.req.valid('json')
	const db = getDb(c)
	const workspace = c.get('workspace')
	const role = c.get('workspaceRole')

	requireWriteAccess(role)

	const access = await verifyAgentAccess({ db, agentId, workspaceId: workspace.id })
	if (!access.exists) {
		return c.json({ error: access.error ?? 'Agent not found' }, 404)
	}

	const secret = generateWebhookSecret()

	const [webhook] = await db
		.insert(webhooks)
		.values({
			agentId,
			url: data.url,
			secret,
			events: data.events,
			description: data.description,
			status: 'active',
		})
		.returning()

	if (!webhook) {
		return c.json({ error: 'Failed to create webhook' }, 500)
	}

	return c.json(serializeWebhook(webhook), 201)
})
// Get webhook details
.openapi(getWebhookRoute, async (c) => {
	const { id: agentId, webhookId } = c.req.valid('param')
	const db = getDb(c)
	const workspace = c.get('workspace')

	const access = await verifyAgentAccess({ db, agentId, workspaceId: workspace.id })
	if (!access.exists) {
		return c.json({ error: access.error ?? 'Agent not found' }, 404)
	}

	const webhook = await findWebhook({ db, webhookId, agentId })
	if (!webhook) {
		return c.json({ error: 'Webhook not found' }, 404)
	}

	return c.json(serializeWebhook(webhook), 200)
})
// Update a webhook
.openapi(updateWebhookRoute, async (c) => {
	const { id: agentId, webhookId } = c.req.valid('param')
	const data = c.req.valid('json')
	const db = getDb(c)
	const workspace = c.get('workspace')
	const role = c.get('workspaceRole')

	requireWriteAccess(role)

	const access = await verifyAgentAccess({ db, agentId, workspaceId: workspace.id })
	if (!access.exists) {
		return c.json({ error: access.error ?? 'Agent not found' }, 404)
	}

	const existing = await findWebhook({ db, webhookId, agentId })
	if (!existing) {
		return c.json({ error: 'Webhook not found' }, 404)
	}

	// Handle reactivation
	if (data.status === 'active' && existing.status === 'failed') {
		await reactivateWebhook({ db, webhookId })
	}

	const updateData: Partial<typeof webhooks.$inferInsert> = {
		updatedAt: new Date(),
		...(data.url !== undefined && { url: data.url }),
		...(data.events !== undefined && { events: data.events }),
		...(data.status !== undefined && { status: data.status }),
		...(data.description !== undefined && { description: data.description }),
	}

	const [webhook] = await db
		.update(webhooks)
		.set(updateData)
		.where(eq(webhooks.id, webhookId))
		.returning()

	if (!webhook) {
		return c.json({ error: 'Failed to update webhook' }, 500)
	}

	return c.json(serializeWebhook(webhook), 200)
})
// Delete a webhook
.openapi(deleteWebhookRoute, async (c) => {
	const { id: agentId, webhookId } = c.req.valid('param')
	const db = getDb(c)
	const workspace = c.get('workspace')
	const role = c.get('workspaceRole')

	requireAdminAccess(role)

	const access = await verifyAgentAccess({ db, agentId, workspaceId: workspace.id })
	if (!access.exists) {
		return c.json({ error: access.error ?? 'Agent not found' }, 404)
	}

	const result = await db
		.delete(webhooks)
		.where(and(eq(webhooks.id, webhookId), eq(webhooks.agentId, agentId)))
		.returning()

	if (result.length === 0) {
		return c.json({ error: 'Webhook not found' }, 404)
	}

	return c.json({ success: true }, 200)
})
// Get webhook delivery logs
.openapi(getWebhookLogsRoute, async (c) => {
	const { id: agentId, webhookId } = c.req.valid('param')
	const { limit, offset } = c.req.valid('query')
	const db = getDb(c)
	const workspace = c.get('workspace')

	const access = await verifyAgentAccess({ db, agentId, workspaceId: workspace.id })
	if (!access.exists) {
		return c.json({ error: access.error ?? 'Agent not found' }, 404)
	}

	const webhook = await findWebhook({ db, webhookId, agentId })
	if (!webhook) {
		return c.json({ error: 'Webhook not found' }, 404)
	}

	// Get logs with pagination
	const logs = await db
		.select()
		.from(webhookLogs)
		.where(eq(webhookLogs.webhookId, webhookId))
		.orderBy(desc(webhookLogs.createdAt))
		.limit(limit)
		.offset(offset)

	// Get total count for pagination
	const allLogs = await db
		.select({ id: webhookLogs.id })
		.from(webhookLogs)
		.where(eq(webhookLogs.webhookId, webhookId))

	return c.json(
		{
			logs: logs.map(serializeWebhookLog),
			total: allLogs.length,
		},
		200,
	)
})
// Regenerate webhook secret
.openapi(regenerateSecretRoute, async (c) => {
	const { id: agentId, webhookId } = c.req.valid('param')
	const db = getDb(c)
	const workspace = c.get('workspace')
	const role = c.get('workspaceRole')

	requireAdminAccess(role)

	const access = await verifyAgentAccess({ db, agentId, workspaceId: workspace.id })
	if (!access.exists) {
		return c.json({ error: access.error ?? 'Agent not found' }, 404)
	}

	const existing = await findWebhook({ db, webhookId, agentId })
	if (!existing) {
		return c.json({ error: 'Webhook not found' }, 404)
	}

	const newSecret = generateWebhookSecret()

	await db
		.update(webhooks)
		.set({
			secret: newSecret,
			updatedAt: new Date(),
		})
		.where(eq(webhooks.id, webhookId))

	return c.json({ secret: newSecret }, 200)
})

export default app
