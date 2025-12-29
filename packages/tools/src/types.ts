import { z } from 'zod'
import type { HareEnv } from './env'

// Re-export HareEnv for convenience
export type { HareEnv }

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
 * // Execute via registry (validates input)
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
export interface Tool<TInput = unknown, TOutput = unknown> extends AnyTool {
	/** Zod schema for validating input parameters */
	inputSchema: z.ZodType<TInput>

	/** Execute the tool with typed, validated input */
	execute: (params: TInput, context: ToolContext<HareEnv>) => Promise<ToolResult<TOutput>>
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
 * Internal tool storage type. Uses `any` internally but is never exposed publicly.
 * All public APIs use `AnyTool` (metadata only) or `Tool<T>` (fully typed).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
