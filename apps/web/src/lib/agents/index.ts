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
import { getSystemTools, type ToolContext, createRegistry } from '@hare/tools'
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
 * Input for creating an agent from config.
 */
export interface CreateAgentFromConfigInput {
	/** Agent configuration from database */
	agentConfig: AgentConfig
	/** Database instance */
	db: Database
	/** Cloudflare environment */
	env: CloudflareEnv
	/** Include system tools (KV, R2, Vectorize, etc.) */
	includeSystemTools?: boolean
	/** User ID for tool context */
	userId: string
}

/**
 * Create an Edge-compatible Agent from a database configuration.
 */
export async function createAgentFromConfig(input: CreateAgentFromConfigInput): Promise<EdgeAgent> {
	const { agentConfig, db, env, includeSystemTools = true, userId } = input

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

	// Create registry with all tools
	const registry = createRegistry([...dbTools, ...systemTools])

	// Convert to AgentTool format
	const agentTools: AgentTool[] = registry.list().map((tool) => ({
		id: tool.id,
		description: tool.description,
		inputSchema: {},
		execute: async (params) => {
			const result = await registry.execute({ id: tool.id, params, context: toolContext })
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
 * Input for creating a simple agent.
 */
export interface CreateSimpleAgentInput {
	/** Agent name */
	name: string
	/** Agent instructions */
	instructions: string
	/** Model to use */
	model: string
	/** Cloudflare environment */
	env: CloudflareEnv
	/** Optional tools */
	tools?: AgentTool[]
}

/**
 * Create a simple agent without database tools.
 */
export function createSimpleAgent(input: CreateSimpleAgentInput): EdgeAgent {
	const { name, instructions, model, env, tools = [] } = input
	return createEdgeAgent({
		name,
		instructions,
		model,
		ai: env.AI,
		tools,
	})
}
