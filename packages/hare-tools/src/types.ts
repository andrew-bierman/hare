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
 * Type-erased tool interface for heterogeneous collections.
 *
 * Use this when storing tools with different input/output types in arrays or maps.
 * The `call` method validates input via Zod before execution, making it safe
 * to invoke with `unknown` params.
 *
 * @example
 * ```ts
 * const tools: AnyTool[] = [kvGetTool, httpRequestTool, sqlQueryTool]
 * const result = await tools[0].call({ key: 'foo' }, context)
 * ```
 */
export interface AnyTool {
	/** Unique tool identifier */
	id: string

	/** Human-readable description of what the tool does */
	description: string

	/** Zod schema for validating input parameters (type-erased) */
	inputSchema: z.ZodTypeAny

	/**
	 * Execute the tool with untyped input.
	 * Validates params against inputSchema before calling the typed execute function.
	 * Safe to call from heterogeneous tool collections.
	 */
	call: (params: unknown, context: ToolContext<HareEnv>) => Promise<ToolResult<unknown>>
}

/**
 * Fully-typed tool definition for Cloudflare Workers.
 *
 * Use this interface when defining individual tools for full type safety.
 * Tools created with `createTool` satisfy both `Tool<T>` and `AnyTool`.
 *
 * @example
 * ```ts
 * const myTool: Tool<{ query: string }, { results: string[] }> = createTool({
 *   id: 'search',
 *   description: 'Search for items',
 *   inputSchema: z.object({ query: z.string() }),
 *   execute: async (params, ctx) => {
 *     // params is typed as { query: string }
 *     return success({ results: [params.query] })
 *   }
 * })
 * ```
 */
export interface Tool<TInput = unknown, TOutput = unknown> extends AnyTool {
	/** Zod schema for validating input parameters */
	inputSchema: z.ZodType<TInput>

	/** Execute the tool with typed, validated input */
	execute: (params: TInput, context: ToolContext<HareEnv>) => Promise<ToolResult<TOutput>>
}

/**
 * Create a type-safe tool definition.
 *
 * Returns a tool that satisfies both `Tool<TInput, TOutput>` for typed usage
 * and `AnyTool` for heterogeneous collections. The `call` method validates
 * input via Zod before invoking `execute`.
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
 *
 * // Typed usage
 * await myTool.execute({ query: 'hello' }, ctx)
 *
 * // Untyped usage (validates first)
 * await myTool.call({ query: 'hello' }, ctx)
 * ```
 */
export function createTool<TInput, TOutput = unknown>(config: {
	id: string
	description: string
	inputSchema: z.ZodType<TInput>
	execute: (params: TInput, context: ToolContext<HareEnv>) => Promise<ToolResult<TOutput>>
}): Tool<TInput, TOutput> {
	return {
		...config,
		call: async (params: unknown, context: ToolContext<HareEnv>): Promise<ToolResult<unknown>> => {
			// Validate input with Zod schema
			const parseResult = config.inputSchema.safeParse(params)
			if (!parseResult.success) {
				return {
					success: false,
					error: `Invalid input: ${parseResult.error.message}`,
				}
			}
			// Call the typed execute with validated input
			return config.execute(parseResult.data, context)
		},
	}
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
