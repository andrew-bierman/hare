/**
 * Agent Control Tools for MCP
 *
 * These tools allow external AI clients to control Hare agents via MCP.
 * Provides capabilities like:
 * - Listing agents
 * - Starting/stopping agents
 * - Sending messages to agents
 * - Configuring agents
 * - Managing agent schedules
 */

import { z } from 'zod'
import { type AnyTool, createTool, failure, success, type ToolContext, type ToolResult, type HareEnv } from './types'

/**
 * Extended environment for agent control tools.
 * Requires database and optional Durable Object bindings.
 */
export interface AgentControlEnv extends HareEnv {
	/** D1 database - required for agent queries */
	DB: D1Database
	/** HareAgent Durable Object namespace - required for agent operations */
	HARE_AGENT?: DurableObjectNamespace
}

/**
 * Extended context for agent control tools.
 * Provides access to database for real implementations.
 */
export interface AgentControlContext extends ToolContext<AgentControlEnv> {
	env: AgentControlEnv
}

/**
 * Check if context has agent control capabilities
 */
function hasAgentControlCapabilities(
	context: ToolContext,
): context is AgentControlContext {
	return context.env && 'DB' in context.env && context.env.DB !== undefined
}

// Output Schemas

const AgentSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().nullable(),
	model: z.string(),
	status: z.string(),
	workspaceId: z.string(),
	hasInstructions: z.boolean(),
	config: z.unknown(),
	createdAt: z.number(),
	updatedAt: z.number(),
})

const ListAgentsOutputSchema = z.object({
	agents: z.array(AgentSchema),
	total: z.number(),
	workspaceId: z.string(),
})

const MessageSchema = z.object({
	role: z.string(),
	content: z.string(),
})

const ToolInfoSchema = z.object({
	id: z.unknown(),
	name: z.unknown(),
	description: z.unknown(),
	type: z.unknown(),
})

const MessageWithMetaSchema = z.object({
	id: z.unknown(),
	role: z.unknown(),
	content: z.unknown(),
	createdAt: z.unknown(),
})

const ScheduledTaskSchema = z.object({
	id: z.unknown(),
	type: z.unknown(),
	action: z.unknown(),
	executeAt: z.unknown(),
	cron: z.unknown(),
	status: z.unknown(),
})

const GetAgentOutputSchema = z.object({
	id: z.unknown(),
	name: z.unknown(),
	description: z.unknown(),
	model: z.unknown(),
	status: z.unknown(),
	instructions: z.unknown(),
	config: z.unknown(),
	workspaceId: z.string(),
	createdBy: z.unknown(),
	createdAt: z.unknown(),
	updatedAt: z.unknown(),
	tools: z.array(ToolInfoSchema).optional(),
	messages: z.array(MessageWithMetaSchema).optional(),
	messageCount: z.number().optional(),
	scheduledTasks: z.array(ScheduledTaskSchema),
})

const SendMessageOutputSchema = z.object({
	agentId: z.string(),
	messageId: z.string(),
	userMessage: z.string(),
	assistantResponse: z.string(),
	timestamp: z.number(),
	completed: z.boolean(),
	note: z.string().optional(),
})

const ConfigureAgentOutputSchema = z.object({
	agentId: z.string(),
	workspaceId: z.string(),
	changes: z.object({
		name: z.string().optional(),
		instructions: z.string().optional(),
		model: z.string().optional(),
	}),
	updatedAt: z.number(),
})

const CreateAgentOutputSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().nullable(),
	instructions: z.string().nullable(),
	model: z.string(),
	config: z
		.object({
			temperature: z.number().optional(),
			maxTokens: z.number().optional(),
		})
		.nullable(),
	workspaceId: z.string(),
	status: z.string(),
	createdAt: z.number(),
	createdBy: z.string(),
})

const DeleteAgentOutputSchema = z.object({
	agentId: z.string(),
	name: z.unknown(),
	deleted: z.boolean(),
	deletedAt: z.number(),
})

