import type { tools } from '@hare/db'
import type { AnyTool } from '@hare/tools'
import type { InferSelectModel } from 'drizzle-orm'
import { toJSONSchema, type z } from 'zod/v4'
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
	// Use inputSchema from database if available, fallback to options, then null
	const dbInputSchema = (tool as ToolRow & { inputSchema?: unknown }).inputSchema as
		| { type: 'object'; properties?: InputSchema }
		| null
		| undefined
	// Convert from database format (with type: 'object' wrapper) to API format (just properties)
	const inputSchema = options.inputSchema || dbInputSchema?.properties || null

	return {
		id: tool.id,
		workspaceId: tool.workspaceId,
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
		workspaceId: 'system',
		config: undefined,
		createdAt: now,
		updatedAt: now,
	}
}

/**
 * Map of tool ID prefixes/patterns to their ToolType categories.
 * Used by getToolTypeFromId to determine the correct type for API responses.
 */
const TOOL_TYPE_MAP: Record<string, ToolType> = {
	// Cloudflare native
	kv_get: 'kv' as ToolType,
	kv_put: 'kv' as ToolType,
	kv_delete: 'kv' as ToolType,
	kv_list: 'kv' as ToolType,
	r2_get: 'r2' as ToolType,
	r2_put: 'r2' as ToolType,
	r2_delete: 'r2' as ToolType,
	r2_list: 'r2' as ToolType,
	r2_head: 'r2' as ToolType,
	sql_query: 'sql' as ToolType,
	sql_execute: 'sql' as ToolType,
	sql_batch: 'sql' as ToolType,
	http_request: 'http' as ToolType,
	http_get: 'http' as ToolType,
	http_post: 'http' as ToolType,
	ai_search: 'search' as ToolType,
	ai_search_answer: 'search' as ToolType,
	// Memory tools -> custom type since they don't have a dedicated category
	recall_memory: 'custom' as ToolType,
	store_memory: 'custom' as ToolType,
	// Integrations
	zapier: 'zapier' as ToolType,
	webhook: 'webhook' as ToolType,
}

/**
 * Get the tool type from a tool ID.
 * Maps tool IDs to their category types for API responses.
 */
function getToolTypeFromId(toolId: string): ToolType {
	// Check explicit mapping first
	const mapped = TOOL_TYPE_MAP[toolId]
	if (mapped) {
		return mapped
	}
	// For most tools, the ID matches the type (datetime, json, text, sentiment, etc.)
	return toolId as ToolType
}

/**
 * Convert a Zod schema to a simplified input schema for API response.
 * Extracts properties from the JSON Schema.
 * Falls back to empty schema on error to prevent tool serialization failures.
 */
function zodSchemaToInputSchema(zodSchema: unknown, toolId?: string): NonNullable<InputSchema> {
	try {
		// Use Zod v4's built-in JSON Schema conversion
		const jsonSchema = toJSONSchema(zodSchema as z.ZodType)
		// Extract properties from the JSON Schema
		if (
			typeof jsonSchema === 'object' &&
			jsonSchema !== null &&
			'properties' in jsonSchema &&
			typeof jsonSchema.properties === 'object'
		) {
			const result: Record<string, unknown> = {}
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
	} catch (error) {
		// Log schema conversion failures to help debug tool definition issues
		console.error(
			`[tool-serializer] Failed to convert schema for tool "${toolId || 'unknown'}":`,
			error,
		)
		return {}
	}
}

/**
 * Map of lowercase words to their proper acronym form.
 * Used by generateToolName to properly capitalize known acronyms.
 */
const ACRONYM_MAP: Record<string, string> = {
	kv: 'KV',
	r2: 'R2',
	ai: 'AI',
	ner: 'NER',
	sql: 'SQL',
	http: 'HTTP',
	url: 'URL',
	json: 'JSON',
	csv: 'CSV',
	rss: 'RSS',
	qr: 'QR',
	ip: 'IP',
	uuid: 'UUID',
}

/**
 * Generate a human-readable name from a tool ID.
 * Handles known acronyms (e.g., "ai_search" -> "AI Search").
 */
function generateToolName(toolId: string): string {
	return toolId
		.split('_')
		.map((word) => {
			const lower = word.toLowerCase()
			if (lower in ACRONYM_MAP) {
				return ACRONYM_MAP[lower]
			}
			return word.charAt(0).toUpperCase() + word.slice(1)
		})
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
		workspaceId: 'system',
		name: generateToolName(tool.id),
		description: tool.description,
		type: getToolTypeFromId(tool.id),
		inputSchema: zodSchemaToInputSchema(tool.inputSchema, tool.id),
		outputSchema: tool.outputSchema
			? zodSchemaToInputSchema(tool.outputSchema, `${tool.id}_output`)
			: undefined,
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
