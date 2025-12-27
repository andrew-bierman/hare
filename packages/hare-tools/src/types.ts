import { z } from 'zod'
import type { HareEnv } from './env'

// Re-export HareEnv for convenience
export type { HareEnv }

/**
 * Tool execution context providing access to Cloudflare bindings.
 * Uses a generic env type to support any Cloudflare binding configuration.
 */
export interface ToolContext<TEnv extends HareEnv = HareEnv> {
	/** Cloudflare environment bindings */
	env: TEnv
	/** Workspace ID for multi-tenant isolation (optional for SDK users) */
	workspaceId: string
	/** User ID for audit trail (optional for SDK users) */
	userId: string
}

/**
 * Result of a tool execution.
 */
export type ToolResult<T = unknown> = {
	success: boolean
	data?: T
	error?: string
}

/**
 * Native tool definition for Cloudflare Workers.
 *
 * A simple, Edge-native interface for defining AI agent tools.
 * Uses z.ZodType for Zod v4 compatibility.
 */
export interface Tool<TInput = unknown, TOutput = unknown> {
	/** Unique tool identifier */
	id: string

	/** Human-readable description of what the tool does */
	description: string

	/** Zod schema for validating input parameters */
	inputSchema: z.ZodType<TInput>

	/** Execute the tool with validated input */
	execute: (params: TInput, context: ToolContext<HareEnv>) => Promise<ToolResult<TOutput>>
}

/**
 * Type alias for heterogeneous tool collections.
 *
 * Why `any`? TypeScript's function parameter types are contravariant.
 * A `Tool<{query: string}, X>` is NOT assignable to `Tool<unknown, X>`
 * because the execute function signature would be incompatible:
 * - Tool<unknown>.execute can be called with any value
 * - Tool<{query: string}>.execute expects a specific shape
 *
 * Since tools with different input types need to coexist in arrays/maps,
 * we use `any` here. This is type-safe at the call site because:
 * 1. The Zod schema validates input at runtime
 * 2. Individual tool definitions remain fully typed
 *
 * @see https://www.typescriptlang.org/docs/handbook/2/functions.html#function-type-compatibility
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyTool = Tool<any, any>

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
 *     return success({ result: 'done' })
 *   }
 * })
 * ```
 */
export function createTool<TInput, TOutput = unknown>(config: {
	id: string
	description: string
	inputSchema: z.ZodType<TInput>
	execute: (params: TInput, context: ToolContext<HareEnv>) => Promise<ToolResult<TOutput>>
}): Tool<TInput, TOutput> {
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
 * Tool configuration (for database-stored tools).
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
