import { z } from 'zod'
import { createTool, failure, success, type ToolContext } from './types'

// ============================================================================
// Output Schemas
// ============================================================================

const R2GetOutputSchema = z.object({
	key: z.string(),
	found: z.boolean(),
	content: z.string().nullable(),
	contentType: z.string().optional(),
	size: z.number().optional(),
	etag: z.string().optional(),
	uploaded: z.string().optional(),
	metadata: z.record(z.string(), z.string()).optional(),
})

const R2PutOutputSchema = z.object({
	key: z.string(),
	stored: z.literal(true),
	etag: z.string(),
	size: z.number(),
})

const R2DeleteOutputSchema = z.object({
	key: z.string(),
	deleted: z.literal(true),
})

const R2ListOutputSchema = z.object({
	objects: z.array(
		z.object({
			key: z.string(),
			size: z.number(),
			etag: z.string(),
			uploaded: z.string(),
		}),
	),
	truncated: z.boolean(),
	cursor: z.string().optional(),
	delimitedPrefixes: z.array(z.string()).optional(),
})

const R2HeadOutputSchema = z.object({
	key: z.string(),
	found: z.boolean(),
	size: z.number().optional(),
	etag: z.string().optional(),
	uploaded: z.string().optional(),
	contentType: z.string().optional(),
	metadata: z.record(z.string(), z.string()).optional(),
})

// ============================================================================
// Internal Schemas (for API response validation)
// ============================================================================

/**
 * Zod schema for validating R2 list result.
 * The R2 API returns cursor as an optional field when truncated=true.
 */
const R2ListResultSchema = z.object({
	objects: z.array(
		z.object({
			key: z.string(),
			size: z.number(),
			etag: z.string(),
			uploaded: z.date(),
		}),
	),
	truncated: z.boolean(),
	cursor: z.string().optional(),
	delimitedPrefixes: z.array(z.string()).optional(),
})

/**
 * Get workspace-scoped path.
 * All R2 paths are prefixed with workspaceId to ensure multi-tenant isolation.
 */
function scopedPath({ workspaceId, key }: { workspaceId: string; key: string }): string {
	// Validate path doesn't try to escape workspace scope
	if (key.includes('..')) {
		throw new Error('Invalid path: path traversal not allowed')
	}
	// Normalize leading slash
	const normalizedKey = key.startsWith('/') ? key.slice(1) : key
	return `ws/${workspaceId}/${normalizedKey}`
}

/**
 * Strip workspace prefix from path for display.
 */
function unscopedPath({ workspaceId, fullPath }: { workspaceId: string; fullPath: string }): string {
	const prefix = `ws/${workspaceId}/`
	return fullPath.startsWith(prefix) ? fullPath.slice(prefix.length) : fullPath
}

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
	outputSchema: R2GetOutputSchema,
	execute: async (params, context) => {
		const r2 = context.env.R2
		if (!r2) {
			return failure('R2 bucket not available')
		}

		try {
			const fullPath = scopedPath({ workspaceId: context.workspaceId, key: params.key })
			const object = await r2.get(fullPath)
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
	outputSchema: R2PutOutputSchema,
	execute: async (params, context) => {
		const r2 = context.env.R2
		if (!r2) {
			return failure('R2 bucket not available')
		}

		try {
			const fullPath = scopedPath({ workspaceId: context.workspaceId, key: params.key })
			const options: R2PutOptions = {}
			if (params.contentType || params.metadata) {
				options.httpMetadata = params.contentType ? { contentType: params.contentType } : undefined
				options.customMetadata = params.metadata
			}

			const result = await r2.put(fullPath, params.content, options)
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
	outputSchema: R2DeleteOutputSchema,
	execute: async (params, context) => {
		const r2 = context.env.R2
		if (!r2) {
			return failure('R2 bucket not available')
		}

		try {
			const fullPath = scopedPath({ workspaceId: context.workspaceId, key: params.key })
			await r2.delete(fullPath)
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
	outputSchema: R2ListOutputSchema,
	execute: async (params, context) => {
		const r2 = context.env.R2
		if (!r2) {
			return failure('R2 bucket not available')
		}

		try {
			// Always scope to workspace, optionally with additional user prefix
			const workspacePrefix = `ws/${context.workspaceId}/`
			const fullPrefix = params.prefix
				? scopedPath({ workspaceId: context.workspaceId, key: params.prefix })
				: workspacePrefix

			const options: R2ListOptions = {
				limit: params.limit,
				prefix: fullPrefix,
			}
			if (params.cursor) options.cursor = params.cursor
			if (params.delimiter) options.delimiter = params.delimiter

			const result = await r2.list(options)
			const parseResult = R2ListResultSchema.safeParse(result)
			if (!parseResult.success) {
				return failure(`Invalid R2 list response: ${parseResult.error.message}`)
			}
			const parsed = parseResult.data

			return success({
				objects: parsed.objects.map((obj) => ({
					key: unscopedPath({ workspaceId: context.workspaceId, fullPath: obj.key }),
					size: obj.size,
					etag: obj.etag,
					uploaded: obj.uploaded.toISOString(),
				})),
				truncated: parsed.truncated,
				cursor: parsed.truncated && parsed.cursor ? parsed.cursor : undefined,
				delimitedPrefixes: parsed.delimitedPrefixes?.map((p) =>
					unscopedPath({ workspaceId: context.workspaceId, fullPath: p }),
				),
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
	outputSchema: R2HeadOutputSchema,
	execute: async (params, context) => {
		const r2 = context.env.R2
		if (!r2) {
			return failure('R2 bucket not available')
		}

		try {
			const fullPath = scopedPath({ workspaceId: context.workspaceId, key: params.key })
			const head = await r2.head(fullPath)
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
