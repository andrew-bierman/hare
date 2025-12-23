import { eq } from 'drizzle-orm'
import { agentTools, tools as toolsTable } from 'web-app/db/schema'
import type { Database } from 'web-app/db/types'
import { z } from 'zod'
import { httpRequestTool } from './http'
import { createTool, failure, type Tool, type ToolConfig, type ToolContext } from './types'

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
export async function loadAgentTools(
	agentId: string,
	db: Database,
	context: ToolContext,
): Promise<Tool[]> {
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
		.filter((t): t is Tool => t !== null)
}

/**
 * Create an executable tool from a database configuration.
 */
function createToolFromConfig(config: ToolConfig, context: ToolContext): Tool | null {
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
function createHTTPToolFromConfig(config: ToolConfig, _context: ToolContext): Tool {
	const toolConfig = config.config as {
		url?: string
		method?: string
		headers?: Record<string, string>
	} | null

	return createTool({
		id: config.id,
		description: config.description || '',
		inputSchema: httpRequestTool.inputSchema,
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
function createCustomToolFromConfig(config: ToolConfig, _context: ToolContext): Tool {
	// Use the tool's own input schema, not a misleading HTTP fallback
	const inputSchema = buildInputSchema(config.inputSchema)

	return createTool({
		id: config.id,
		description: config.description || '',
		inputSchema,
		execute: async (_params, _ctx) => {
			if (!config.code) {
				return failure('No code provided for custom tool')
			}

			// Custom tool execution requires sandboxed environment
			// Direct eval/Function execution is unsafe and disabled
			return failure(
				'Custom tool execution is not available in this environment. ' +
					'Custom tools must be executed in a sandboxed Cloudflare Worker. ' +
					'Please use built-in tool types (http, kv, r2, sql, vectorize) instead.',
			)
		},
	})
}
