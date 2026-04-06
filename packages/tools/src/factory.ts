/**
 * Tool Factory - Load and create tools from database configuration
 *
 * This module provides utilities for creating executable tools from
 * database-stored configurations. Used by the hosted Hare platform.
 */

import { z } from 'zod'
import { Timeouts } from './constants'
import { HttpResponseOutputSchema, httpRequestTool } from './http'
import { type AnyTool, createTool, failure, type ToolConfig, type ToolContext } from './types'

/**
 * Generic output schema for custom tools that return unknown data.
 */
const CustomToolOutputSchema = z.unknown()

/**
 * Zod schema for validating HTTP tool database configuration.
 */
const HttpToolDbConfigSchema = z
	.object({
		url: z.string().optional(),
		method: z.string().optional(),
		headers: z.record(z.string(), z.string()).optional(),
	})
	.nullable()

/**
 * Build a Zod schema from a JSON Schema-like configuration.
 * Returns a passthrough object schema for unknown structures.
 */
function buildInputSchema(inputSchema: Record<string, unknown> | null | undefined): z.ZodType {
	if (!inputSchema || Object.keys(inputSchema).length === 0) {
		// No schema defined - accept any object
		return z.record(z.string(), z.unknown())
	}

	// For now, use a passthrough object schema
	// In the future, this could be enhanced to parse JSON Schema properly
	return z.record(z.string(), z.unknown())
}

/**
 * Database abstraction for tool loading.
 * Implement this interface to integrate with your database.
 */
export interface ToolDatabase {
	/** Get tool IDs attached to an agent */
	getAgentToolIds(agentId: string): Promise<string[]>
	/** Get tool configurations by IDs */
	getToolConfigs(toolIds: string[]): Promise<ToolConfig[]>
}

/**
 * Input for loading agent tools.
 */
export interface LoadAgentToolsInput {
	agentId: string
	db: ToolDatabase
	context: ToolContext
}

/**
 * Load tools attached to an agent from the database.
 */
export async function loadAgentTools(input: LoadAgentToolsInput): Promise<AnyTool[]> {
	const { agentId, db, context } = input

	// Get tool IDs attached to this agent
	const toolIds = await db.getAgentToolIds(agentId)

	if (toolIds.length === 0) {
		return []
	}

	// Load tool configurations
	const toolConfigs = await db.getToolConfigs(toolIds)

	// Convert to executable tools
	return toolConfigs
		.map((config) => createToolFromConfig({ config, context }))
		.filter((t): t is AnyTool => t !== null)
}

/**
 * Create an executable tool from a database configuration.
 */
export function createToolFromConfig({
	config,
	context,
}: {
	config: ToolConfig
	context: ToolContext
}): AnyTool | null {
	switch (config.type) {
		case 'http':
			return createHTTPToolFromConfig({ config, context })
		case 'custom':
			return createCustomToolFromConfig({ config, context })
		default:
			// biome-ignore lint/suspicious/noConsole: server logging
			console.warn(`Unknown tool type "${config.type}" for tool ${config.id}`)
			return null
	}
}

/**
 * Create an HTTP tool from configuration.
 * Returns null if the configuration is invalid.
 */
function createHTTPToolFromConfig({
	config,
	context: _context,
}: {
	config: ToolConfig
	context: ToolContext
}): AnyTool | null {
	const parseResult = HttpToolDbConfigSchema.safeParse(config.config)
	if (!parseResult.success) {
		// biome-ignore lint/suspicious/noConsole: server logging
		console.warn(`Invalid HTTP tool config for ${config.id}: ${parseResult.error.message}`)
		return null
	}
	const toolConfig = parseResult.data

	return createTool({
		id: config.id,
		description: config.description || '',
		inputSchema: httpRequestTool.inputSchema,
		outputSchema: HttpResponseOutputSchema,
		execute: async (params, ctx) => {
			// Merge config defaults with runtime params
			const mergedParams = {
				url: params.url || toolConfig?.url || '',
				method: params.method || toolConfig?.method || 'GET',
				headers: { ...toolConfig?.headers, ...params.headers },
				body: params.body,
				timeout: params.timeout || Timeouts.HTTP_DEFAULT,
			}
			return httpRequestTool.execute(mergedParams, ctx)
		},
	})
}

/**
 * Create a custom tool from configuration.
 *
 * NOTE: Custom tool execution requires a secure sandboxed environment.
 * Currently, custom tools will return an error indicating they need to be
 * executed in a Cloudflare Worker or similar isolated environment.
 */
function createCustomToolFromConfig({
	config,
	context: _context,
}: {
	config: ToolConfig
	context: ToolContext
}): AnyTool {
	// Use the tool's own input schema, not a misleading HTTP fallback
	const inputSchema = buildInputSchema(config.inputSchema)

	return createTool({
		id: config.id,
		description: config.description || '',
		inputSchema,
		outputSchema: CustomToolOutputSchema,
		execute: async (_params, _ctx) => {
			if (!config.code) {
				return failure('No code provided for custom tool')
			}

			// Custom tool execution requires sandboxed environment
			// Direct eval/Function execution is unsafe and disabled
			return failure(
				'Custom tool execution is not available in this environment. ' +
					'Custom tools must be executed in a sandboxed Cloudflare Worker. ' +
					'Please use built-in tool types (http, kv, r2, sql) instead.',
			)
		},
	})
}

/**
 * NOTE: createDrizzleToolDatabase has been removed.
 *
 * SDK users should implement the ToolDatabase interface directly with their
 * specific Drizzle schema. This provides proper type safety and avoids
 * unsafe type assertions.
 *
 * @example
 * ```ts
 * import { eq, inArray } from 'drizzle-orm'
 * import type { ToolDatabase } from '@hare/tools'
 *
 * const toolDb: ToolDatabase = {
 *   getAgentToolIds: async (agentId) => {
 *     const results = await db
 *       .select({ toolId: agentTools.toolId })
 *       .from(agentTools)
 *       .where(eq(agentTools.agentId, agentId))
 *     return results.map(r => r.toolId)
 *   },
 *   getToolConfigs: async (toolIds) => {
 *     if (toolIds.length === 0) return []
 *     return db.select().from(tools).where(inArray(tools.id, toolIds))
 *   }
 * }
 * ```
 */
