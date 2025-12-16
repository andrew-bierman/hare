import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { eq } from 'drizzle-orm'
import { getDb } from '../db'
import {
	CreateToolSchema,
	IdParamSchema,
	SuccessSchema,
	ToolSchema,
	UpdateToolSchema,
} from '../schemas'
import { tools } from 'web-app/db/schema'

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
		const db = getDb(c)

		// Return mock data for development/testing when DB not available
		if (!db) {
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
				],
			})
		}

		// TODO: Include system tools alongside custom tools
		const results = await db.select().from(tools)

		const toolsData = results.map((tool) => ({
			id: tool.id,
			name: tool.name,
			description: tool.description,
			type: tool.type,
			inputSchema: {}, // TODO: Parse from config or separate field
			config: tool.config,
			code: undefined,
			isSystem: false, // Custom tools from DB
			createdAt: tool.createdAt.toISOString(),
			updatedAt: tool.updatedAt.toISOString(),
		}))

		return c.json({ tools: toolsData })
	})
	.openapi(createToolRoute, async (c) => {
		const data = c.req.valid('json')
		const db = getDb(c)

		// Return mock data for development/testing when DB not available
		if (!db) {
			const now = new Date().toISOString()
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
		}

		// TODO: Get actual user ID from authentication context
		// TODO: Get actual workspace ID from context or request
		const userId = 'user_default'
		const workspaceId = 'ws_default'

		const [tool] = await db
			.insert(tools)
			.values({
				workspaceId,
				name: data.name,
				description: data.description,
				type: data.type,
				config: data.config,
				createdBy: userId,
			})
			.returning()

		return c.json(
			{
				id: tool.id,
				name: tool.name,
				description: tool.description,
				type: tool.type,
				inputSchema: data.inputSchema,
				config: tool.config,
				code: data.code,
				isSystem: false,
				createdAt: tool.createdAt.toISOString(),
				updatedAt: tool.updatedAt.toISOString(),
			},
			201,
		)
	})
	.openapi(getToolRoute, async (c) => {
		const { id } = c.req.valid('param')
		const db = getDb(c)

		// Return mock data for development/testing when DB not available
		if (!db) {
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
		}

		// TODO: Add authorization check
		const [tool] = await db.select().from(tools).where(eq(tools.id, id))

		if (!tool) {
			return c.json({ error: 'Tool not found' }, 404)
		}

		return c.json({
			id: tool.id,
			name: tool.name,
			description: tool.description,
			type: tool.type,
			inputSchema: {}, // TODO: Parse from config or separate field
			config: tool.config,
			code: undefined,
			isSystem: false, // Custom tools from DB
			createdAt: tool.createdAt.toISOString(),
			updatedAt: tool.updatedAt.toISOString(),
		})
	})
	.openapi(updateToolRoute, async (c) => {
		const { id } = c.req.valid('param')
		const data = c.req.valid('json')
		const db = getDb(c)

		// Return mock data for development/testing when DB not available
		if (!db) {
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
		}

		// TODO: Add authorization check
		// TODO: Verify tool is not a system tool
		const updateData: Record<string, unknown> = {
			updatedAt: new Date(),
		}

		if (data.name !== undefined) updateData.name = data.name
		if (data.description !== undefined) updateData.description = data.description
		if (data.type !== undefined) updateData.type = data.type
		if (data.config !== undefined) updateData.config = data.config

		const [tool] = await db.update(tools).set(updateData).where(eq(tools.id, id)).returning()

		if (!tool) {
			return c.json({ error: 'Tool not found' }, 404)
		}

		return c.json({
			id: tool.id,
			name: tool.name,
			description: tool.description,
			type: tool.type,
			inputSchema: data.inputSchema ?? {},
			config: tool.config,
			code: data.code,
			isSystem: false,
			createdAt: tool.createdAt.toISOString(),
			updatedAt: tool.updatedAt.toISOString(),
		})
	})
	.openapi(deleteToolRoute, async (c) => {
		const { id } = c.req.valid('param')
		const db = getDb(c)

		// Return success for development/testing when DB not available
		if (!db) {
			return c.json({ success: true })
		}

		// TODO: Add authorization check
		// TODO: Verify tool is not a system tool
		const result = await db.delete(tools).where(eq(tools.id, id)).returning()

		if (result.length === 0) {
			return c.json({ error: 'Tool not found' }, 404)
		}

		return c.json({ success: true })
	})

export default app
