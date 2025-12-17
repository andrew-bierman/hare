import type { Database } from 'web-app/db/types'
import { EdgeAgent, createEdgeAgent, type AgentTool } from './agent'
import { loadAgentTools, getSystemTools, type ToolContext } from './tools'

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
	/** Include system tools (KV, R2, Vectorize) */
	includeSystemTools?: boolean
	/** User ID for tool context */
	userId: string
}

/**
 * Create an Edge-compatible Agent from a database configuration.
 *
 * @param agentConfig - Agent configuration from database
 * @param db - Drizzle database instance
 * @param env - Cloudflare environment bindings
 * @param options - Additional options
 * @returns Configured Edge Agent
 */
export async function createAgentFromConfig(
	agentConfig: AgentConfig,
	db: Database,
	env: CloudflareEnv,
	options: CreateAgentOptions
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
	const systemToolsMap = includeSystemTools ? getSystemTools(toolContext) : []

	// Convert Mastra tools to AgentTool format
	const agentTools: AgentTool[] = []

	// Convert database tools
	for (const tool of dbTools) {
		agentTools.push({
			id: tool.id,
			description: tool.description || '',
			inputSchema: {},
			execute: async (params) => {
				// Tools use Mastra's execute pattern
				return (tool as unknown as { execute: (params: unknown) => Promise<unknown> }).execute(params)
			},
		})
	}

	// Convert system tools
	for (const tool of systemToolsMap) {
		agentTools.push({
			id: tool.id,
			description: tool.description || '',
			inputSchema: {},
			execute: async (params) => {
				return (tool as unknown as { execute: (params: unknown) => Promise<unknown> }).execute(params)
			},
		})
	}

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
 * Useful for quick testing or system agents.
 */
export function createSimpleAgent(
	name: string,
	instructions: string,
	model: string,
	env: CloudflareEnv,
	tools: AgentTool[] = []
): EdgeAgent {
	return createEdgeAgent({
		name,
		instructions,
		model,
		ai: env.AI,
		tools,
	})
}

// Re-export types and utilities
export type { ToolContext } from './tools'
export type { EdgeAgent, AgentTool } from './agent'
export { createEdgeAgent } from './agent'
export { createWorkersAIModel, getWorkersAIModelId, getAvailableModels, generateEmbedding, generateEmbeddings } from './providers/workers-ai'
export * from './tools'
