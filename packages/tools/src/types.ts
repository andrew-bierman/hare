import { tool as aiTool } from 'ai'
import type { ToolSet } from 'ai'
import { z } from 'zod'
import type { HareEnv } from './env'

// Re-export HareEnv for convenience
export type { HareEnv }

// Re-export AI SDK ToolSet for consumers
export type { ToolSet }

// Re-export tool type definitions from @hare/types
export { ToolTypeSchema, type ToolType, ToolConfigSchema, type ToolConfig } from '@hare/types'

/**
 * Tool execution context providing access to Cloudflare bindings.
 * Uses a generic env type to support any Cloudflare binding configuration.
 */
export interface ToolContext<TEnv extends HareEnv = HareEnv> {
	/** Cloudflare environment bindings */
	env: TEnv
	/** Workspace ID for multi-tenant isolation (optional for SDK users) */
	workspaceId: string
	/** User ID for audit trail (optional for anonymous sessions) */
	userId?: string | null
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
 * Type-erased tool metadata interface.
 *
 * Use this when you need tool metadata without execution capability.
 * For execution, use `ToolRegistry.execute()` or access the typed `Tool<T>` directly.
 *
 * @example
 * ```ts
 * // Get tool metadata from registry
 * const tool = registry.get('kv_get')
 * console.log(tool?.id, tool?.description)
 *
 * // Execute via registry (validates input and output)
 * const result = await registry.execute({ id: 'kv_get', params: { key: 'foo' }, context })
 * ```
 */
export interface AnyTool {
	/** Unique tool identifier */
	id: string

	/** Human-readable description of what the tool does */
	description: string

	/** Zod schema for validating input parameters (type-erased) */
	inputSchema: z.ZodTypeAny

	/** Zod schema for validating output data (type-erased) */
	outputSchema: z.ZodTypeAny
}

/**
 * Fully-typed tool definition for Cloudflare Workers.
 *
 * Use this interface when defining individual tools for full type safety.
 * For heterogeneous collections, use `ToolRegistry` which handles type erasure safely.
 *
 * @example
 * ```ts
 * const myTool = createTool({
 *   id: 'search',
 *   description: 'Search for items',
 *   inputSchema: z.object({ query: z.string() }),
 *   execute: async (params, ctx) => {
 *     // params is typed as { query: string }
 *     return success({ results: [params.query] })
 *   }
 * })
 *
 * // Direct typed usage
 * await myTool.execute({ query: 'hello' }, ctx)
 * ```
 */
export interface Tool<TInput, TOutput> extends AnyTool {
	/** Zod schema for validating input parameters */
	inputSchema: z.ZodType<TInput>

	/** Zod schema for validating output data */
	outputSchema: z.ZodType<TOutput>

	/** Execute the tool with typed, validated input */
	execute: (params: TInput, context: ToolContext<HareEnv>) => Promise<ToolResult<TOutput>>
}

/**
 * Configuration for creating a tool.
 */
export interface ToolDefinition<TInput, TOutput> {
	/** Unique tool identifier */
	id: string
	/** Human-readable description of what the tool does */
	description: string
	/** Zod schema for validating input parameters */
	inputSchema: z.ZodType<TInput>
	/** Zod schema for validating output data at runtime */
	outputSchema: z.ZodType<TOutput>
	/** Execute the tool with typed, validated input */
	execute: (params: TInput, context: ToolContext<HareEnv>) => Promise<ToolResult<TOutput>>
}

/**
 * Create a type-safe tool definition with input and output validation.
 *
 * The tool's execute function is wrapped to validate output data at runtime,
 * returning a failure if validation fails.
 *
 * Uses Zod's input type for the execute parameter, allowing optional fields
 * with defaults to be omitted when calling the tool.
 *
 * @example
 * ```ts
 * const myTool = createTool({
 *   id: 'my-tool',
 *   description: 'Does something useful',
 *   inputSchema: z.object({ query: z.string(), limit: z.number().default(10) }),
 *   outputSchema: z.object({ result: z.string() }),
 *   execute: async (params, ctx) => {
 *     // params.limit is number (default applied by Zod)
 *     return success({ result: 'done' })
 *   }
 * })
 *
 * // Can call without limit (it has a default)
 * await myTool.execute({ query: 'hello' }, ctx)
 * ```
 */
export function createTool<TInput, TOutput>(
	config: ToolDefinition<TInput, TOutput>,
): Tool<TInput, TOutput> {
	const originalExecute = config.execute
	const { outputSchema } = config

	return {
		...config,
		execute: async (params, context) => {
			const result = await originalExecute(params, context)
			// Validate output if execution succeeded and has data (skip for undefined/null)
			if (result.success && result.data !== undefined && result.data !== null) {
				const parseResult = outputSchema.safeParse(result.data)
				if (!parseResult.success) {
					return failure(`Output validation failed: ${parseResult.error.message}`)
				}
				return { ...result, data: parseResult.data }
			}
			return result
		},
	}
}

/**
 * Internal tool storage type for ToolRegistry.
 *
 * Uses `any` internally to store heterogeneous tools, but this type is never
 * exposed publicly. All public APIs use `AnyTool` (metadata only) or `Tool<T>`
 * (fully typed). Runtime type safety is ensured via Zod validation in execute().
 */
// biome-ignore lint/suspicious/noExplicitAny: Required for heterogeneous tool storage
type InternalTool = Tool<any, any>

/**
 * Registry for managing and executing tools with type-safe validation.
 *
 * Centralizes type erasure and input validation. Tools are stored internally
 * and executed with Zod validation, ensuring type safety at runtime.
 *
 * @example
 * ```ts
 * const registry = new ToolRegistry()
 *   .register(kvGetTool)
 *   .register(httpRequestTool)
 *   .register(sqlQueryTool)
 *
 * // Get tool metadata
 * const tool = registry.get('kv_get')
 *
 * // Execute with validation
 * const result = await registry.execute({ id: 'kv_get', params: { key: 'foo' }, context })
 *
 * // List all tools
 * const allTools = registry.list()
 * ```
 */
export class ToolRegistry {
	private tools = new Map<string, InternalTool>()

