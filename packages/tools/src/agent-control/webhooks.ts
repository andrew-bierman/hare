/**
 * Agent Control Webhook Tools
 *
 * Tools for managing agent webhooks.
 */

import { getErrorMessage } from '@hare/checks'
import { z } from 'zod'
import { createTool, failure, success, type ToolContext } from '../types'
import {
	CreateWebhookOutputSchema,
	DeleteWebhookOutputSchema,
	ListWebhooksOutputSchema,
} from './schemas'
import { hasAgentControlCapabilities } from './types'

/**
 * List webhooks configured for an agent
 */
export const listWebhooksTool = createTool({
	id: 'agent_webhook_list',
	description: 'List all webhooks configured for a specific agent',
	inputSchema: z.object({
		agentId: z.string().describe('The agent to list webhooks for'),
	}),
	outputSchema: ListWebhooksOutputSchema,
	execute: async (params, context: ToolContext) => {
		try {
			if (!hasAgentControlCapabilities(context)) {
				return failure('Database not available. Agent control tools require DB binding.')
			}

			const db = context.env.DB
			const workspaceId = context.workspaceId

			// Verify agent exists in workspace
			const agentResult = await db
				.prepare('SELECT id FROM agents WHERE id = ? AND workspaceId = ?')
				.bind(params.agentId, workspaceId)
				.first()

			if (!agentResult) {
				return failure(`Agent not found: ${params.agentId}`)
			}

			const result = await db
				.prepare(
					'SELECT id, url, events, status, createdAt FROM webhooks WHERE agentId = ? ORDER BY createdAt DESC',
				)
				.bind(params.agentId)
				.all()

			const webhooks = (result.results || []).map((row) => ({
				id: row.id as string,
				url: row.url as string,
				events: JSON.parse(row.events as string) as string[],
				status: row.status as string,
				createdAt: row.createdAt,
			}))

			return success({
				agentId: params.agentId,
				webhooks,
				total: webhooks.length,
			})
		} catch (error) {
			return failure(getErrorMessage(error))
		}
	},
})

/**
 * Create a webhook for an agent
 */
export const createWebhookTool = createTool({
	id: 'agent_webhook_create',
	description: 'Create a new webhook to receive events for a specific agent',
	inputSchema: z.object({
		agentId: z.string().describe('The agent to attach the webhook to'),
		url: z.string().url().describe('The URL to send webhook events to'),
		events: z
			.array(z.string())
			.min(1)
			.describe('Event types to subscribe to (e.g., agent.message, agent.deployed)'),
		secret: z
			.string()
			.optional()
			.describe('Webhook signing secret (auto-generated if not provided)'),
	}),
	outputSchema: CreateWebhookOutputSchema,
	execute: async (params, context: ToolContext) => {
		try {
			if (!hasAgentControlCapabilities(context)) {
				return failure('Database not available. Agent control tools require DB binding.')
			}

			const db = context.env.DB
			const workspaceId = context.workspaceId

			// Verify agent exists in workspace
			const agentResult = await db
				.prepare('SELECT id FROM agents WHERE id = ? AND workspaceId = ?')
				.bind(params.agentId, workspaceId)
				.first()

			if (!agentResult) {
				return failure(`Agent not found: ${params.agentId}`)
			}

			const webhookId = `wh_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
			const now = Date.now()

			// Generate secret if not provided
			const secret =
				params.secret ??
				Array.from(crypto.getRandomValues(new Uint8Array(32)))
					.map((b) => b.toString(16).padStart(2, '0'))
					.join('')

			await db
				.prepare(
					'INSERT INTO webhooks (id, agentId, url, events, secret, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
				)
				.bind(
					webhookId,
					params.agentId,
					params.url,
					JSON.stringify(params.events),
					secret,
					'active',
					now,
					now,
				)
				.run()

			return success({
				id: webhookId,
				agentId: params.agentId,
				url: params.url,
				events: params.events,
				status: 'active',
				createdAt: now,
			})
		} catch (error) {
			return failure(getErrorMessage(error))
		}
	},
})

/**
 * Delete a webhook
 */
export const deleteWebhookTool = createTool({
	id: 'agent_webhook_delete',
	description: 'Delete a webhook from an agent',
	inputSchema: z.object({
		agentId: z.string().describe('The agent the webhook belongs to'),
		webhookId: z.string().describe('The webhook to delete'),
	}),
	outputSchema: DeleteWebhookOutputSchema,
	execute: async (params, context: ToolContext) => {
		try {
			if (!hasAgentControlCapabilities(context)) {
				return failure('Database not available. Agent control tools require DB binding.')
			}

			const db = context.env.DB
			const workspaceId = context.workspaceId

			// Verify agent exists in workspace
			const agentResult = await db
				.prepare('SELECT id FROM agents WHERE id = ? AND workspaceId = ?')
				.bind(params.agentId, workspaceId)
				.first()

			if (!agentResult) {
				return failure(`Agent not found: ${params.agentId}`)
			}

			// Verify webhook exists and belongs to this agent
			const webhookResult = await db
				.prepare('SELECT id FROM webhooks WHERE id = ? AND agentId = ?')
				.bind(params.webhookId, params.agentId)
				.first()

			if (!webhookResult) {
				return failure(`Webhook not found: ${params.webhookId}`)
			}

			await db
				.prepare('DELETE FROM webhooks WHERE id = ? AND agentId = ?')
				.bind(params.webhookId, params.agentId)
				.run()

			return success({
				webhookId: params.webhookId,
				agentId: params.agentId,
				deleted: true,
				deletedAt: Date.now(),
			})
		} catch (error) {
			return failure(getErrorMessage(error))
		}
	},
})