const ScheduleTaskOutputSchema = z.object({
	id: z.string(),
	agentId: z.string(),
	action: z.string(),
	type: z.string(),
	executeAt: z.number().optional(),
	cron: z.string().optional(),
	payload: z.record(z.string(), z.unknown()).optional(),
	status: z.string(),
	createdAt: z.number(),
})

const ExecuteToolOutputSchema = z.object({
	agentId: z.string(),
	toolId: z.string(),
	result: z.union([
		z.object({
			success: z.boolean(),
			data: z.record(z.string(), z.unknown()),
		}),
		z.object({
			success: z.literal(false),
			error: z.string(),
		}),
		z.unknown(),
	]),
	executedAt: z.number(),
})

const CustomToolSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().nullable(),
	type: z.string(),
	inputSchema: z.unknown(),
})

const SystemToolSchema = z.object({
	id: z.string(),
	type: z.string(),
	description: z.string(),
})

const ListAgentToolsOutputSchema = z.object({
	agentId: z.string(),
	customTools: z.array(CustomToolSchema),
	systemTools: z.array(SystemToolSchema),
	total: z.number(),
})

const TokensUsedSchema = z.object({
	input: z.number(),
	output: z.number(),
	total: z.number(),
})

const ScheduleExecutionsSchema = z.object({
	total: z.number(),
	completed: z.number(),
	failed: z.number(),
})

const GetAgentMetricsOutputSchema = z.object({
	agentId: z.string(),
	agentName: z.unknown(),
	period: z.string(),
	timeRange: z.object({
		start: z.number(),
		end: z.number(),
	}),
	metrics: z.object({
		totalApiCalls: z.number(),
		totalMessages: z.number(),
		totalConversations: z.number(),
		averageResponseTime: z.number(),
		tokensUsed: TokensUsedSchema,
		estimatedCost: z.number(),
		scheduleExecutions: ScheduleExecutionsSchema,
	}),
	generatedAt: z.number(),
})

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

			const result = await db.prepare(query).bind(...bindings).all()

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
 * Send a message to an agent and get a response
 */