	/**
	 * Register a tool with the registry.
	 * @returns this for chaining
	 */
	register<TInput, TOutput>(tool: Tool<TInput, TOutput>): this {
		this.tools.set(tool.id, tool)
		return this
	}

	/**
	 * Register multiple tools at once.
	 * @returns this for chaining
	 */
	registerAll(tools: AnyTool[]): this {
		for (const tool of tools) {
			this.tools.set(tool.id, tool as InternalTool)
		}
		return this
	}

	/**
	 * Get tool metadata by ID.
	 * Returns undefined if tool not found.
	 */
	get(id: string): AnyTool | undefined {
		return this.tools.get(id)
	}

	/**
	 * Check if a tool is registered.
	 */
	has(id: string): boolean {
		return this.tools.has(id)
	}

	/**
	 * List all registered tools (metadata only).
	 */
	list(): AnyTool[] {
		return [...this.tools.values()]
	}

	/**
	 * Get the number of registered tools.
	 */
	get size(): number {
		return this.tools.size
	}

	/**
	 * Execute a tool by ID with input validation.
	 *
	 * Validates params against the tool's Zod schema before execution.
	 * Returns a failure result if the tool is not found or validation fails.
	 */
	async execute(options: {
		id: string
		params: unknown
		context: ToolContext<HareEnv>
	}): Promise<ToolResult<unknown>> {
		const { id, params, context } = options
		const tool = this.tools.get(id)
		if (!tool) {
			return { success: false, error: `Tool '${id}' not found` }
		}

		// Validate input with Zod schema
		const parseResult = tool.inputSchema.safeParse(params)
		if (!parseResult.success) {
			return {
				success: false,
				error: `Invalid input for tool '${id}': ${parseResult.error.message}`,
			}
		}

		// Execute with validated input
		return tool.execute(parseResult.data, context)
	}
}

/**
 * Create a new tool registry, optionally pre-populated with tools.
 *
 * @example
 * ```ts
 * const registry = createRegistry([kvGetTool, httpRequestTool])
 * ```
 */
export function createRegistry(tools: AnyTool[] = []): ToolRegistry {
	return new ToolRegistry().registerAll(tools)
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

/**
 * Convert Hare tools to an AI SDK ToolSet for use with streamText/generateText.
 *
 * Binds each tool's execute to the provided ToolContext so Cloudflare
 * bindings (env.AI, env.KV, etc.) are available during tool execution.
 *
 * @example
 * ```ts
 * const context = { env, workspaceId: 'ws-1' }
 * const tools = getSystemTools(context)
 * const toolSet = toToolSet(tools, context)
 * const result = await streamText({ model, messages, tools: toolSet })
 * ```
 */
export function toToolSet(tools: AnyTool[], context: ToolContext<HareEnv>): ToolSet {
	return Object.fromEntries(
		tools
			.filter(
				(t): t is Tool<unknown, unknown> =>
					'execute' in t && typeof t.execute === 'function',
			)
			.map((t) => [
				t.id,
				aiTool({
					description: t.description,
					inputSchema: t.inputSchema,
					execute: async (params: unknown) => {
						const result = await t.execute(params as never, context)
						if (result.success) {
							return result.data
						}
						return { error: result.error ?? 'Tool execution failed' }
					},
				}),
			]),
	)
}
