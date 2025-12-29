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
import { createTool, failure, success, type HareEnv, type ToolContext, type ToolResult } from '@hare/tools'

/**
 * Executable tool type for agent control tools.
 * Unlike AnyTool (metadata only), this includes the execute method.
 * Uses Tool<any, any> pattern to allow heterogeneous collections.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ExecutableTool = {
	id: string
	description: string
	inputSchema: z.ZodTypeAny
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	execute: (params: any, context: ToolContext<HareEnv>) => Promise<ToolResult<any>>
}

/**
 * List all agents in a workspace
 */
export const listAgentsTool = createTool({
	id: 'agent_list',
	description: 'List all AI agents in the current workspace with their status and configuration',
	inputSchema: z.object({
		status: z
			.enum(['all', 'active', 'idle', 'error'])
			.optional()
			.default('all')
			.describe('Filter agents by status'),
		limit: z.number().optional().default(50).describe('Maximum number of agents to return'),
	}),
	execute: async (params, context: ToolContext) => {
		try {
			// In a real implementation, this would query the database
			// For the POC, we return mock data showing the structure
			const agents = [
				{
					id: 'agent-1',
					name: 'Customer Support Agent',
					status: 'active',
					model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
					workspaceId: context.workspaceId,
					connectedUsers: 2,
					lastActivity: Date.now() - 60000,
				},
				{
					id: 'agent-2',
					name: 'Data Analysis Agent',
					status: 'idle',
					model: '@cf/meta/llama-3.1-8b-instruct-fp8',
					workspaceId: context.workspaceId,
					connectedUsers: 0,
					lastActivity: Date.now() - 3600000,
				},
			]

			const filtered =
				params.status === 'all' ? agents : agents.filter((a) => a.status === params.status)

			return success({
				agents: filtered.slice(0, params.limit),
				total: filtered.length,
				workspaceId: context.workspaceId,
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
	}),
	execute: async (params, context: ToolContext) => {
		try {
			// Mock agent data for POC
			const agent = {
				id: params.agentId,
				name: 'Customer Support Agent',
				status: 'active',
				model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
				workspaceId: context.workspaceId,
				instructions: 'You are a helpful customer support agent.',
				connectedUsers: ['user-1', 'user-2'],
				lastActivity: Date.now(),
				scheduledTasks: [],
				messageCount: params.includeHistory ? 42 : undefined,
				messages: params.includeHistory
					? [
							{ role: 'user', content: 'Hello!' },
							{ role: 'assistant', content: 'Hi! How can I help you today?' },
						]
					: undefined,
			}

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
	execute: async (params, _context: ToolContext) => {
		try {
			// In production, this would route to the HareAgent Durable Object
			// For POC, we simulate a response
			const response = {
				agentId: params.agentId,
				messageId: `msg-${Date.now()}`,
				userMessage: params.message,
				assistantResponse: `I received your message: "${params.message}". How can I help you further?`,
				timestamp: Date.now(),
				tokensUsed: {
					prompt: 50,
					completion: 30,
					total: 80,
				},
			}

			return success(response)
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
		instructions: z.string().optional().describe('System instructions for the agent'),
		model: z.string().optional().describe('AI model to use'),
	}),
	execute: async (params, context: ToolContext) => {
		try {
			// In production, this would update the agent via Durable Object
			const updated = {
				agentId: params.agentId,
				workspaceId: context.workspaceId,
				changes: {
					...(params.name && { name: params.name }),
					...(params.instructions && { instructions: params.instructions }),
					...(params.model && { model: params.model }),
				},
				updatedAt: Date.now(),
			}

			return success(updated)
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
		instructions: z.string().optional().describe('System instructions'),
		model: z
			.string()
			.optional()
			.default('@cf/meta/llama-3.3-70b-instruct-fp8-fast')
			.describe('AI model to use'),
	}),
	execute: async (params, context: ToolContext) => {
		try {
			const newAgent = {
				id: `agent-${Date.now()}`,
				name: params.name,
				instructions: params.instructions || 'You are a helpful AI assistant.',
				model: params.model,
				workspaceId: context.workspaceId,
				status: 'idle',
				createdAt: Date.now(),
				createdBy: context.userId,
			}

			return success(newAgent)
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
		force: z.boolean().optional().default(false).describe('Force delete even if agent is active'),
	}),
	execute: async (params, _context: ToolContext) => {
		try {
			return success({
				agentId: params.agentId,
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
	execute: async (params, _context: ToolContext) => {
		try {
			if (!params.executeAt && !params.cron) {
				return failure('Either executeAt or cron must be provided')
			}

			const task = {
				id: `task-${Date.now()}`,
				agentId: params.agentId,
				action: params.action,
				type: params.cron ? 'recurring' : 'one-time',
				executeAt: params.executeAt,
				cron: params.cron,
				payload: params.payload,
				createdAt: Date.now(),
			}

			return success(task)
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
	execute: async (params, _context: ToolContext) => {
		try {
			// In production, this would route to the agent and execute the tool
			const result = {
				agentId: params.agentId,
				toolId: params.toolId,
				result: {
					success: true,
					data: { executed: true, params: params.params },
				},
				executedAt: Date.now(),
			}

			return success(result)
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
		category: z.string().optional().describe('Filter by tool category'),
	}),
	execute: async (params, _context: ToolContext) => {
		try {
			// Mock tool list for POC
			const tools = [
				{ id: 'http_request', category: 'http', description: 'Make HTTP requests' },
				{ id: 'kv_get', category: 'storage', description: 'Get value from KV store' },
				{ id: 'kv_put', category: 'storage', description: 'Store value in KV store' },
				{ id: 'sql_query', category: 'database', description: 'Execute SQL queries' },
				{ id: 'sentiment', category: 'ai', description: 'Analyze text sentiment' },
				{ id: 'summarize', category: 'ai', description: 'Summarize text' },
			]

			const filtered = params.category ? tools.filter((t) => t.category === params.category) : tools

			return success({
				agentId: params.agentId,
				tools: filtered,
				total: filtered.length,
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
	execute: async (params, _context: ToolContext) => {
		try {
			const metrics = {
				agentId: params.agentId,
				period: params.period,
				metrics: {
					totalMessages: 1542,
					totalToolCalls: 387,
					averageResponseTime: 1.2,
					tokensUsed: {
						prompt: 125000,
						completion: 87000,
						total: 212000,
					},
					errorRate: 0.02,
					activeUsers: 15,
				},
				topTools: [
					{ id: 'http_request', calls: 150 },
					{ id: 'sql_query', calls: 120 },
					{ id: 'kv_get', calls: 80 },
				],
				generatedAt: Date.now(),
			}

			return success(metrics)
		} catch (error) {
			return failure(error instanceof Error ? error.message : 'Failed to get metrics')
		}
	},
})

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
 * Get agent control tools with context for MCP registration
 */
export function getAgentControlToolsForMcp(_context: ToolContext): ExecutableTool[] {
	return agentControlTools
}
