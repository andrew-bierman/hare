import { z } from '@hono/zod-openapi'

/**
 * JSON value schema - represents any valid JSON value.
 * Uses z.any() with OpenAPI type for compatibility.
 * OpenAPI type is set to object to handle the recursive nature.
 */
export const JsonValueSchema: z.ZodType<unknown> = z
	.any()
	.openapi({ type: 'object', description: 'Any valid JSON value' })

/**
 * JSON Schema property definition.
 * Represents a single property in a JSON Schema.
 */
export const JsonSchemaPropertySchema = z
	.object({
		type: z.string().optional(),
		description: z.string().optional(),
		enum: z.array(z.string()).optional(),
		default: JsonValueSchema.optional(),
		required: z.boolean().optional(),
	})
	.passthrough()

/**
 * JSON Schema object.
 * Represents the inputSchema for tools, allowing arbitrary JSON Schema properties.
 * Uses z.unknown() for values to be compatible with Record<string, unknown> from @hare/types.
 */
export const JsonSchemaSchema = z.record(z.string(), z.unknown())

/**
 * Metadata schema for chat messages.
 * Allows any JSON object with string keys.
 */
export const MetadataSchema = z.record(z.string(), JsonValueSchema)

/**
 * Common ID parameter schema for path parameters.
 */
export const IdParamSchema = z.object({
	id: z.string().openapi({ param: { name: 'id', in: 'path' }, example: 'resource_abc123' }),
})

/**
 * Common error response schema.
 */
export const ErrorSchema = z
	.object({
		error: z.string().openapi({ example: 'Resource not found' }),
		code: z.string().optional().openapi({ example: 'NOT_FOUND' }),
	})
	.openapi('Error')

/**
 * Common success response schema.
 */
export const SuccessSchema = z
	.object({
		success: z.boolean().openapi({ example: true }),
	})
	.openapi('Success')
