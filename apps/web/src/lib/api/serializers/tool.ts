import type { z } from '@hono/zod-openapi'
import type { InferSelectModel } from 'drizzle-orm'
import type { tools } from 'web-app/db/schema'
import type { ToolSchema, ToolTypeSchema } from '../schemas'

type ToolRow = InferSelectModel<typeof tools>

/**
 * Valid tool types for API responses (derived from Zod schema).
 */
export type ToolType = z.infer<typeof ToolTypeSchema>

/**
 * API response shape for a tool (derived from Zod schema).
 */
export type SerializedTool = z.infer<typeof ToolSchema>

/**
 * Map database tool type to API tool type.
 * Returns 'custom' for unknown types.
 */
export function mapToolType(dbType: string): ToolType {
	return dbType as ToolType
}

/**
 * Input schema type for tools (matches JSON Schema format).
 */
type InputSchema = SerializedTool['inputSchema']

/**
 * Serialize a database tool row to API response format.
 */
export function serializeTool(
	tool: ToolRow,
	options: {
		inputSchema?: InputSchema
		code?: string
	} = {},
): SerializedTool {
	// Use inputSchema from database if available, fallback to options, then empty object
	const dbInputSchema = (tool as ToolRow & { inputSchema?: unknown }).inputSchema as
		| { type: 'object'; properties?: InputSchema }
		| null
		| undefined
	// Convert from database format (with type: 'object' wrapper) to API format (just properties)
	const inputSchema = options.inputSchema || dbInputSchema?.properties || {}

	return {
		id: tool.id,
		name: tool.name,
		description: tool.description || '',
		type: mapToolType(tool.type),
		inputSchema,
		config: tool.config as SerializedTool['config'],
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
	inputSchema: InputSchema
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
