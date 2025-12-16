import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import {
	CreateToolSchema,
	IdParamSchema,
	SuccessSchema,
	ToolSchema,
	UpdateToolSchema,
} from '../schemas'

// Define routes
const listToolsRoute = createRoute({
	method: 'get',
	path: '/',
	tags: ['Tools'],
	summary: 'List all tools',
	description: 'Get a list of all available tools (system and custom)',
	responses: {
		200: {
			description: 'List of tools',
			content: {
				'application/json': {
					schema: z.object({
						tools: z.array(ToolSchema),
					}),
				},
			},
		},
	},
})

const createToolRoute = createRoute({
	method: 'post',
	path: '/',
	tags: ['Tools'],
	summary: 'Create a custom tool',
	description: 'Create a new custom tool for use with agents',
	request: {
		body: {
			content: {
				'application/json': {
					schema: CreateToolSchema,
				},
			},
		},
	},
	responses: {
		201: {
			description: 'Tool created successfully',
			content: {
				'application/json': {
					schema: ToolSchema,
				},
			},
		},
	},
})

const getToolRoute = createRoute({
	method: 'get',
	path: '/{id}',
	tags: ['Tools'],
	summary: 'Get tool by ID',
	description: 'Retrieve a specific tool by its ID',
	request: {
		params: IdParamSchema,
	},
	responses: {
		200: {
			description: 'Tool details',
			content: {
				'application/json': {
					schema: ToolSchema,
				},
			},
		},
	},
})

const updateToolRoute = createRoute({
	method: 'patch',
	path: '/{id}',
	tags: ['Tools'],
	summary: 'Update tool',
	description: 'Update a custom tool (system tools cannot be modified)',
	request: {
		params: IdParamSchema,
		body: {
			content: {
				'application/json': {
					schema: UpdateToolSchema,
				},
			},
		},
	},
	responses: {
		200: {
			description: 'Tool updated successfully',
			content: {
				'application/json': {
					schema: ToolSchema,
				},
			},
		},
	},
})

const deleteToolRoute = createRoute({
	method: 'delete',
	path: '/{id}',
	tags: ['Tools'],
	summary: 'Delete tool',
	description: 'Delete a custom tool (system tools cannot be deleted)',
	request: {
		params: IdParamSchema,
	},
	responses: {
		200: {
			description: 'Tool deleted successfully',
			content: {
				'application/json': {
					schema: SuccessSchema,
				},
			},
		},
	},
})

// Create app and register routes
const app = new OpenAPIHono()
	.openapi(listToolsRoute, async (c) => {
		// TODO: Get from DB (both system tools and workspace custom tools)
		return c.json({
			tools: [
				{
					id: 'tool_http',
					name: 'HTTP Request',
					description: 'Make HTTP requests to external APIs',
					type: 'http' as const,
					inputSchema: {
						url: { type: 'string', description: 'The URL to request' },
						method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'] },
						headers: { type: 'object', optional: true },
						body: { type: 'any', optional: true },
					},
					isSystem: true,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				},
				{
					id: 'tool_sql',
					name: 'SQL Query',
					description: 'Execute SQL queries on D1 databases',
					type: 'sql' as const,
					inputSchema: {
						query: { type: 'string', description: 'The SQL query to execute' },
						params: { type: 'array', optional: true },
					},
					isSystem: true,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				},
				{
					id: 'tool_kv',
					name: 'KV Storage',
					description: 'Read/write to Cloudflare KV',
					type: 'kv' as const,
					inputSchema: {
						operation: { type: 'string', enum: ['get', 'put', 'delete', 'list'] },
						key: { type: 'string' },
						value: { type: 'any', optional: true },
					},
					isSystem: true,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				},
			],
		})
	})
	.openapi(createToolRoute, async (c) => {
		const data = c.req.valid('json')
		const now = new Date().toISOString()
		// TODO: Insert to DB
		return c.json(
			{
				id: `tool_${crypto.randomUUID().slice(0, 8)}`,
				name: data.name,
				description: data.description,
				type: data.type,
				inputSchema: data.inputSchema,
				config: data.config,
				code: data.code,
				isSystem: false,
				createdAt: now,
				updatedAt: now,
			},
			201,
		)
	})
	.openapi(getToolRoute, async (c) => {
		const { id } = c.req.valid('param')
		// TODO: Get from DB
		return c.json({
			id,
			name: 'HTTP Request',
			description: 'Make HTTP requests to external APIs',
			type: 'http' as const,
			inputSchema: {
				url: { type: 'string', description: 'The URL to request' },
				method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'] },
				headers: { type: 'object', optional: true },
				body: { type: 'any', optional: true },
			},
			config: {},
			isSystem: true,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		})
	})
	.openapi(updateToolRoute, async (c) => {
		const { id } = c.req.valid('param')
		const data = c.req.valid('json')
		// TODO: Update in DB (only allow for non-system tools)
		return c.json({
			id,
			name: data.name ?? 'Custom Tool',
			description: data.description ?? '',
			type: data.type ?? ('custom' as const),
			inputSchema: data.inputSchema ?? {},
			config: data.config,
			code: data.code,
			isSystem: false,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		})
	})
	.openapi(deleteToolRoute, async (c) => {
		const { id: _id } = c.req.valid('param')
		// TODO: Delete from DB (only allow for non-system tools)
		return c.json({ success: true })
	})

export default app
