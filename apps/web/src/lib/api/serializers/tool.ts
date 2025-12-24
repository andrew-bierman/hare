import type { InferSelectModel } from 'drizzle-orm'
import type { tools } from 'web-app/db/schema'

type ToolRow = InferSelectModel<typeof tools>

/**
 * Valid tool types for API responses.
 */
export type ToolType = 'http' | 'sql' | 'kv' | 'r2' | 'vectorize' | 'custom'

/**
 * API response shape for a tool.
 */
export interface SerializedTool {
	id: string
	name: string
	description: string
	type: ToolType
	inputSchema: Record<string, unknown>
	config?: Record<string, unknown>
	code?: string
	isSystem: boolean
	createdAt: string
	updatedAt: string
}

/**
 * Map database tool type to API tool type.
 * Returns 'custom' for unknown types.
 */
export function mapToolType(dbType: string): ToolType {
	const validTypes: ToolType[] = ['http', 'sql', 'kv', 'r2', 'vectorize', 'custom']
	if (validTypes.includes(dbType as ToolType)) {
		return dbType as ToolType
	}
	return 'custom'
}

/**
 * Serialize a database tool row to API response format.
 */
export function serializeTool(
	tool: ToolRow,
	options: {
		inputSchema?: Record<string, unknown>
		code?: string
	} = {},
): SerializedTool {
	return {
		id: tool.id,
		name: tool.name,
		description: tool.description || '',
		type: mapToolType(tool.type),
		inputSchema: options.inputSchema || {},
		config: tool.config || undefined,
		code: options.code,
		isSystem: false,
		createdAt: tool.createdAt.toISOString(),
		updatedAt: tool.updatedAt.toISOString(),
	}
}

/**
 * System tool definition shape.
 */
export interface SystemToolDefinition {
	id: string
	name: string
	description: string
	type: ToolType
	inputSchema: Record<string, unknown>
	isSystem: true
}

/**
 * Serialize a system tool to API response format.
 */
export function serializeSystemTool(tool: SystemToolDefinition): SerializedTool {
	const now = new Date().toISOString()
	return {
		...tool,
		config: undefined,
		createdAt: now,
		updatedAt: now,
	}
}
