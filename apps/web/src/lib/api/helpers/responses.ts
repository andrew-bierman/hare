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
 * Use these to maintain consistency across all API routes.
 */
export const commonResponses = {
	401: {
		description: 'Unauthorized',
		content: { 'application/json': { schema: ErrorSchema } },
	},
	403: {
		description: 'Forbidden',
		content: { 'application/json': { schema: ErrorSchema } },
	},
	404: {
		description: 'Not found',
		content: { 'application/json': { schema: ErrorSchema } },
	},
	500: {
		description: 'Internal server error',
		content: { 'application/json': { schema: ErrorSchema } },
	},
	503: {
		description: 'Service unavailable',
		content: { 'application/json': { schema: ErrorSchema } },
	},
} as const
