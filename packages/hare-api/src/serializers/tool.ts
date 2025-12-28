import type { z } from '@hono/zod-openapi'
import type { InferSelectModel } from 'drizzle-orm'
import type { tools } from 'web-app/db/schema'
import type { AnyTool } from '@hare/tools'
import { zodToJsonSchema } from 'zod-to-json-schema'
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

/**
 * Get the tool type from a tool ID.
 * Maps tool IDs to their category types.
 */
function getToolTypeFromId(toolId: string): ToolType {
	// Map tool IDs to their types based on prefix/pattern
	if (toolId.startsWith('kv_')) return 'kv' as ToolType
	if (toolId.startsWith('r2_')) return 'r2' as ToolType
	if (toolId.startsWith('sql_')) return 'sql' as ToolType
	if (toolId.startsWith('http_') || toolId === 'http_request') return 'http' as ToolType
	if (toolId.startsWith('ai_search')) return 'search' as ToolType
	if (toolId.startsWith('validate_')) return toolId as ToolType
	if (toolId.startsWith('code_') || toolId === 'sandbox_file') return toolId as ToolType
	// For other tools, the ID is typically the type
	return toolId as ToolType
}

/**
 * Convert a Zod schema to a simplified input schema for API response.
 * Extracts properties from the JSON Schema.
 */
function zodSchemaToInputSchema(zodSchema: unknown): InputSchema {
	try {
		// biome-ignore lint/suspicious/noExplicitAny: zod-to-json-schema types differ between Zod versions
		const jsonSchema = zodToJsonSchema(zodSchema as any, { $refStrategy: 'none' })
		// Extract properties from the JSON Schema
		if (
			typeof jsonSchema === 'object' &&
			jsonSchema !== null &&
			'properties' in jsonSchema &&
			typeof jsonSchema.properties === 'object'
		) {
			const result: InputSchema = {}
			for (const [key, value] of Object.entries(jsonSchema.properties || {})) {
				if (typeof value === 'object' && value !== null) {
					const prop = value as Record<string, unknown>
					result[key] = {
						type: (prop.type as string) || 'string',
						description: prop.description as string | undefined,
						enum: prop.enum as string[] | undefined,
						optional: !(
							'required' in jsonSchema &&
							Array.isArray(jsonSchema.required) &&
							jsonSchema.required.includes(key)
						),
					}
				}
			}
			return result
		}
		return {}
	} catch {
		return {}
	}
}

/**
 * Generate a human-readable name from a tool ID.
 */
function generateToolName(toolId: string): string {
	return toolId
		.split('_')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ')
}

/**
 * Serialize a @hare/tools tool to API response format.
 * Converts Zod schemas to JSON Schema for the API.
 */
export function serializeHareTool(tool: AnyTool): SerializedTool {
	const now = new Date().toISOString()
	return {
		id: tool.id,
		name: generateToolName(tool.id),
		description: tool.description,
		type: getToolTypeFromId(tool.id),
		inputSchema: zodSchemaToInputSchema(tool.inputSchema),
		config: undefined,
		isSystem: true,
		createdAt: now,
		updatedAt: now,
	}
}

/**
 * Serialize multiple @hare/tools tools to API response format.
 */
export function serializeHareTools(tools: AnyTool[]): SerializedTool[] {
	return tools.map(serializeHareTool)
}
