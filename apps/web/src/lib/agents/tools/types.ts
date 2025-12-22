import type { ZodSchema, z } from 'zod'

/**
 * Tool execution context providing access to Cloudflare bindings.
 */
export interface ToolContext {
	env: CloudflareEnv
	workspaceId: string
	userId: string
}

/**
 * Result of a tool execution.
 */
export interface ToolResult<T = unknown> {
	success: boolean
	data?: T
	error?: string
}

/**
 * Native tool definition for Cloudflare Workers.
 *
 * A simple, Edge-native interface for defining AI agent tools.
 */
export interface Tool<TInput extends ZodSchema = ZodSchema, TOutput = unknown> {
	/** Unique tool identifier */
	id: string

	/** Human-readable description of what the tool does */
	description: string

	/** Zod schema for validating input parameters */
	inputSchema: TInput

	/** Execute the tool with validated input */
	execute: (params: z.infer<TInput>, context: ToolContext) => Promise<ToolResult<TOutput>>
}

/**
 * Create a type-safe tool definition.
 *
 * @example
 * ```ts
 * const myTool = createTool({
 *   id: 'my-tool',
 *   description: 'Does something useful',
 *   inputSchema: z.object({ query: z.string() }),
 *   execute: async (params, ctx) => {
 *     return { success: true, data: 'result' }
 *   }
 * })
 * ```
 */
export function createTool<TInput extends ZodSchema, TOutput = unknown>(
	config: Tool<TInput, TOutput>,
): Tool<TInput, TOutput> {
	return config
}

/**
 * All available tool types.
 */
export type ToolType =
	// Cloudflare native
	| 'http'
	| 'sql'
	| 'kv'
	| 'r2'
	| 'vectorize'
	| 'search'
	// Utility
	| 'datetime'
	| 'json'
	| 'text'
	| 'math'
	| 'uuid'
	| 'hash'
	| 'base64'
	| 'url'
	| 'delay'
	// Integrations
	| 'zapier'
	| 'webhook'
	| 'slack'
	| 'discord'
	| 'email'
	| 'teams'
	| 'twilio_sms'
	| 'make'
	| 'n8n'
	// AI
	| 'sentiment'
	| 'summarize'
	| 'translate'
	| 'image_generate'
	| 'classify'
	| 'ner'
	| 'embedding'
	| 'question_answer'
	// Data
	| 'rss'
	| 'scrape'
	| 'regex'
	| 'crypto'
	| 'json_schema'
	| 'csv'
	| 'template'
	// Custom
	| 'custom'

/**
 * Tool configuration stored in the database.
 */
export interface ToolConfig {
	id: string
	name: string
	description: string | null
	type: ToolType
	inputSchema?: Record<string, unknown> | null
	config?: Record<string, unknown> | null
	code?: string | null
}

/**
 * Helper to create a successful tool result.
 */
export function success<T>(data: T): ToolResult<T> {
	return { success: true, data }
}

/**
 * Helper to create a failed tool result.
 */
export function failure(error: string): ToolResult<never> {
	return { success: false, error }
}
