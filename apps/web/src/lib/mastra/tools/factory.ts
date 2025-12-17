import { eq } from 'drizzle-orm'
import type { Tool } from '@mastra/core/tools'
import type { Database } from 'web-app/db/types'
import { tools, agentTools } from 'web-app/db/schema'
import type { ToolContext, ToolType, HttpToolConfig, SqlToolConfig, KvToolConfig, R2ToolConfig, VectorizeToolConfig } from './types'
import { createHttpTool } from './http'
import { createKvTool } from './kv'
import { createR2Tool } from './r2'
import { createSqlTool } from './sql'
import { createVectorizeTool } from './vectorize'

/**
 * Tool row from database.
 */
interface ToolRow {
	id: string
	workspaceId: string
	name: string
	description: string | null
	type: ToolType
	config: Record<string, unknown> | null
}

/**
 * Generic tool type for return values.
 * Using Tool with any to allow different input schemas.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MastraTool = Tool<any, any, any, any, any>

/**
 * Create a tool instance from a database row.
 */
function createToolFromRow(row: ToolRow, ctx: ToolContext): MastraTool | null {
	const baseConfig = {
		id: row.id,
		name: row.name,
		description: row.description || '',
	}

	const config = row.config || {}

	switch (row.type) {
		case 'http': {
			return createHttpTool({
				url: (config.url as string) || '',
				method: (config.method as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH') || 'GET',
				headers: config.headers as Record<string, string> | undefined,
				timeout: config.timeout as number | undefined,
			})
		}

		case 'kv': {
			const kvConfig: KvToolConfig = {
				...baseConfig,
				type: 'kv',
				config: {
					prefix: config.prefix as string | undefined,
					allowedOperations: config.allowedOperations as ('get' | 'put' | 'delete' | 'list')[] | undefined,
				},
			}
			return createKvTool(kvConfig, ctx)
		}

		case 'r2': {
			const r2Config: R2ToolConfig = {
				...baseConfig,
				type: 'r2',
				config: {
					prefix: config.prefix as string | undefined,
					allowedOperations: config.allowedOperations as ('get' | 'put' | 'delete' | 'list')[] | undefined,
					maxSizeBytes: config.maxSizeBytes as number | undefined,
				},
			}
			return createR2Tool(r2Config, ctx)
		}

		case 'sql': {
			const sqlConfig: SqlToolConfig = {
				...baseConfig,
				type: 'sql',
				config: {
					allowedTables: config.allowedTables as string[] | undefined,
					readOnly: config.readOnly !== false,
					maxRows: config.maxRows as number | undefined,
				},
			}
			return createSqlTool(sqlConfig, ctx)
		}

		case 'vectorize': {
			const vectorizeConfig: VectorizeToolConfig = {
				...baseConfig,
				type: 'vectorize',
				config: {
					namespace: config.namespace as string | undefined,
					topK: config.topK as number | undefined,
				},
			}
			return createVectorizeTool(vectorizeConfig, ctx)
		}

		case 'custom': {
			// Custom tools would need a secure sandbox to execute
			// For now, return null (not supported)
			console.warn(`Custom tool execution not yet supported: ${row.id}`)
			return null
		}

		default:
			console.warn(`Unknown tool type: ${row.type}`)
			return null
	}
}

/**
 * Load all tools attached to an agent.
 */
export async function loadAgentTools(agentId: string, db: Database, ctx: ToolContext): Promise<MastraTool[]> {
	// Query agent_tools junction table to get tool IDs
	const agentToolRows = await db.select().from(agentTools).where(eq(agentTools.agentId, agentId))

	if (agentToolRows.length === 0) {
		return []
	}

	// Get full tool records
	const toolIds = agentToolRows.map((at) => at.toolId)
	const toolRows = await db.select().from(tools)

	// Filter to only tools attached to this agent
	const attachedTools = toolRows.filter((t) => toolIds.includes(t.id)) as ToolRow[]

	// Create tool instances
	const toolInstances: MastraTool[] = []
	for (const row of attachedTools) {
		const tool = createToolFromRow(row, ctx)
		if (tool) {
			toolInstances.push(tool)
		}
	}

	return toolInstances
}

/**
 * Load a single tool by ID.
 */
export async function loadToolById(toolId: string, db: Database, ctx: ToolContext): Promise<MastraTool | null> {
	const [row] = await db.select().from(tools).where(eq(tools.id, toolId))

	if (!row) {
		return null
	}

	return createToolFromRow(row as ToolRow, ctx)
}

/**
 * Load all tools for a workspace.
 */
export async function loadWorkspaceTools(workspaceId: string, db: Database, ctx: ToolContext): Promise<MastraTool[]> {
	const toolRows = await db.select().from(tools).where(eq(tools.workspaceId, workspaceId))

	const toolInstances: MastraTool[] = []
	for (const row of toolRows as ToolRow[]) {
		const tool = createToolFromRow(row, ctx)
		if (tool) {
			toolInstances.push(tool)
		}
	}

	return toolInstances
}

/**
 * Get system tools that are always available.
 * These don't require database records.
 */
export function getSystemTools(ctx: ToolContext): MastraTool[] {
	const systemTools: MastraTool[] = []

	// Add built-in KV tool if KV is available
	if (ctx.env.KV) {
		const kvTool = createKvTool(
			{
				id: 'system-kv',
				name: 'Key-Value Store',
				description: 'Store and retrieve data from key-value storage',
				type: 'kv',
				config: { allowedOperations: ['get', 'put', 'delete', 'list'] },
			},
			ctx
		)
		systemTools.push(kvTool)
	}

	// Add built-in R2 tool if R2 is available
	if (ctx.env.R2) {
		const r2Tool = createR2Tool(
			{
				id: 'system-r2',
				name: 'Object Storage',
				description: 'Store and retrieve files from object storage',
				type: 'r2',
				config: { allowedOperations: ['get', 'put', 'delete', 'list'] },
			},
			ctx
		)
		systemTools.push(r2Tool)
	}

	// Add built-in Vectorize tool if available
	if (ctx.env.VECTORIZE && ctx.env.AI) {
		const vectorizeTool = createVectorizeTool(
			{
				id: 'system-vectorize',
				name: 'Semantic Search',
				description: 'Search and store content using semantic similarity',
				type: 'vectorize',
				config: { topK: 10 },
			},
			ctx
		)
		systemTools.push(vectorizeTool)
	}

	return systemTools
}
