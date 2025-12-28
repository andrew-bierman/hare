import { z } from '@hono/zod-openapi'

/**
 * Common error schema for API responses.
 */
export const ErrorSchema = z
	.object({
		error: z.string().openapi({ example: 'Resource not found' }),
		code: z.string().optional().openapi({ example: 'NOT_FOUND' }),
	})
	.openapi('Error')

/**
 * Common success schema for API responses.
 */
export const SuccessSchema = z
	.object({
		success: z.boolean().openapi({ example: true }),
	})
	.openapi('Success')

/**
 * Common ID parameter schema.
 */
export const IdParamSchema = z.object({
	id: z.string().openapi({ param: { name: 'id', in: 'path' }, example: 'resource_abc123' }),
})

/**
 * Reusable OpenAPI response definitions for common HTTP status codes.
 * Only includes truly universal responses that don't need custom messages.
 * Note: 403, 404, 500 are NOT included - routes define these with context-specific messages.
 */
export const commonResponses = {
	401: {
		description: 'Unauthorized - authentication required',
		content: { 'application/json': { schema: ErrorSchema } },
	},
	503: {
		description: 'Service unavailable',
		content: { 'application/json': { schema: ErrorSchema } },
	},
} as const
