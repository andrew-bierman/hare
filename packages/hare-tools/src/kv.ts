import { z } from 'zod'
import { createTool, failure, success, type ToolContext } from './types'

/**
 * Get workspace-scoped key.
 * All KV keys are prefixed with workspaceId to ensure multi-tenant isolation.
 */
function scopedKey(workspaceId: string, key: string): string {
	// Validate key doesn't try to escape workspace scope
	if (key.includes('..') || key.startsWith('/')) {
		throw new Error('Invalid key: path traversal not allowed')
	}
	return `ws/${workspaceId}/${key}`
}

/**
 * Strip workspace prefix from key for display.
 */
function unscopedKey(workspaceId: string, fullKey: string): string {
	const prefix = `ws/${workspaceId}/`
	return fullKey.startsWith(prefix) ? fullKey.slice(prefix.length) : fullKey
}

/**
 * KV Get Tool - Retrieve a value from Cloudflare KV.
 */
export const kvGetTool = createTool({
	id: 'kv_get',
	description:
		'Retrieve a value from Cloudflare KV storage by key. Returns the stored value or null if not found.',
	inputSchema: z.object({
		key: z.string().describe('The key to retrieve from KV storage'),
		type: z
			.enum(['text', 'json', 'arrayBuffer'])
			.optional()
			.default('text')
			.describe('The type to return the value as'),
	}),
	execute: async (params, context) => {
		const kv = context.env.KV
		if (!kv) {
			return failure('KV namespace not available')
		}

		try {
			const fullKey = scopedKey(context.workspaceId, params.key)
			let value: unknown
			switch (params.type) {
				case 'json':
					value = await kv.get(fullKey, 'json')
					break
				case 'arrayBuffer':
					value = await kv.get(fullKey, 'arrayBuffer')
					break
				default:
					value = await kv.get(fullKey, 'text')
			}

			return success({ key: params.key, value, found: value !== null })
		} catch (error) {
			return failure(
				`Failed to get key "${params.key}": ${error instanceof Error ? error.message : 'Unknown error'}`,
			)
		}
	},
})

/**
 * KV Put Tool - Store a value in Cloudflare KV.
 */
export const kvPutTool = createTool({
	id: 'kv_put',
	description: 'Store a value in Cloudflare KV storage. Supports optional expiration.',
	inputSchema: z.object({
		key: z.string().describe('The key to store the value under'),
		value: z.string().describe('The value to store'),
		expirationTtl: z.number().optional().describe('Time to live in seconds'),
		metadata: z
			.record(z.string(), z.unknown())
			.optional()
			.describe('Optional metadata to store with the key'),
	}),
	execute: async (params, context) => {
		const kv = context.env.KV
		if (!kv) {
			return failure('KV namespace not available')
		}

		try {
			const fullKey = scopedKey(context.workspaceId, params.key)
			const options: KVNamespacePutOptions = {}
			if (params.expirationTtl) {
				options.expirationTtl = params.expirationTtl
			}
			if (params.metadata) {
				options.metadata = params.metadata
			}

			await kv.put(fullKey, params.value, options)
			return success({ key: params.key, stored: true })
		} catch (error) {
			return failure(
				`Failed to put key "${params.key}": ${error instanceof Error ? error.message : 'Unknown error'}`,
			)
		}
	},
})

/**
 * KV Delete Tool - Delete a value from Cloudflare KV.
 */
export const kvDeleteTool = createTool({
	id: 'kv_delete',
	description: 'Delete a key from Cloudflare KV storage.',
	inputSchema: z.object({
		key: z.string().describe('The key to delete from KV storage'),
	}),
	execute: async (params, context) => {
		const kv = context.env.KV
		if (!kv) {
			return failure('KV namespace not available')
		}

		try {
			const fullKey = scopedKey(context.workspaceId, params.key)
			await kv.delete(fullKey)
			return success({ key: params.key, deleted: true })
		} catch (error) {
			return failure(
				`Failed to delete key "${params.key}": ${error instanceof Error ? error.message : 'Unknown error'}`,
			)
		}
	},
})

/**
 * KV List Tool - List keys in Cloudflare KV.
 */
export const kvListTool = createTool({
	id: 'kv_list',
	description: 'List keys in Cloudflare KV storage with optional prefix filtering.',
	inputSchema: z.object({
		prefix: z.string().optional().describe('Filter keys by prefix'),
		limit: z.number().optional().default(100).describe('Maximum number of keys to return'),
		cursor: z.string().optional().describe('Cursor for pagination'),
	}),
	execute: async (params, context) => {
		const kv = context.env.KV
		if (!kv) {
			return failure('KV namespace not available')
		}

		try {
			// Always scope to workspace, optionally with additional user prefix
			const workspacePrefix = `ws/${context.workspaceId}/`
			const fullPrefix = params.prefix
				? scopedKey(context.workspaceId, params.prefix)
				: workspacePrefix

			const options: KVNamespaceListOptions = {
				limit: params.limit,
				prefix: fullPrefix,
			}
			if (params.cursor) {
				options.cursor = params.cursor
			}

			const result = await kv.list(options)
			return success({
				keys: result.keys.map((k) => ({
					name: unscopedKey(context.workspaceId, k.name),
					expiration: k.expiration,
					metadata: k.metadata,
				})),
				complete: result.list_complete,
				cursor: result.list_complete ? undefined : (result as { cursor?: string }).cursor,
			})
		} catch (error) {
			return failure(
				`Failed to list keys: ${error instanceof Error ? error.message : 'Unknown error'}`,
			)
		}
	},
})

/**
 * Get all KV tools.
 */
export function getKVTools(_context: ToolContext) {
	return [kvGetTool, kvPutTool, kvDeleteTool, kvListTool]
}
