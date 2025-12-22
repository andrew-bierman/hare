import type { R2ListOptions, R2PutOptions } from '@cloudflare/workers-types'
import { z } from 'zod'
import { createTool, failure, success, type ToolContext } from './types'

/**
 * R2 Get Tool - Retrieve an object from Cloudflare R2.
 */
export const r2GetTool = createTool({
	id: 'r2_get',
	description:
		'Retrieve an object from Cloudflare R2 storage by key. Returns the object content and metadata.',
	inputSchema: z.object({
		key: z.string().describe('The key (path) of the object to retrieve'),
	}),
	execute: async (params, context) => {
		const r2 = context.env.R2
		if (!r2) {
			return failure('R2 bucket not available')
		}

		try {
			const object = await r2.get(params.key)
			if (!object) {
				return success({ key: params.key, found: false, content: null as string | null })
			}

			const content = await object.text()
			return success({
				key: params.key,
				found: true,
				content: content as string | null,
				contentType: object.httpMetadata?.contentType,
				size: object.size,
				etag: object.etag,
				uploaded: object.uploaded.toISOString(),
				metadata: object.customMetadata,
			})
		} catch (error) {
			return failure(
				`Failed to get object "${params.key}": ${error instanceof Error ? error.message : 'Unknown error'}`,
			)
		}
	},
})

/**
 * R2 Put Tool - Store an object in Cloudflare R2.
 */
export const r2PutTool = createTool({
	id: 'r2_put',
	description: 'Store an object in Cloudflare R2 storage.',
	inputSchema: z.object({
		key: z.string().describe('The key (path) to store the object under'),
		content: z.string().describe('The content to store'),
		contentType: z.string().optional().describe('The MIME type of the content'),
		metadata: z
			.record(z.string(), z.string())
			.optional()
			.describe('Custom metadata to store with the object'),
	}),
	execute: async (params, context) => {
		const r2 = context.env.R2
		if (!r2) {
			return failure('R2 bucket not available')
		}

		try {
			const options: R2PutOptions = {}
			if (params.contentType || params.metadata) {
				options.httpMetadata = params.contentType ? { contentType: params.contentType } : undefined
				options.customMetadata = params.metadata
			}

			const result = await r2.put(params.key, params.content, options)
			return success({
				key: params.key,
				stored: true,
				etag: result.etag,
				size: result.size,
			})
		} catch (error) {
			return failure(
				`Failed to put object "${params.key}": ${error instanceof Error ? error.message : 'Unknown error'}`,
			)
		}
	},
})

/**
 * R2 Delete Tool - Delete an object from Cloudflare R2.
 */
export const r2DeleteTool = createTool({
	id: 'r2_delete',
	description: 'Delete an object from Cloudflare R2 storage.',
	inputSchema: z.object({
		key: z.string().describe('The key (path) of the object to delete'),
	}),
	execute: async (params, context) => {
		const r2 = context.env.R2
		if (!r2) {
			return failure('R2 bucket not available')
		}

		try {
			await r2.delete(params.key)
			return success({ key: params.key, deleted: true })
		} catch (error) {
			return failure(
				`Failed to delete object "${params.key}": ${error instanceof Error ? error.message : 'Unknown error'}`,
			)
		}
	},
})

/**
 * R2 List Tool - List objects in Cloudflare R2.
 */
export const r2ListTool = createTool({
	id: 'r2_list',
	description: 'List objects in Cloudflare R2 storage with optional prefix filtering.',
	inputSchema: z.object({
		prefix: z.string().optional().describe('Filter objects by prefix (folder path)'),
		limit: z.number().optional().default(100).describe('Maximum number of objects to return'),
		cursor: z.string().optional().describe('Cursor for pagination'),
		delimiter: z
			.string()
			.optional()
			.describe('Delimiter for grouping (e.g., "/" for folder-like listing)'),
	}),
	execute: async (params, context) => {
		const r2 = context.env.R2
		if (!r2) {
			return failure('R2 bucket not available')
		}

		try {
			const options: R2ListOptions = {
				limit: params.limit,
			}
			if (params.prefix) options.prefix = params.prefix
			if (params.cursor) options.cursor = params.cursor
			if (params.delimiter) options.delimiter = params.delimiter

			const result = await r2.list(options)
			return success({
				objects: result.objects.map((obj) => ({
					key: obj.key,
					size: obj.size,
					etag: obj.etag,
					uploaded: obj.uploaded.toISOString(),
				})),
				truncated: result.truncated,
				cursor: result.truncated ? (result as unknown as { cursor?: string }).cursor : undefined,
				delimitedPrefixes: result.delimitedPrefixes,
			})
		} catch (error) {
			return failure(
				`Failed to list objects: ${error instanceof Error ? error.message : 'Unknown error'}`,
			)
		}
	},
})

/**
 * R2 Head Tool - Get object metadata without downloading content.
 */
export const r2HeadTool = createTool({
	id: 'r2_head',
	description: 'Get metadata for an R2 object without downloading the content.',
	inputSchema: z.object({
		key: z.string().describe('The key (path) of the object'),
	}),
	execute: async (params, context) => {
		const r2 = context.env.R2
		if (!r2) {
			return failure('R2 bucket not available')
		}

		try {
			const head = await r2.head(params.key)
			if (!head) {
				return success({ key: params.key, found: false })
			}

			return success({
				key: params.key,
				found: true,
				size: head.size,
				etag: head.etag,
				uploaded: head.uploaded.toISOString(),
				contentType: head.httpMetadata?.contentType,
				metadata: head.customMetadata,
			})
		} catch (error) {
			return failure(
				`Failed to head object "${params.key}": ${error instanceof Error ? error.message : 'Unknown error'}`,
			)
		}
	},
})

/**
 * Get all R2 tools.
 */
export function getR2Tools(_context: ToolContext) {
	return [r2GetTool, r2PutTool, r2DeleteTool, r2ListTool, r2HeadTool]
}
