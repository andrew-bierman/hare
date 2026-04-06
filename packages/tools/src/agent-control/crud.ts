/**
 * Agent Control CRUD Tools
 *
 * Tools for listing, getting, creating, deleting, and configuring agents.
 */

import { z } from 'zod'
import { createTool, failure, success, type ToolContext } from '../types'
import {
	ConfigureAgentOutputSchema,
	CreateAgentOutputSchema,
	DeleteAgentOutputSchema,
	GetAgentOutputSchema,
	ListAgentsOutputSchema,
} from './schemas'
import { hasAgentControlCapabilities } from './types'

/**
 * List all agents in a workspace
 */
export const listAgentsTool = createTool({
	id: 'agent_list',
	description: 'List all AI agents in the current workspace with their status and configuration',
	inputSchema: z.object({
		status: z
			.enum(['all', 'draft', 'deployed', 'archived'])
			.optional()
			.default('all')
			.describe('Filter agents by status'),
		limit: z.number().optional().default(50).describe('Maximum number of agents to return'),
	}),
	outputSchema: ListAgentsOutputSchema,
	execute: async (params, context: ToolContext) => {
		try {
			if (!hasAgentControlCapabilities(context)) {
				return failure('Database not available. Agent control tools require DB binding.')
			}

			const db = context.env.DB
			const workspaceId = context.workspaceId

			// Build query based on status filter
			let query: string
			let bindings: unknown[]

			if (params.status === 'all') {
				query = `
					SELECT id, name, description, model, status, instructions, config, createdAt, updatedAt
					FROM agents
					WHERE workspaceId = ?
					ORDER BY updatedAt DESC
					LIMIT ?
				`
				bindings = [workspaceId, params.limit]
			} else {
				query = `
					SELECT id, name, description, model, status, instructions, config, createdAt, updatedAt
					FROM agents
					WHERE workspaceId = ? AND status = ?
					ORDER BY updatedAt DESC
					LIMIT ?
				`
				bindings = [workspaceId, params.status, params.limit]
			}

			const result = await db
				.prepare(query)
				.bind(...bindings)
				.all()

			const agents = (result.results || []).map((row) => ({
				id: row.id as string,
				name: row.name as string,
				description: row.description as string | null,
				model: row.model as string,
				status: row.status as string,
				workspaceId,
				hasInstructions: !!(row.instructions as string | null),
				config: row.config ? JSON.parse(row.config as string) : null,
				createdAt: row.createdAt as number,
				updatedAt: row.updatedAt as number,
			}))

			return success({
				agents,
				total: agents.length,
				workspaceId,
			})
		} catch (error) {
			return failure(error instanceof Error ? error.message : 'Failed to list agents')
		}
	},
})

/**
 * Get detailed information about a specific agent
 */
