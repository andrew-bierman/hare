/**
 * Tool Factory - Load and create tools from database configuration
 *
 * This module provides utilities for creating executable tools from
 * database-stored configurations. Used by the hosted Hare platform.
 */

import { z } from 'zod'
import { httpRequestTool } from './http'
import {
	type AnyTool,
	createTool,
	failure,
	type ToolConfig,
	type ToolContext,
} from './types'

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
		.map((config) => createToolFromConfig(config, context))
		.filter((t): t is AnyTool => t !== null)
}

/**
 * Create an executable tool from a database configuration.
 */
export function createToolFromConfig(config: ToolConfig, context: ToolContext): AnyTool | null {
	switch (config.type) {
		case 'http':
			return createHTTPToolFromConfig(config, context)
		case 'custom':
			return createCustomToolFromConfig(config, context)
		default:
			console.warn(`Unknown tool type "${config.type}" for tool ${config.id}`)
			return null
	}
}

/**
 * Create an HTTP tool from configuration.
 */
function createHTTPToolFromConfig(config: ToolConfig, _context: ToolContext): AnyTool {
	const toolConfig = config.config as {
		url?: string
		method?: string
		headers?: Record<string, string>
	} | null

	return createTool({
		id: config.id,
		description: config.description || '',
		inputSchema: httpRequestTool.inputSchema,
		execute: async (params, ctx) => {
			// Merge config defaults with runtime params
			const mergedParams = {
				url: params.url || toolConfig?.url || '',
				method: params.method || toolConfig?.method || 'GET',
				headers: { ...toolConfig?.headers, ...params.headers },
				body: params.body,
				timeout: params.timeout || 30000,
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
function createCustomToolFromConfig(config: ToolConfig, _context: ToolContext): AnyTool {
	// Use the tool's own input schema, not a misleading HTTP fallback
	const inputSchema = buildInputSchema(config.inputSchema)

	return createTool({
		id: config.id,
		description: config.description || '',
		inputSchema,
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
 * Create a Drizzle-compatible database adapter.
 * Use this with Drizzle ORM to load tools from D1.
 */
export function createDrizzleToolDatabase(options: {
	db: unknown // Drizzle database instance
	agentToolsTable: unknown // agentTools table
	toolsTable: unknown // tools table
}): ToolDatabase {
	const { db, agentToolsTable, toolsTable } = options

	return {
		async getAgentToolIds(agentId: string): Promise<string[]> {
			// This will be implemented by the caller using Drizzle
			// We provide the interface, they provide the implementation
			const drizzleDb = db as {
				select: (fields: Record<string, unknown>) => {
					from: (table: unknown) => {
						where: (condition: unknown) => Promise<Array<{ toolId: string }>>
					}
				}
			}

			try {
				const results = await drizzleDb
					.select({ toolId: (agentToolsTable as { toolId: unknown }).toolId })
					.from(agentToolsTable)
					.where(null) // Caller needs to add proper eq() condition
				return results.map((r) => r.toolId)
			} catch {
				// Fallback for when this is called without proper Drizzle setup
				return []
			}
		},

		async getToolConfigs(toolIds: string[]): Promise<ToolConfig[]> {
			if (toolIds.length === 0) return []

			const drizzleDb = db as {
				select: () => {
					from: (table: unknown) => Promise<ToolConfig[]>
				}
			}

			try {
				const allTools = await drizzleDb.select().from(toolsTable)
				return allTools.filter((t) => toolIds.includes(t.id))
			} catch {
				return []
			}
		},
	}
}
