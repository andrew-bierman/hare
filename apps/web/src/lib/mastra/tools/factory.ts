import type { Database } from 'web-app/db/types'
import { eq } from 'drizzle-orm'
import { tools as toolsTable, agentTools } from 'web-app/db/schema'
import { type Tool, type ToolContext, type ToolConfig, createTool, success, failure } from './types'
import { httpRequestTool } from './http'

/**
 * Load tools attached to an agent from the database.
 */
export async function loadAgentTools(agentId: string, db: Database, context: ToolContext): Promise<Tool[]> {
	// Get tool IDs attached to this agent
	const attachedTools = await db.select({ toolId: agentTools.toolId }).from(agentTools).where(eq(agentTools.agentId, agentId))

	if (attachedTools.length === 0) {
		return []
	}

	// Load tool configurations
	const toolIds = attachedTools.map((t) => t.toolId)
	const toolConfigs = await db.select().from(toolsTable)

	// Filter to only attached tools
	const attachedConfigs = toolConfigs.filter((t) => toolIds.includes(t.id))

	// Convert to executable tools
	return attachedConfigs.map((config) => createToolFromConfig(config as ToolConfig, context)).filter((t): t is Tool => t !== null)
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
			console.warn(`Unknown tool type: ${config.type}`)
			return null
	}
}

/**
 * Create an HTTP tool from configuration.
 */
function createHTTPToolFromConfig(config: ToolConfig, context: ToolContext): Tool {
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
 * Create a custom tool from configuration with user-provided code.
 */
function createCustomToolFromConfig(config: ToolConfig, context: ToolContext): Tool {
	return createTool({
		id: config.id,
		description: config.description || '',
		inputSchema: httpRequestTool.inputSchema, // Fallback schema
		execute: async (params, ctx) => {
			if (!config.code) {
				return failure('No code provided for custom tool')
			}

			try {
				// Create a sandboxed function from the code
				// Note: In production, consider using Cloudflare Workers for isolation
				const fn = new Function('params', 'context', `return (async () => { ${config.code} })()`)
				const result = await fn(params, ctx)
				return success(result)
			} catch (error) {
				return failure(`Custom tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
			}
		},
	})
}
