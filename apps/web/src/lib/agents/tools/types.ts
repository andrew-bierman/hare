import type { z, ZodSchema } from 'zod'

/**
 * Tool execution context providing access to Cloudflare bindings.
 * Note: CloudflareEnv is a global type from worker-configuration.d.ts
 */
export const ToolContextSchema = z.object({
	env: z.custom<CloudflareEnv>(),
	workspaceId: z.string(),
	userId: z.string(),
})

export type ToolContext = z.infer<typeof ToolContextSchema>

/**
 * Result of a tool execution.
 * Generic schema factory for type-safe tool results.
 */
export const createToolResultSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
	z.object({
		success: z.boolean(),
		data: dataSchema.optional(),
		error: z.string().optional(),
	})

/** Base tool result schema for unknown data */
export const ToolResultSchema = z.object({
	success: z.boolean(),
	data: z.unknown().optional(),
	error: z.string().optional(),
})

export type ToolResult<T = unknown> = {
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
export function createTool<TInput extends ZodSchema>(config: {
	id: string
	description: string
	inputSchema: TInput
	execute: (params: z.infer<TInput>, context: ToolContext) => Promise<ToolResult<unknown>>
}): Tool<TInput, unknown> {
	return config
}

/**
 * All available tool types.
 */
export const ToolTypeSchema = z.enum([
	// Cloudflare native
	'http',
	'sql',
	'kv',
	'r2',
	'vectorize',
	'search',
	// Utility
	'datetime',
	'json',
	'text',
	'math',
	'uuid',
	'hash',
	'base64',
	'url',
	'delay',
	// Integrations
	'zapier',
	'webhook',
	'slack',
	'discord',
	'email',
	'teams',
	'twilio_sms',
	'make',
	'n8n',
	// AI
	'sentiment',
	'summarize',
	'translate',
	'image_generate',
	'classify',
	'ner',
	'embedding',
	'question_answer',
	// Data
	'rss',
	'scrape',
	'regex',
	'crypto',
	'json_schema',
	'csv',
	'template',
	// Sandbox
	'code_execute',
	'code_validate',
	'sandbox_file',
	// Validation
	'validate_email',
	'validate_phone',
	'validate_url',
	'validate_credit_card',
	'validate_ip',
	'validate_json',
	// Transform
	'markdown',
	'diff',
	'qrcode',
	'compression',
	'color',
	// Custom
	'custom',
])

export type ToolType = z.infer<typeof ToolTypeSchema>

/**
 * Tool configuration stored in the database.
 */
export const ToolConfigSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().nullable(),
	type: ToolTypeSchema,
	inputSchema: z.record(z.string(), z.unknown()).nullable().optional(),
	config: z.record(z.string(), z.unknown()).nullable().optional(),
	code: z.string().nullable().optional(),
})

export type ToolConfig = z.infer<typeof ToolConfigSchema>

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
