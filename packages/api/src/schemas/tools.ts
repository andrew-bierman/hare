import { z } from '@hono/zod-openapi'
import { TOOL_TYPES } from '@hare/config'
import { JsonSchemaSchema, JsonValueSchema } from './common'

/**
 * Tool configuration schema.
 */
export const ToolConfigSchema = z.record(z.string(), JsonValueSchema)

/**
 * All supported tool types.
 */
export const ToolTypeSchema = z.enum(TOOL_TYPES).openapi({ example: 'http' })

/**
 * Full tool schema for API responses.
 */
export const ToolSchema = z
	.object({
		id: z.string().openapi({ example: 'tool_http' }),
		name: z.string().openapi({ example: 'HTTP Request' }),
		description: z.string().nullable().openapi({ example: 'Make HTTP requests to external APIs' }),
		type: ToolTypeSchema,
		inputSchema: JsonSchemaSchema.openapi({
			example: {
				url: { type: 'string', description: 'The URL to request' },
				method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'] },
			},
		}),
		outputSchema: JsonSchemaSchema.optional().openapi({
			example: {
				status: { type: 'number', description: 'HTTP status code' },
				data: { type: 'unknown', description: 'Response data' },
			},
		}),
		config: ToolConfigSchema.optional().openapi({ example: {} }),
		code: z.string().optional().openapi({
			example: 'export default async function(input) { return fetch(input.url) }',
		}),
		isSystem: z.boolean().openapi({ example: true }),
		createdAt: z.string().datetime().openapi({ example: '2024-12-01T00:00:00Z' }),
		updatedAt: z.string().datetime().openapi({ example: '2024-12-01T00:00:00Z' }),
	})
	.openapi('Tool')

/**
 * Schema for creating a new tool.
 */
export const CreateToolSchema = z
	.object({
		name: z.string().min(1).max(100).openapi({ example: 'My Custom Tool' }),
		description: z.string().min(1).openapi({ example: 'A custom tool for my agent' }),
		type: ToolTypeSchema,
		inputSchema: JsonSchemaSchema.openapi({
			example: { input: { type: 'string' } },
		}),
		config: ToolConfigSchema.optional().openapi({ example: {} }),
		code: z.string().optional().openapi({
			example: 'export default async function(input) { return input }',
		}),
	})
	.openapi('CreateTool')

/**
 * Schema for updating a tool.
 */
export const UpdateToolSchema = CreateToolSchema.partial().openapi('UpdateTool')
