import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import type { KvToolConfig, ToolContext } from './types'

const kvInputSchema = z.object({
	operation: z.enum(['get', 'put', 'delete', 'list']).describe('The operation to perform'),
	key: z.string().optional().describe('The key to operate on'),
	value: z.string().optional().describe('The value to store (for put operation)'),
	expirationTtl: z.number().optional().describe('TTL in seconds for the key (for put operation)'),
	listPrefix: z.string().optional().describe('Prefix to filter keys when listing'),
	limit: z.number().optional().default(100).describe('Maximum number of keys to return when listing'),
})

/**
 * Create a KV namespace tool for agents.
 * Provides get, put, delete, and list operations on Cloudflare KV.
 */
export function createKvTool(config: KvToolConfig, ctx: ToolContext) {
	const { prefix = '', allowedOperations = ['get', 'put', 'delete', 'list'] } = config.config

	// Prefix keys with workspace ID for isolation
	const keyPrefix = `${ctx.workspaceId}:${prefix}`

	return createTool({
		id: config.id,
		description: config.description || 'Store and retrieve data from key-value storage',
		inputSchema: kvInputSchema,
		execute: async ({ context }) => {
			const { operation, key, value, expirationTtl, listPrefix, limit = 100 } = context
			const kv = ctx.env.KV

			if (!kv) {
				return { success: false, error: 'KV namespace not available' }
			}

			if (!allowedOperations.includes(operation)) {
				return { success: false, error: `Operation '${operation}' not allowed` }
			}

			try {
				switch (operation) {
					case 'get': {
						if (!key) {
							return { success: false, error: 'Key is required for get operation' }
						}
						const fullKey = `${keyPrefix}${key}`
						const result = await kv.get(fullKey)
						return {
							success: true,
							key,
							value: result,
							found: result !== null,
						}
					}

					case 'put': {
						if (!key) {
							return { success: false, error: 'Key is required for put operation' }
						}
						if (value === undefined) {
							return { success: false, error: 'Value is required for put operation' }
						}
						const fullKey = `${keyPrefix}${key}`
						const options: KVNamespacePutOptions = {}
						if (expirationTtl) {
							options.expirationTtl = expirationTtl
						}
						await kv.put(fullKey, value, options)
						return {
							success: true,
							key,
							stored: true,
						}
					}

					case 'delete': {
						if (!key) {
							return { success: false, error: 'Key is required for delete operation' }
						}
						const fullKey = `${keyPrefix}${key}`
						await kv.delete(fullKey)
						return {
							success: true,
							key,
							deleted: true,
						}
					}

					case 'list': {
						const listOptions: KVNamespaceListOptions = {
							prefix: `${keyPrefix}${listPrefix || ''}`,
							limit: Math.min(limit, 1000),
						}
						const result = await kv.list(listOptions)
						// Strip the workspace prefix from returned keys
						const keys = result.keys.map((k) => ({
							name: k.name.replace(keyPrefix, ''),
							expiration: k.expiration,
						}))
						return {
							success: true,
							keys,
							complete: result.list_complete,
						}
					}

					default:
						return { success: false, error: `Unknown operation: ${operation}` }
				}
			} catch (error) {
				return {
					success: false,
					error: error instanceof Error ? error.message : 'Unknown error occurred',
				}
			}
		},
	})
}