export const getAgentTool = createTool({
	id: 'agent_get',
	description: 'Get detailed information about a specific agent including its state and history',
	inputSchema: z.object({
		agentId: z.string().describe('The unique identifier of the agent'),
		includeHistory: z.boolean().optional().default(false).describe('Include conversation history'),
		includeTools: z.boolean().optional().default(true).describe('Include attached tools'),
	}),
	outputSchema: GetAgentOutputSchema,
	execute: async (params, context: ToolContext) => {
		try {
			if (!hasAgentControlCapabilities(context)) {
				return failure('Database not available. Agent control tools require DB binding.')
			}

			const db = context.env.DB
			const workspaceId = context.workspaceId

			// Get agent details
			const agentResult = await db
				.prepare(
					`
					SELECT id, name, description, model, status, instructions, config, createdBy, createdAt, updatedAt
					FROM agents
					WHERE id = ? AND workspaceId = ?
				`,
				)
				.bind(params.agentId, workspaceId)
				.first()

			if (!agentResult) {
				return failure(`Agent not found: ${params.agentId}`)
			}

			const agent: Record<string, unknown> = {
				id: agentResult.id,
				name: agentResult.name,
				description: agentResult.description,
				model: agentResult.model,
				status: agentResult.status,
				instructions: agentResult.instructions,
				config: agentResult.config ? JSON.parse(agentResult.config as string) : null,
				workspaceId,
				createdBy: agentResult.createdBy,
				createdAt: agentResult.createdAt,
				updatedAt: agentResult.updatedAt,
			}

			// Get attached tools if requested
			if (params.includeTools) {
				const toolsResult = await db
					.prepare(
						`
						SELECT t.id, t.name, t.description, t.type
						FROM tools t
						INNER JOIN agent_tools at ON t.id = at.toolId
						WHERE at.agentId = ?
					`,
					)
					.bind(params.agentId)
					.all()

				agent.tools = (toolsResult.results || []).map((row) => ({
					id: row.id,
					name: row.name,
					description: row.description,
					type: row.type,
				}))
			}

			// Get conversation history if requested
			if (params.includeHistory) {
				const messagesResult = await db
					.prepare(
						`
						SELECT m.id, m.role, m.content, m.createdAt
						FROM messages m
						INNER JOIN conversations c ON m.conversationId = c.id
						WHERE c.agentId = ?
						ORDER BY m.createdAt DESC
						LIMIT 50
					`,
					)
					.bind(params.agentId)
					.all()

				agent.messages = (messagesResult.results || []).map((row) => ({
					id: row.id,
					role: row.role,
					content: row.content,
					createdAt: row.createdAt,
				}))
				agent.messageCount = agent.messages ? (agent.messages as unknown[]).length : 0
			}

			// Get scheduled tasks
			const tasksResult = await db
				.prepare(
					`
					SELECT id, type, action, executeAt, cron, status
					FROM scheduled_tasks
					WHERE agentId = ? AND status IN ('pending', 'active')
				`,
				)
				.bind(params.agentId)
				.all()

			agent.scheduledTasks = (tasksResult.results || []).map((row) => ({
				id: row.id,
				type: row.type,
				action: row.action,
				executeAt: row.executeAt,
				cron: row.cron,
				status: row.status,
			}))

			return success(agent)
		} catch (error) {
			return failure(error instanceof Error ? error.message : 'Failed to get agent')
		}
	},
})

/**
 * Create a new agent
 */
