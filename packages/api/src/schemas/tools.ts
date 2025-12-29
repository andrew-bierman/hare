import { z } from '@hono/zod-openapi'
import { JsonSchemaSchema } from './common'

/**
 * JSON value schema for tool config.
 */
const JsonValueSchema: z.ZodType<unknown> = z.lazy(() =>
	z.union([
		z.string(),
		z.number(),
		z.boolean(),
		z.null(),
		z.array(JsonValueSchema),
		z.record(z.string(), JsonValueSchema),
	]),
)

/**
 * Tool configuration schema.
 */
export const ToolConfigSchema = z.record(z.string(), JsonValueSchema)

/**
 * All supported tool types.
 */
export const ToolTypeSchema = z
	.enum([
		// Cloudflare native
		'http',
		'sql',
		'kv',
		'r2',
		'search',
		// Utility
		'datetime',
		'json',
		'text',
		'math',
		'uuid',
		'hash',
		'base64',
		'url',
		'delay',
		// Integrations (Zapier = single hub for externals)
		'zapier',
		'webhook',
		// AI (Workers AI)
		'sentiment',
		'summarize',
		'translate',
		'image_generate',
		'classify',
		'ner',
		'embedding',
		'question_answer',
		// Data
		'rss',
		'scrape',
		'regex',
		'crypto',
		'json_schema',
		'csv',
		'template',
		// Sandbox
		'code_execute',
		'code_validate',
		'sandbox_file',
		// Validation
		'validate_email',
		'validate_phone',
		'validate_url',
		'validate_credit_card',
		'validate_ip',
		'validate_json',
		// Transform
		'markdown',
		'diff',
		'qrcode',
		'compression',
		'color',
		// Custom
		'custom',
	])
	.openapi({ example: 'http' })

/**
 * Full tool schema for API responses.
 */
export const ToolSchema = z
	.object({
		id: z.string().openapi({ example: 'tool_http' }),
		name: z.string().openapi({ example: 'HTTP Request' }),
		description: z.string().openapi({ example: 'Make HTTP requests to external APIs' }),
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
