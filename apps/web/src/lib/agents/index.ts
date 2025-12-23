/**
 * Hare AI Agent System
 *
 * Built on Cloudflare Agents SDK for:
 * - Durable Object-backed state persistence
 * - WebSocket support with hibernation
 * - Real-time state synchronization
 * - Scheduling and alarms
 * - Model Context Protocol (MCP) support
 *
 * NOTE: The actual agent classes (HareAgent, HareMcpAgent) are NOT exported here
 * because they import from 'agents' which uses 'cloudflare:workers' - a Workers-only module.
 * Those classes should only be imported in:
 * - open-next.config.ts (for Cloudflare Workers deployment)
 * - worker.ts (for local development reference)
 */

import type { Database } from 'web-app/db/types'
import { type AgentTool, createEdgeAgent, type EdgeAgent } from './agent'
import { getSystemTools, loadAgentTools, type ToolContext } from './tools'

// Re-export types (safe to import anywhere)
export type {
	HareAgentState,
	McpAgentState,
	ClientMessage,
	ServerMessage,
	ScheduledTask,
	ChatPayload,
	ToolExecutePayload,
	SchedulePayload,
} from './types'
export { DEFAULT_HARE_AGENT_STATE, DEFAULT_MCP_AGENT_STATE } from './types'

// Re-export router utilities (safe to import anywhere)
export {
	routeToHareAgent,
	routeWebSocketToAgent,
	routeHttpToAgent,
	routeToMcpAgent,
	isWebSocketRequest,
	getAgentIdFromRequest,
	createAgentHeaders,
	type AgentRouteConfig,
} from './router'

/**
 * Agent configuration from database.
 */
export interface AgentConfig {
	id: string
	workspaceId: string
	name: string
	description: string | null
	instructions: string | null
	model: string
	status: 'draft' | 'deployed' | 'archived'
	config: {
		temperature?: number
		maxTokens?: number
		topP?: number
		topK?: number
		stopSequences?: string[]
	} | null
}

/**
 * Options for creating an agent.
 */
export interface CreateAgentOptions {
	/** Include system tools (KV, R2, Vectorize, etc.) */
	includeSystemTools?: boolean
	/** User ID for tool context */
	userId: string
}

/**
 * Create an Edge-compatible Agent from a database configuration.
 */
export async function createAgentFromConfig(
	agentConfig: AgentConfig,
	db: Database,
	env: CloudflareEnv,
	options: CreateAgentOptions,
): Promise<EdgeAgent> {
	const { includeSystemTools = true, userId } = options

	// Create tool context
	const toolContext: ToolContext = {
		env,
		workspaceId: agentConfig.workspaceId,
		userId,
	}

	// Load agent's tools from database
	const dbTools = await loadAgentTools(agentConfig.id, db, toolContext)

	// Get system tools if requested
	const systemTools = includeSystemTools ? getSystemTools(toolContext) : []

	// Convert to AgentTool format
	const agentTools: AgentTool[] = [...dbTools, ...systemTools].map((tool) => ({
		id: tool.id,
		description: tool.description,
		inputSchema: {},
		execute: async (params) => {
			const result = await tool.execute(params, toolContext)
			if (result.success) {
				return result.data
			}
			throw new Error(result.error || 'Tool execution failed')
		},
	}))

	// Build instructions
	const instructions = buildInstructions(agentConfig, agentTools)

	// Create and return the Edge agent
	return createEdgeAgent({
		name: agentConfig.name,
		instructions,
		model: agentConfig.model,
		ai: env.AI,
		tools: agentTools,
	})
}

/**
 * Build comprehensive instructions for the agent.
 */
function buildInstructions(config: AgentConfig, tools: AgentTool[]): string {
	const parts: string[] = []

	// Add base instructions
	if (config.instructions) {
		parts.push(config.instructions)
	} else {
		parts.push('You are a helpful AI assistant.')
	}

	// Add tool documentation if tools are available
	if (tools.length > 0) {
		parts.push('\n\n## Available Tools\n')
		parts.push('You have access to the following tools:\n')

		for (const tool of tools) {
			parts.push(`- **${tool.id}**: ${tool.description || 'No description'}`)
		}

		parts.push('\nUse these tools when appropriate to help answer questions and complete tasks.')
	}

	return parts.join('\n')
}

/**
 * Create a simple agent without database tools.
 */
export function createSimpleAgent(
	name: string,
	instructions: string,
	model: string,
	env: CloudflareEnv,
	tools: AgentTool[] = [],
): EdgeAgent {
	return createEdgeAgent({
		name,
		instructions,
		model,
		ai: env.AI,
		tools,
	})
}

export type { AgentTool, EdgeAgent } from './agent'
export { createEdgeAgent } from './agent'
export {
	createWorkersAIModel,
	generateEmbedding,
	generateEmbeddings,
	getAvailableModels,
	getWorkersAIModelId,
} from './providers/workers-ai'
// Re-export types and utilities
export type { Tool, ToolConfig, ToolContext, ToolResult } from './tools'
export * from './tools'
