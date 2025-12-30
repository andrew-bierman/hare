/**
 * Agent factory for creating agents from database configurations.
 *
 * This module provides utilities for creating Edge-compatible agents
 * from database-stored configurations, including loading attached tools.
 */

import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { type Database, agentTools, tools as toolsTable } from '@hare/db'
import {
	type AnyTool,
	createRegistry,
	createTool,
	failure,
	getSystemTools,
	httpRequestTool,
	HttpResponseOutputSchema,
	type ToolConfig,
	type ToolContext,
} from '@hare/tools'
import { type AgentTool, createHareEdgeAgent, type HareEdgeAgent } from './edge-agent'

/**
 * Generic output schema for custom tools.
 */
const CustomToolOutputSchema = z.unknown()

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
 * Input for loading agent tools.
 */
export interface LoadAgentToolsInput {
	agentId: string
	db: Database
	context: ToolContext
}

/**
 * Build a Zod schema from a JSON Schema-like configuration.
 * Returns a passthrough object schema for unknown structures.
 */
function buildInputSchema(inputSchema: Record<string, unknown> | null | undefined): z.ZodType {
	if (!inputSchema || Object.keys(inputSchema).length === 0) {
		// No schema defined - accept any object
		return z.record(z.string(), z.unknown())
	}

	// For now, use a passthrough object schema
	// In the future, this could be enhanced to parse JSON Schema properly
	return z.record(z.string(), z.unknown())
}

/**
 * Load tools attached to an agent from the database.
 */
export async function loadAgentTools(input: LoadAgentToolsInput): Promise<AnyTool[]> {
	const { agentId, db, context } = input
	// Get tool IDs attached to this agent
	const attachedTools = await db
		.select({ toolId: agentTools.toolId })
		.from(agentTools)
		.where(eq(agentTools.agentId, agentId))

	if (attachedTools.length === 0) {
		return []
	}

	// Load tool configurations
	const toolIds = attachedTools.map((t) => t.toolId)
	const toolConfigs = await db.select().from(toolsTable)

	// Filter to only attached tools
	const attachedConfigs = toolConfigs.filter((t) => toolIds.includes(t.id))

	// Convert to executable tools
	return attachedConfigs
		.map((config) => createToolFromConfig(config as ToolConfig, context))
		.filter((t): t is AnyTool => t !== null)
}

/**
 * Create an executable tool from a database configuration.
 */
function createToolFromConfig(config: ToolConfig, context: ToolContext): AnyTool | null {
	switch (config.type) {
		case 'http':
			return createHTTPToolFromConfig(config, context)
		case 'custom':
			return createCustomToolFromConfig(config, context)
		default:
			console.warn(`Unknown tool type "${config.type}" for tool ${config.id}`)
			return null
	}
}

/**
 * Create an HTTP tool from configuration.
 */
function createHTTPToolFromConfig(config: ToolConfig, _context: ToolContext): AnyTool {
	const toolConfig = config.config as {
		url?: string
		method?: string
		headers?: Record<string, string>
	} | null

	return createTool({
		id: config.id,
		description: config.description || '',
		inputSchema: httpRequestTool.inputSchema,
		outputSchema: HttpResponseOutputSchema,
		execute: async (params, ctx) => {
			// Merge config defaults with runtime params
			const mergedParams = {
				url: params.url || toolConfig?.url || '',
				method: params.method || toolConfig?.method || 'GET',
				headers: { ...toolConfig?.headers, ...params.headers },
				body: params.body,
				timeout: params.timeout || 30000,
			}
			return httpRequestTool.execute(mergedParams, ctx)
		},
	})
}

/**
 * Create a custom tool from configuration.
 *
 * NOTE: Custom tool execution requires a secure sandboxed environment.
 * Currently, custom tools will return an error indicating they need to be
 * executed in a Cloudflare Worker or similar isolated environment.
 */
function createCustomToolFromConfig(config: ToolConfig, _context: ToolContext): AnyTool {
	// Use the tool's own input schema, not a misleading HTTP fallback
	const inputSchema = buildInputSchema(config.inputSchema)

	return createTool({
		id: config.id,
		description: config.description || '',
		inputSchema,
		outputSchema: CustomToolOutputSchema,
		execute: async (_params, _ctx) => {
			if (!config.code) {
				return failure('No code provided for custom tool')
			}

			// Custom tool execution requires sandboxed environment
			// Direct eval/Function execution is unsafe and disabled
			return failure(
				'Custom tool execution is not available in this environment. ' +
					'Custom tools must be executed in a sandboxed Cloudflare Worker. ' +
					'Please use built-in tool types (http, kv, r2, sql) instead.',
			)
		},
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
 * Create an Edge-compatible Agent from a database configuration.
 */
export async function createAgentFromConfig(input: CreateAgentFromConfigInput): Promise<HareEdgeAgent> {
	const { agentConfig, db, env, includeSystemTools = true, userId } = input

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
	return createHareEdgeAgent({
		name: agentConfig.name,
		instructions,
		model: agentConfig.model,
		ai: env.AI,
		tools: agentTools,
	})
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
export function createSimpleAgent(input: CreateSimpleAgentInput): HareEdgeAgent {
	const { name, instructions, model, env, tools = [] } = input
	return createHareEdgeAgent({
		name,
		instructions,
		model,
		ai: env.AI,
		tools,
	})
}
