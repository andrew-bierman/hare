/**
 * Agent Control Tool Execution Tools
 *
 * Tools for executing and listing agent tools.
 */

import { z } from 'zod'
import { createTool, failure, success, type ToolContext } from '../types'
import { ExecuteToolOutputSchema, ListAgentToolsOutputSchema } from './schemas'
import { hasAgentControlCapabilities } from './types'

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

			const toolsResult = await db
				.prepare(query)
				.bind(...bindings)
				.all()

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
