import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import type { R2ToolConfig, ToolContext } from './types'

const r2InputSchema = z.object({
	operation: z.enum(['get', 'put', 'delete', 'list']).describe('The operation to perform'),
	path: z.string().optional().describe('The path/key of the object'),
	content: z.string().optional().describe('The content to store (for put operation). For binary data, use base64 encoding.'),
	contentType: z.string().optional().default('application/octet-stream').describe('The content type of the object (for put operation)'),
	isBase64: z.boolean().optional().default(false).describe('Whether the content is base64 encoded'),
	listPrefix: z.string().optional().describe('Prefix to filter objects when listing'),
	limit: z.number().optional().default(100).describe('Maximum number of objects to return when listing'),
})

/**
 * Create an R2 object storage tool for agents.
 * Provides get, put, delete, and list operations on Cloudflare R2.
 */
export function createR2Tool(config: R2ToolConfig, ctx: ToolContext) {
	const { prefix = '', allowedOperations = ['get', 'put', 'delete', 'list'], maxSizeBytes = 10 * 1024 * 1024 } = config.config

	// Prefix paths with workspace ID for isolation
	const pathPrefix = `${ctx.workspaceId}/${prefix}`

	return createTool({
		id: config.id,
		description: config.description || 'Store and retrieve files from object storage',
		inputSchema: r2InputSchema,
		execute: async ({ context }) => {
			const { operation, path, content, contentType = 'application/octet-stream', isBase64 = false, listPrefix, limit = 100 } = context
			const r2 = ctx.env.R2

			if (!r2) {
				return { success: false, error: 'R2 bucket not available' }
			}

			if (!allowedOperations.includes(operation)) {
				return { success: false, error: `Operation '${operation}' not allowed` }
			}

			try {
				switch (operation) {
					case 'get': {
						if (!path) {
							return { success: false, error: 'Path is required for get operation' }
						}
						const fullPath = `${pathPrefix}${path}`
						const object = await r2.get(fullPath)

						if (!object) {
							return { success: false, error: 'Object not found', found: false }
						}

						// For text content, return as string. For binary, return metadata only.
						const objectContentType = object.httpMetadata?.contentType || 'application/octet-stream'
						const isText = objectContentType.startsWith('text/') || objectContentType === 'application/json'

						if (isText) {
							const text = await object.text()
							return {
								success: true,
								path,
								content: text,
								contentType: objectContentType,
								size: object.size,
								etag: object.etag,
								uploaded: object.uploaded?.toISOString(),
							}
						} else {
							// For binary, return base64
							const arrayBuffer = await object.arrayBuffer()
							const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
							return {
								success: true,
								path,
								content: base64,
								isBase64: true,
								contentType: objectContentType,
								size: object.size,
								etag: object.etag,
								uploaded: object.uploaded?.toISOString(),
							}
						}
					}

					case 'put': {
						if (!path) {
							return { success: false, error: 'Path is required for put operation' }
						}
						if (content === undefined) {
							return { success: false, error: 'Content is required for put operation' }
						}

						let body: string | ArrayBuffer = content
						if (isBase64) {
							const binaryString = atob(content)
							const bytes = new Uint8Array(binaryString.length)
							for (let i = 0; i < binaryString.length; i++) {
								bytes[i] = binaryString.charCodeAt(i)
							}
							body = bytes.buffer
						}

						// Check size limit
						const size = typeof body === 'string' ? body.length : body.byteLength
						if (size > maxSizeBytes) {
							return { success: false, error: `Content exceeds maximum size of ${maxSizeBytes} bytes` }
						}

						const fullPath = `${pathPrefix}${path}`
						const result = await r2.put(fullPath, body, {
							httpMetadata: { contentType },
						})

						return {
							success: true,
							path,
							stored: true,
							size: result.size,
							etag: result.etag,
						}
					}

					case 'delete': {
						if (!path) {
							return { success: false, error: 'Path is required for delete operation' }
						}
						const fullPath = `${pathPrefix}${path}`
						await r2.delete(fullPath)
						return {
							success: true,
							path,
							deleted: true,
						}
					}

					case 'list': {
						const listOptions: R2ListOptions = {
							prefix: `${pathPrefix}${listPrefix || ''}`,
							limit: Math.min(limit, 1000),
						}
						const result = await r2.list(listOptions)

						// Strip the workspace prefix from returned paths
						const objects = result.objects.map((obj) => ({
							key: obj.key.replace(pathPrefix, ''),
							size: obj.size,
							etag: obj.etag,
							uploaded: obj.uploaded?.toISOString(),
						}))

						return {
							success: true,
							objects,
							truncated: result.truncated,
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