export const sendMessageTool = createTool({
	id: 'agent_send_message',
	description: 'Send a message to an agent and receive its response',
	inputSchema: z.object({
		agentId: z.string().describe('The agent to send the message to'),
		message: z.string().min(1).describe('The message content'),
		stream: z.boolean().optional().default(false).describe('Stream the response'),
		metadata: z
			.record(z.string(), z.unknown())
			.optional()
			.describe('Additional metadata for the message'),
	}),
	outputSchema: SendMessageOutputSchema,
	execute: async (params, context: ToolContext) => {
		try {
			if (!hasAgentControlCapabilities(context)) {
				return failure('Database not available. Agent control tools require DB binding.')
			}

			const db = context.env.DB
			const workspaceId = context.workspaceId

			// Verify agent exists and is deployed
			const agentResult = await db
				.prepare(
					`
					SELECT id, name, status
					FROM agents
					WHERE id = ? AND workspaceId = ?
				`,
				)
				.bind(params.agentId, workspaceId)
				.first()

			if (!agentResult) {
				return failure(`Agent not found: ${params.agentId}`)
			}

			if (agentResult.status !== 'deployed') {
				return failure(`Agent is not deployed. Current status: ${agentResult.status}`)
			}

			// Check if Durable Object is available
			const hareAgent = context.env.HARE_AGENT
			if (!hareAgent) {
				return failure(
					'HareAgent Durable Object not available. Message routing requires HARE_AGENT binding.',
				)
			}

			// Route to the HareAgent Durable Object
			const id = hareAgent.idFromName(params.agentId)
			const stub = hareAgent.get(id)

			// Build the chat request
			const chatPayload = {
				message: params.message,
				userId: context.userId,
				metadata: params.metadata,
			}

			// Send to the agent's chat endpoint
			const response = await stub.fetch(
				new Request('http://internal/chat', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(chatPayload),
				}),
			)

			if (!response.ok) {
				const errorText = await response.text()
				return failure(`Agent chat failed: ${errorText}`)
			}

			// Collect the response (streaming is not supported via MCP tools)
			const text = await response.text()
			// Parse SSE format if present
			const lines = text.split('\n').filter((line) => line.startsWith('data: '))
			let content = ''
			let done = false

			for (const line of lines) {
				try {
					const data = JSON.parse(line.slice(6))
					if (data.type === 'text') {
						content += data.content
					} else if (data.type === 'done') {
						done = true
					}
				} catch {
					// Skip non-JSON lines
				}
			}

			// If no SSE format was found, use the raw text
			if (!content && text) {
				content = text
				done = true
			}

			return success({
				agentId: params.agentId,
				messageId: `msg-${Date.now()}`,
				userMessage: params.message,
				assistantResponse: content,
				timestamp: Date.now(),
				completed: done,
				note: params.stream
					? 'Streaming requested but not supported via MCP tools. Use WebSocket for streaming.'
					: undefined,
			})
		} catch (error) {
			return failure(error instanceof Error ? error.message : 'Failed to send message')
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
		model: z
			.string()
			.optional()
			.default('llama-3.3-70b')
			.describe('AI model to use'),
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
 * Schedule a task for an agent
 */
export const scheduleTaskTool = createTool({
	id: 'agent_schedule',
	description: 'Schedule a task for an agent to execute at a specific time or on a schedule',
	inputSchema: z.object({
		agentId: z.string().describe('The agent to schedule the task for'),
		action: z.string().describe('The action to perform'),
		executeAt: z.number().optional().describe('Unix timestamp to execute at'),
		cron: z.string().optional().describe('Cron expression for recurring tasks'),
		payload: z.record(z.string(), z.unknown()).optional().describe('Task payload'),
	}),
	outputSchema: ScheduleTaskOutputSchema,
	execute: async (params, context: ToolContext) => {
		try {
			if (!hasAgentControlCapabilities(context)) {
				return failure('Database not available. Agent control tools require DB binding.')
			}

			if (!params.executeAt && !params.cron) {
				return failure('Either executeAt or cron must be provided')
			}

			const db = context.env.DB
			const workspaceId = context.workspaceId
			const userId = context.userId

			// Verify agent exists
			const existing = await db
				.prepare(
					`
					SELECT id FROM agents WHERE id = ? AND workspaceId = ?
				`,
				)
				.bind(params.agentId, workspaceId)
				.first()

			if (!existing) {
				return failure(`Agent not found: ${params.agentId}`)
			}

			// Generate task ID
			const taskId = `task_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
			const now = Date.now()
			const taskType = params.cron ? 'recurring' : 'one-time'

			// Calculate next execution time
			let nextExecuteAt: number | null = null
			if (params.executeAt) {
				if (params.executeAt <= now) {
					return failure('executeAt must be in the future')
				}
				nextExecuteAt = params.executeAt
			}

			// Insert the scheduled task
			await db
				.prepare(
					`
					INSERT INTO scheduled_tasks (id, agentId, type, action, executeAt, cron, payload, status, nextExecuteAt, createdBy, createdAt, updatedAt)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				`,
				)
				.bind(
					taskId,
					params.agentId,
					taskType,
					params.action,
					params.executeAt || null,
					params.cron || null,
					params.payload ? JSON.stringify(params.payload) : null,
					'pending',
					nextExecuteAt,
					userId,
					now,
					now,
				)
				.run()

			// If Durable Object is available, schedule the task there too for execution
			const hareAgent = context.env.HARE_AGENT
			if (hareAgent) {
				try {
					const id = hareAgent.idFromName(params.agentId)
					const stub = hareAgent.get(id)

					// Send schedule request to the Durable Object via HTTP
					const doResponse = await stub.fetch(
						new Request('http://internal/schedule', {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({
								action: params.action,
								executeAt: params.executeAt,
								cron: params.cron,
								payload: params.payload,
							}),
						}),
					)
					if (!doResponse.ok) {
						console.warn(
							`[agent_schedule] DO scheduling failed for agent ${params.agentId}: ${await doResponse.text()}`,
						)
					}
				} catch (error) {
					// DO scheduling is optional - database record is still created
					console.warn(
						`[agent_schedule] DO scheduling error for agent ${params.agentId}:`,
						error instanceof Error ? error.message : error,
					)
				}
			}

			return success({
				id: taskId,
				agentId: params.agentId,
				action: params.action,
				type: taskType,
				executeAt: params.executeAt,
				cron: params.cron,
				payload: params.payload,
				status: 'pending',
				createdAt: now,
			})
		} catch (error) {
			return failure(error instanceof Error ? error.message : 'Failed to schedule task')
		}
	},
})

/**
 * Execute a tool on an agent
 */
export const executeToolTool = createTool({
	id: 'agent_execute_tool',
	description: "Execute one of an agent's tools directly",
	inputSchema: z.object({
		agentId: z.string().describe('The agent whose tool to execute'),
		toolId: z.string().describe('The tool to execute'),
		params: z.record(z.string(), z.unknown()).describe('Tool parameters'),
	}),
	outputSchema: ExecuteToolOutputSchema,
	execute: async (params, context: ToolContext) => {
		try {
			if (!hasAgentControlCapabilities(context)) {
				return failure('Database not available. Agent control tools require DB binding.')
			}

			const db = context.env.DB
			const workspaceId = context.workspaceId

			// Verify agent exists
			const agentResult = await db
				.prepare(
					`
					SELECT id, status FROM agents WHERE id = ? AND workspaceId = ?
				`,
				)
				.bind(params.agentId, workspaceId)
				.first()

			if (!agentResult) {
				return failure(`Agent not found: ${params.agentId}`)
			}

			// Check if tool is attached to agent
			const toolAttached = await db
				.prepare(
					`
					SELECT at.id, t.name, t.type, t.config
					FROM agent_tools at
					INNER JOIN tools t ON at.toolId = t.id
					WHERE at.agentId = ? AND at.toolId = ?
				`,
				)
				.bind(params.agentId, params.toolId)
				.first()

			if (!toolAttached) {
				return failure(`Tool ${params.toolId} is not attached to agent ${params.agentId}`)
			}

			// Route to agent's Durable Object for execution
			const hareAgent = context.env.HARE_AGENT
			if (!hareAgent) {
				return failure(
					'HareAgent Durable Object not available. Tool execution requires HARE_AGENT binding.',
				)
			}

			const id = hareAgent.idFromName(params.agentId)
			const stub = hareAgent.get(id)

			// Send tool execution request to the agent
			const response = await stub.fetch(
				new Request('http://internal/execute-tool', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						toolId: params.toolId,
						params: params.params,
					}),
				}),
			)

			if (!response.ok) {
				const errorText = await response.text()
				return failure(`Tool execution failed: ${errorText}`)
			}

			const result = await response.json()
			return success({
				agentId: params.agentId,
				toolId: params.toolId,
				result,
				executedAt: Date.now(),
			})
		} catch (error) {
			return failure(error instanceof Error ? error.message : 'Failed to execute tool')
		}
	},
})

/**
 * List available tools for an agent
 */
export const listAgentToolsTool = createTool({
	id: 'agent_list_tools',
	description: 'List all tools available to a specific agent',
	inputSchema: z.object({
		agentId: z.string().describe('The agent to list tools for'),
		category: z.string().optional().describe('Filter by tool category/type'),
	}),
	outputSchema: ListAgentToolsOutputSchema,
	execute: async (params, context: ToolContext) => {
		try {
			if (!hasAgentControlCapabilities(context)) {
				return failure('Database not available. Agent control tools require DB binding.')
			}

			const db = context.env.DB
			const workspaceId = context.workspaceId

			// Verify agent exists
			const agentResult = await db
				.prepare(
					`
					SELECT id FROM agents WHERE id = ? AND workspaceId = ?
				`,
				)
				.bind(params.agentId, workspaceId)
				.first()

			if (!agentResult) {
				return failure(`Agent not found: ${params.agentId}`)
			}

			// Get attached tools
			let query: string
			let bindings: unknown[]

			if (params.category) {
				query = `
					SELECT t.id, t.name, t.description, t.type, t.inputSchema
					FROM tools t
					INNER JOIN agent_tools at ON t.id = at.toolId
					WHERE at.agentId = ? AND t.type = ?
				`
				bindings = [params.agentId, params.category]
			} else {
				query = `
					SELECT t.id, t.name, t.description, t.type, t.inputSchema
					FROM tools t
					INNER JOIN agent_tools at ON t.id = at.toolId
					WHERE at.agentId = ?
				`
				bindings = [params.agentId]
			}

			const toolsResult = await db.prepare(query).bind(...bindings).all()

			const tools = (toolsResult.results || []).map((row) => ({
				id: row.id as string,
				name: row.name as string,
				description: row.description as string | null,
				type: row.type as string,
				inputSchema: row.inputSchema ? JSON.parse(row.inputSchema as string) : null,
			}))

			// Also include system tools that are always available
			const systemTools = [
				{ id: 'kv_get', type: 'storage', description: 'Get value from KV store' },
				{ id: 'kv_put', type: 'storage', description: 'Store value in KV store' },
				{ id: 'kv_delete', type: 'storage', description: 'Delete value from KV store' },
				{ id: 'sql_query', type: 'database', description: 'Execute SQL queries' },
				{ id: 'http_request', type: 'http', description: 'Make HTTP requests' },
				{ id: 'sentiment', type: 'ai', description: 'Analyze text sentiment' },
				{ id: 'summarize', type: 'ai', description: 'Summarize text' },
				{ id: 'translate', type: 'ai', description: 'Translate text' },
			].filter((t) => !params.category || t.type === params.category)

			return success({
				agentId: params.agentId,
				customTools: tools,
				systemTools,
				total: tools.length + systemTools.length,
			})
		} catch (error) {
			return failure(error instanceof Error ? error.message : 'Failed to list tools')
		}
	},
})

/**
 * Get agent metrics and analytics
 */
export const getAgentMetricsTool = createTool({
	id: 'agent_metrics',
	description: 'Get usage metrics and analytics for an agent',
	inputSchema: z.object({
		agentId: z.string().describe('The agent to get metrics for'),
		period: z
			.enum(['hour', 'day', 'week', 'month'])
			.optional()
			.default('day')
			.describe('Time period for metrics'),
	}),
	outputSchema: GetAgentMetricsOutputSchema,
	execute: async (params, context: ToolContext) => {
		try {
			if (!hasAgentControlCapabilities(context)) {
				return failure('Database not available. Agent control tools require DB binding.')
			}

			const db = context.env.DB
			const workspaceId = context.workspaceId

			// Verify agent exists
			const agentResult = await db
				.prepare(
					`
					SELECT id, name FROM agents WHERE id = ? AND workspaceId = ?
				`,
				)
				.bind(params.agentId, workspaceId)
				.first()

			if (!agentResult) {
				return failure(`Agent not found: ${params.agentId}`)
			}

			// Calculate time range
			const now = Date.now()
			let startTime: number
			switch (params.period) {
				case 'hour':
					startTime = now - 60 * 60 * 1000
					break
				case 'day':
					startTime = now - 24 * 60 * 60 * 1000
					break
				case 'week':
					startTime = now - 7 * 24 * 60 * 60 * 1000
					break
				case 'month':
					startTime = now - 30 * 24 * 60 * 60 * 1000
					break
			}

			// Get usage metrics from usage table
			const usageResult = await db
				.prepare(
					`
					SELECT
						COUNT(*) as totalCalls,
						SUM(inputTokens) as inputTokens,
						SUM(outputTokens) as outputTokens,
						SUM(totalTokens) as totalTokens,
						SUM(cost) as totalCost,
						AVG(CASE WHEN metadata IS NOT NULL THEN json_extract(metadata, '$.duration') ELSE NULL END) as avgDuration
					FROM usage
					WHERE agentId = ? AND createdAt >= ?
				`,
				)
				.bind(params.agentId, startTime)
				.first()

			// Get message count
			const messageResult = await db
				.prepare(
					`
					SELECT COUNT(*) as count
					FROM messages m
					INNER JOIN conversations c ON m.conversationId = c.id
					WHERE c.agentId = ? AND m.createdAt >= ?
				`,
				)
				.bind(params.agentId, startTime)
				.first()

			// Get conversation count
			const conversationResult = await db
				.prepare(
					`
					SELECT COUNT(DISTINCT id) as count
					FROM conversations
					WHERE agentId = ? AND createdAt >= ?
				`,
				)
				.bind(params.agentId, startTime)
				.first()

			// Get schedule execution metrics
			const scheduleResult = await db
				.prepare(
					`
					SELECT
						COUNT(*) as total,
						SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
						SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
					FROM schedule_executions
					WHERE agentId = ? AND startedAt >= ?
				`,
				)
				.bind(params.agentId, startTime)
				.first()

			return success({
				agentId: params.agentId,
				agentName: agentResult.name,
				period: params.period,
				timeRange: {
					start: startTime,
					end: now,
				},
				metrics: {
					totalApiCalls: (usageResult?.totalCalls as number) || 0,
					totalMessages: (messageResult?.count as number) || 0,
					totalConversations: (conversationResult?.count as number) || 0,
					averageResponseTime: (usageResult?.avgDuration as number) || 0,
					tokensUsed: {
						input: (usageResult?.inputTokens as number) || 0,
						output: (usageResult?.outputTokens as number) || 0,
						total: (usageResult?.totalTokens as number) || 0,
					},
					estimatedCost: (usageResult?.totalCost as number) || 0,
					scheduleExecutions: {
						total: (scheduleResult?.total as number) || 0,
						completed: (scheduleResult?.completed as number) || 0,
						failed: (scheduleResult?.failed as number) || 0,
					},
				},
				generatedAt: now,
			})
		} catch (error) {
			return failure(error instanceof Error ? error.message : 'Failed to get metrics')
		}
	},
})

/**
 * Executable tool type that includes the execute method.
 * Use this when you need to call execute() on tools.
 */
export type ExecutableTool = {
	id: string
	description: string
	inputSchema: z.ZodTypeAny
	outputSchema: z.ZodTypeAny
	// biome-ignore lint/suspicious/noExplicitAny: Required for heterogeneous tool collections
	execute: (params: any, context: ToolContext) => Promise<ToolResult<any>>
}

/**
 * All agent control tools
 */
export const agentControlTools: ExecutableTool[] = [
	listAgentsTool,
	getAgentTool,
	sendMessageTool,
	configureAgentTool,
	createAgentTool,
	deleteAgentTool,
	scheduleTaskTool,
	executeToolTool,
	listAgentToolsTool,
	getAgentMetricsTool,
]

/**
 * Get agent control tools
 */
export function getAgentControlTools(_context: ToolContext): ExecutableTool[] {
	return agentControlTools
}

/**
 * Agent control tool IDs
 */
export const AGENT_CONTROL_TOOL_IDS = [
	'agent_list',
	'agent_get',
	'agent_send_message',
	'agent_configure',
	'agent_create',
	'agent_delete',
	'agent_schedule',
	'agent_execute_tool',
	'agent_list_tools',
	'agent_metrics',
] as const

export type AgentControlToolId = (typeof AGENT_CONTROL_TOOL_IDS)[number]
