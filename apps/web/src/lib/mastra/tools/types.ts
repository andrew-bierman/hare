import type { Tool } from '@mastra/core'

/**
 * Tool types supported by the platform.
 */
export type ToolType = 'http' | 'sql' | 'kv' | 'r2' | 'vectorize' | 'custom'

/**
 * Context passed to tool execution.
 */
export interface ToolContext {
	env: CloudflareEnv
	workspaceId: string
	userId: string
}

/**
 * Base configuration for all tools.
 */
export interface BaseToolConfig {
	id: string
	name: string
	description: string
	type: ToolType
}

/**
 * HTTP tool configuration.
 */
export interface HttpToolConfig extends BaseToolConfig {
	type: 'http'
	config: {
		baseUrl?: string
		headers?: Record<string, string>
		timeout?: number
		allowedMethods?: ('GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH')[]
	}
}

/**
 * SQL (D1) tool configuration.
 */
export interface SqlToolConfig extends BaseToolConfig {
	type: 'sql'
	config: {
		allowedTables?: string[]
		readOnly?: boolean
		maxRows?: number
	}
}

/**
 * KV tool configuration.
 */
export interface KvToolConfig extends BaseToolConfig {
	type: 'kv'
	config: {
		prefix?: string
		allowedOperations?: ('get' | 'put' | 'delete' | 'list')[]
	}
}

/**
 * R2 tool configuration.
 */
export interface R2ToolConfig extends BaseToolConfig {
	type: 'r2'
	config: {
		prefix?: string
		allowedOperations?: ('get' | 'put' | 'delete' | 'list')[]
		maxSizeBytes?: number
	}
}

/**
 * Vectorize tool configuration.
 */
export interface VectorizeToolConfig extends BaseToolConfig {
	type: 'vectorize'
	config: {
		namespace?: string
		topK?: number
	}
}

/**
 * Custom JavaScript tool configuration.
 */
export interface CustomToolConfig extends BaseToolConfig {
	type: 'custom'
	config: {
		parameters: Record<string, unknown>
		code?: string
	}
}

/**
 * Union of all tool configurations.
 */
export type AnyToolConfig =
	| HttpToolConfig
	| SqlToolConfig
	| KvToolConfig
	| R2ToolConfig
	| VectorizeToolConfig
	| CustomToolConfig

/**
 * Tool factory function signature.
 */
export type ToolFactory<T extends BaseToolConfig = BaseToolConfig> = (config: T, ctx: ToolContext) => Tool
