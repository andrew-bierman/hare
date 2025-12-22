import type { Database } from 'web-app/db/types'
import { eq } from 'drizzle-orm'
import { tools as toolsTable, agentTools } from 'web-app/db/schema'
import { type Tool, type ToolContext, type ToolConfig, createTool } from './types'
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
			// Custom code execution is disabled for security reasons
			console.warn(`Custom tool "${config.name}" (${config.id}) is not supported - arbitrary code execution is disabled`)
			return null
		default:
			console.warn(`Unknown tool type "${config.type}" for tool ${config.id}`)
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