export const createAgentTool = createTool({
	id: 'agent_create',
	description: 'Create a new AI agent in the workspace',
	inputSchema: z.object({
		name: z.string().min(1).describe('Name for the new agent'),
		description: z.string().optional().describe('Description of the agent'),
		instructions: z.string().optional().describe('System instructions'),
		model: z.string().optional().default('llama-3.3-70b').describe('AI model to use'),
		config: z
			.object({
				temperature: z.number().min(0).max(2).optional(),
				maxTokens: z.number().positive().optional(),
			})
			.optional()
			.describe('Model configuration'),
	}),
	outputSchema: CreateAgentOutputSchema,
	execute: async (params, context: ToolContext) => {
		try {
			if (!hasAgentControlCapabilities(context)) {
				return failure('Database not available. Agent control tools require DB binding.')
			}

			const db = context.env.DB
			const workspaceId = context.workspaceId
			const userId = context.userId

			// Generate a unique ID (using timestamp + random for simplicity)
			const agentId = `ag_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
			const now = Date.now()

			// Insert the new agent
			await db
				.prepare(
					`
					INSERT INTO agents (id, workspaceId, name, description, instructions, model, config, status, createdBy, createdAt, updatedAt)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				`,
				)
				.bind(
					agentId,
					workspaceId,
					params.name,
					params.description || null,
					params.instructions || null,
					params.model || 'llama-3.3-70b',
					params.config ? JSON.stringify(params.config) : null,
					'draft',
					userId,
					now,
					now,
				)
				.run()

			return success({
				id: agentId,
				name: params.name,
				description: params.description || null,
				instructions: params.instructions || null,
				model: params.model || 'llama-3.3-70b',
				config: params.config || null,
				workspaceId,
				status: 'draft',
				createdAt: now,
				createdBy: userId,
			})
		} catch (error) {
			return failure(error instanceof Error ? error.message : 'Failed to create agent')
		}
	},
})

/**
 * Delete an agent
 */
export const deleteAgentTool = createTool({
	id: 'agent_delete',
	description: 'Delete an agent from the workspace',
	inputSchema: z.object({
		agentId: z.string().describe('The agent to delete'),
		force: z.boolean().optional().default(false).describe('Force delete even if agent is deployed'),
	}),
	outputSchema: DeleteAgentOutputSchema,
	execute: async (params, context: ToolContext) => {
		try {
			if (!hasAgentControlCapabilities(context)) {
				return failure('Database not available. Agent control tools require DB binding.')
			}

			const db = context.env.DB
			const workspaceId = context.workspaceId

			// Verify agent exists and check status
			const existing = await db
				.prepare(
					`
					SELECT id, name, status
					FROM agents
					WHERE id = ? AND workspaceId = ?
				`,
				)
				.bind(params.agentId, workspaceId)
				.first()

			if (!existing) {
				return failure(`Agent not found: ${params.agentId}`)
			}

			// Check if agent is deployed and force is not set
			if (existing.status === 'deployed' && !params.force) {
				return failure(
					'Cannot delete a deployed agent. Use force=true or undeploy the agent first.',
				)
			}

			// Delete the agent (cascades to agent_tools, conversations, etc.)
			await db
				.prepare(
					`
					DELETE FROM agents
					WHERE id = ? AND workspaceId = ?
				`,
				)
				.bind(params.agentId, workspaceId)
				.run()

			return success({
				agentId: params.agentId,
				name: existing.name,
				deleted: true,
				deletedAt: Date.now(),
			})
		} catch (error) {
			return failure(error instanceof Error ? error.message : 'Failed to delete agent')
		}
	},
})

/**
 * Configure an agent's settings
 */
export const configureAgentTool = createTool({
	id: 'agent_configure',
	description: "Update an agent's configuration including instructions, model, and settings",
	inputSchema: z.object({
		agentId: z.string().describe('The agent to configure'),
		name: z.string().optional().describe('New name for the agent'),
		description: z.string().optional().describe('New description for the agent'),
		instructions: z.string().optional().describe('System instructions for the agent'),
		model: z.string().optional().describe('AI model to use'),
		config: z
			.object({
				temperature: z.number().min(0).max(2).optional(),
				maxTokens: z.number().positive().optional(),
				topP: z.number().min(0).max(1).optional(),
				topK: z.number().positive().optional(),
			})
			.optional()
			.describe('Model configuration parameters'),
	}),
	outputSchema: ConfigureAgentOutputSchema,
	execute: async (params, context: ToolContext) => {
		try {
			if (!hasAgentControlCapabilities(context)) {
				return failure('Database not available. Agent control tools require DB binding.')
			}

			const db = context.env.DB
			const workspaceId = context.workspaceId

			// Verify agent exists
			const existing = await db
				.prepare(
					`
					SELECT id, name, config
					FROM agents
					WHERE id = ? AND workspaceId = ?
				`,
				)
				.bind(params.agentId, workspaceId)
				.first()

			if (!existing) {
				return failure(`Agent not found: ${params.agentId}`)
			}

			// Build update fields
			const updates: string[] = ['updatedAt = ?']
			const values: unknown[] = [Date.now()]

			if (params.name !== undefined) {
				updates.push('name = ?')
				values.push(params.name)
			}
			if (params.description !== undefined) {
				updates.push('description = ?')
				values.push(params.description)
			}
			if (params.instructions !== undefined) {
				updates.push('instructions = ?')
				values.push(params.instructions)
			}
			if (params.model !== undefined) {
				updates.push('model = ?')
				values.push(params.model)
			}
			if (params.config !== undefined) {
				// Merge with existing config
				const existingConfig = existing.config ? JSON.parse(existing.config as string) : {}
				const newConfig = { ...existingConfig, ...params.config }
				updates.push('config = ?')
				values.push(JSON.stringify(newConfig))
			}

			// Add WHERE clause bindings
			values.push(params.agentId, workspaceId)

			// Execute update
			await db
				.prepare(
					`
					UPDATE agents
					SET ${updates.join(', ')}
					WHERE id = ? AND workspaceId = ?
				`,
				)
				.bind(...values)
				.run()

			// If agent is deployed and DO is available, update the Durable Object too
			const hareAgent = context.env.HARE_AGENT
			if (hareAgent) {
				try {
					const id = hareAgent.idFromName(params.agentId)
					const stub = hareAgent.get(id)
					await stub.fetch(
						new Request('http://internal/configure', {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({
								...(params.name && { name: params.name }),
								...(params.instructions && { instructions: params.instructions }),
								...(params.model && { model: params.model }),
							}),
						}),
					)
				} catch {
					// DO update is optional - continue even if it fails
				}
			}

			return success({
				agentId: params.agentId,
				workspaceId,
				changes: {
					...(params.name && { name: params.name }),
					...(params.description && { description: params.description }),
					...(params.instructions && { instructions: '(updated)' }),
					...(params.model && { model: params.model }),
					...(params.config && { config: params.config }),
				},
				updatedAt: Date.now(),
			})
		} catch (error) {
			return failure(error instanceof Error ? error.message : 'Failed to configure agent')
		}
	},
})
