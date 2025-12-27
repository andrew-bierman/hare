/**
 * Hare AI Agent System - Hosted Platform Entry Point
 *
 * Re-exports from @hare/agent and @hare/tools packages,
 * plus hosted-only functionality for the web platform.
 *
 * Built on Cloudflare Agents SDK for:
 * - Durable Object-backed state persistence
 * - WebSocket support with hibernation
 * - Real-time state synchronization
 * - Scheduling and alarms
 * - Model Context Protocol (MCP) support
 */

// ==========================================
// RE-EXPORT FROM @hare/agent
// ==========================================

// Types (safe to import anywhere)
export type {
	AgentOptions,
	AgentRouteConfig,
	AgentStreamResponse,
	AgentTool,
	ChatPayload,
	ClientMessage,
	HareAgentState,
	McpAgentState,
	ScheduledTask,
	SchedulePayload,
	ServerMessage,
	ToolExecutePayload,
} from '@hare/agent'
// Edge Agent (universal)
// Router utilities (universal)
// Workers AI Provider
export {
	createAgentHeaders,
	createEdgeAgent,
	createWorkersAIModel,
	DEFAULT_HARE_AGENT_STATE,
	DEFAULT_MCP_AGENT_STATE,
	EdgeAgent,
	EMBEDDING_MODELS,
	generateEmbedding,
	generateEmbeddings,
	getAgentIdFromRequest,
	getAvailableModels,
	getWorkersAIModelId,
	isWebSocketRequest,
	routeHttpToAgent,
	routeToHareAgent,
	routeToMcpAgent,
	routeWebSocketToAgent,
	WORKERS_AI_MODELS,
} from '@hare/agent'

// ==========================================
// RE-EXPORT FROM @hare/tools
// ==========================================

export type {
	SystemToolId,
	Tool,
	ToolCategory,
	ToolConfig,
	ToolContext,
	ToolResult,
	ToolType,
} from '@hare/tools'
// Individual tool getters
export {
	createTool,
	failure,
	getAITools,
	getDataTools,
	getHTTPTools,
	getIntegrationTools,
	getKVTools,
	getMemoryTools,
	getR2Tools,
	getSandboxTools,
	getSearchTools,
	getSQLTools,
	getSystemTools,
	getSystemToolsMap,
	getToolsByCategory,
	getTransformTools,
	getUtilityTools,
	getValidationTools,
	isSystemTool,
	SYSTEM_TOOL_IDS,
	success,
	TOOL_COUNTS,
} from '@hare/tools'

// ==========================================
// HOSTED-ONLY FUNCTIONALITY
// ==========================================

// Tool factory for loading from database
export { loadAgentTools } from './tools/factory'

import { type AgentTool, createEdgeAgent, type EdgeAgent } from '@hare/agent'
import { getSystemTools, type ToolContext } from '@hare/tools'
// Agent configuration interface (extends SDK types with DB fields)
import type { Database } from 'web-app/db/types'

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

	// Import loadAgentTools dynamically to avoid circular deps
	const { loadAgentTools } = await import('./tools/factory')

	// Create tool context
	const toolContext: ToolContext = {
		env,
		workspaceId: agentConfig.workspaceId,
		userId,
	}

	// Load agent's tools from database
	const dbTools = await loadAgentTools({ agentId: agentConfig.id, db, context: toolContext })

	// Get system tools if requested
	const systemTools = includeSystemTools ? getSystemTools(toolContext) : []

	// Convert to AgentTool format
	const agentTools: AgentTool[] = [...dbTools, ...systemTools].map((tool) => ({
		id: tool.id,
		description: tool.description,
		inputSchema: {},
		execute: async (params) => {
			const result = await tool.call(params, toolContext)
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
