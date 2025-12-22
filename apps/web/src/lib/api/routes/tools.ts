import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { eq, and } from 'drizzle-orm'
import { getDb } from '../db'
import { CreateToolSchema, ErrorSchema, IdParamSchema, SuccessSchema, ToolSchema, UpdateToolSchema } from '../schemas'
import { tools } from 'web-app/db/schema'
import { authMiddleware, workspaceMiddleware, type WorkspaceVariables } from '../middleware'

// System tools that are always available
const SYSTEM_TOOLS = [
	{
		id: 'system-http',
		name: 'HTTP Request',
		description: 'Make HTTP requests to external APIs',
		type: 'http' as const,
		inputSchema: {
			url: { type: 'string', description: 'The URL to request' },
			method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
			headers: { type: 'object', optional: true },
			body: { type: 'any', optional: true },
		},
		isSystem: true,
	},
	{
		id: 'system-kv',
		name: 'Key-Value Store',
		description: 'Store and retrieve data from key-value storage',
		type: 'kv' as const,
		inputSchema: {
			operation: { type: 'string', enum: ['get', 'put', 'delete', 'list'] },
			key: { type: 'string', description: 'The key to operate on' },
			value: { type: 'string', optional: true },
		},
		isSystem: true,
	},
	{
		id: 'system-r2',
		name: 'Object Storage',
		description: 'Store and retrieve files from object storage',
		type: 'r2' as const,
		inputSchema: {
			operation: { type: 'string', enum: ['get', 'put', 'delete', 'list'] },
			path: { type: 'string', description: 'The path/key of the object' },
			content: { type: 'string', optional: true },
		},
		isSystem: true,
	},
	{
		id: 'system-sql',
		name: 'SQL Query',
		description: 'Execute read-only SQL queries on the database',
		type: 'sql' as const,
		inputSchema: {
			query: { type: 'string', description: 'The SQL query to execute' },
			params: { type: 'array', optional: true },
		},
		isSystem: true,
	},
	{
		id: 'system-vectorize',
		name: 'Semantic Search',
		description: 'Search and store content using semantic similarity',
		type: 'vectorize' as const,
		inputSchema: {
			operation: { type: 'string', enum: ['search', 'insert', 'delete'] },
			query: { type: 'string', description: 'Text to search for' },
			text: { type: 'string', optional: true },
		},
		isSystem: true,
	},
]

// Define routes
const listToolsRoute = createRoute({
	method: 'get',
	path: '/',
	tags: ['Tools'],
	summary: 'List all tools',
	description: 'Get a list of all available tools (system and custom)',
	request: {
		query: z.object({
			workspaceId: z.string().describe('Workspace ID'),
			includeSystem: z.coerce.boolean().optional().default(true),
		}),
	},
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
		503: {
			description: 'Service unavailable',
			content: { 'application/json': { schema: ErrorSchema } },
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
		query: z.object({
			workspaceId: z.string().describe('Workspace ID'),
		}),
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
		403: {
			description: 'Forbidden',
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
		query: z.object({
			workspaceId: z.string().describe('Workspace ID'),
		}),
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
		404: {
			description: 'Tool not found',
			content: {
				'application/json': {
					schema: ErrorSchema,
				},
			},
		},
		503: {
			description: 'Service unavailable',
			content: { 'application/json': { schema: ErrorSchema } },
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
		query: z.object({
			workspaceId: z.string().describe('Workspace ID'),
		}),
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
		400: {
			description: 'Cannot modify system tool',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		403: {
			description: 'Forbidden',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		404: {
			description: 'Tool not found',
			content: {
				'application/json': {
					schema: ErrorSchema,
				},
			},
		},
		500: {
			description: 'Internal server error',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		503: {
			description: 'Service unavailable',
			content: { 'application/json': { schema: ErrorSchema } },
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
		query: z.object({
			workspaceId: z.string().describe('Workspace ID'),
		}),
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
		400: {
			description: 'Cannot delete system tool',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		403: {
			description: 'Forbidden',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		404: {
			description: 'Tool not found',
			content: {
				'application/json': {
					schema: ErrorSchema,
				},
			},
		},
		503: {
			description: 'Service unavailable',
			content: { 'application/json': { schema: ErrorSchema } },
		},
	},
})

// Helper to ensure tool type is valid for API response
type ToolType = 'http' | 'sql' | 'kv' | 'r2' | 'vectorize' | 'custom'
function mapToolType(dbType: string): ToolType {
	const validTypes: ToolType[] = ['http', 'sql', 'kv', 'r2', 'vectorize', 'custom']
	if (validTypes.includes(dbType as ToolType)) {
		return dbType as ToolType
	}
	return 'custom'
}

// Create app with proper typing
const app = new OpenAPIHono<{ Variables: WorkspaceVariables }>()

// Apply middleware
app.use('*', authMiddleware)
app.use('*', workspaceMiddleware)

// Register routes
app.openapi(listToolsRoute, async (c) => {
	const { includeSystem } = c.req.valid('query')
	const db = await getDb(c)
	const workspace = c.get('workspace')

	if (!db) {
		return c.json({ error: 'Service unavailable' }, 503)
	}

	// Get custom tools from database
	const customTools = await db.select().from(tools).where(eq(tools.workspaceId, workspace.id))

	const customToolsData = customTools.map((tool) => ({
		id: tool.id,
		name: tool.name,
		description: tool.description || '',
		type: mapToolType(tool.type),
		inputSchema: {},
		config: tool.config || undefined,
		isSystem: false,
		createdAt: tool.createdAt.toISOString(),
		updatedAt: tool.updatedAt.toISOString(),
	}))

	// Include system tools if requested
	const now = new Date().toISOString()
	const systemToolsData = includeSystem
		? SYSTEM_TOOLS.map((t) => ({
				...t,
				config: undefined,
				createdAt: now,
				updatedAt: now,
			}))
		: []

	return c.json({ tools: [...systemToolsData, ...customToolsData] }, 200)
})

app.openapi(createToolRoute, async (c) => {
	const data = c.req.valid('json')
	const db = await getDb(c)
	const user = c.get('user')
	const workspace = c.get('workspace')
	const role = c.get('workspaceRole')

	if (!db) {
		return c.json({ error: 'Service unavailable' }, 503)
	}

	// Check write permission
	if (role === 'viewer') {
		return c.json({ error: 'Insufficient permissions' }, 403)
	}

	const [tool] = await db
		.insert(tools)
		.values({
			workspaceId: workspace.id,
			name: data.name,
			description: data.description,
			type: data.type,
			config: data.config,
			createdBy: user.id,
		})
		.returning()

	if (!tool) {
		return c.json({ error: 'Failed to create tool' }, 500)
	}

	return c.json(
		{
			id: tool.id,
			name: tool.name,
			description: tool.description || '',
			type: mapToolType(tool.type),
			inputSchema: data.inputSchema,
			config: tool.config || undefined,
			code: data.code,
			isSystem: false,
			createdAt: tool.createdAt.toISOString(),
			updatedAt: tool.updatedAt.toISOString(),
		},
		201
	)
})

app.openapi(getToolRoute, async (c) => {
	const { id } = c.req.valid('param')
	const db = await getDb(c)
	const workspace = c.get('workspace')

	// Check for system tool first
	const systemTool = SYSTEM_TOOLS.find((t) => t.id === id)
	if (systemTool) {
		const now = new Date().toISOString()
		return c.json(
			{
				...systemTool,
				config: undefined,
				createdAt: now,
				updatedAt: now,
			},
			200
		)
	}

	if (!db) {
		return c.json({ error: 'Service unavailable' }, 503)
	}

	// Get custom tool from database
	const [tool] = await db
		.select()
		.from(tools)
		.where(and(eq(tools.id, id), eq(tools.workspaceId, workspace.id)))

	if (!tool) {
		return c.json({ error: 'Tool not found' }, 404)
	}

	return c.json(
		{
			id: tool.id,
			name: tool.name,
			description: tool.description || '',
			type: mapToolType(tool.type),
			inputSchema: {},
			config: tool.config || undefined,
			isSystem: false,
			createdAt: tool.createdAt.toISOString(),
			updatedAt: tool.updatedAt.toISOString(),
		},
		200
	)
})

app.openapi(updateToolRoute, async (c) => {
	const { id } = c.req.valid('param')
	const data = c.req.valid('json')
	const db = await getDb(c)
	const workspace = c.get('workspace')
	const role = c.get('workspaceRole')

	// Check if trying to modify system tool
	if (SYSTEM_TOOLS.some((t) => t.id === id)) {
		return c.json({ error: 'Cannot modify system tools' }, 400)
	}

	if (!db) {
		return c.json({ error: 'Service unavailable' }, 503)
	}

	// Check write permission
	if (role === 'viewer') {
		return c.json({ error: 'Insufficient permissions' }, 403)
	}

	// Verify tool belongs to workspace
	const [existing] = await db
		.select()
		.from(tools)
		.where(and(eq(tools.id, id), eq(tools.workspaceId, workspace.id)))

	if (!existing) {
		return c.json({ error: 'Tool not found' }, 404)
	}

	const updateData: Record<string, unknown> = {
		updatedAt: new Date(),
	}

	if (data.name !== undefined) updateData.name = data.name
	if (data.description !== undefined) updateData.description = data.description
	if (data.type !== undefined) updateData.type = data.type
	if (data.config !== undefined) updateData.config = data.config

	const [tool] = await db.update(tools).set(updateData).where(eq(tools.id, id)).returning()

	if (!tool) {
		return c.json({ error: 'Failed to update tool' }, 500)
	}

	return c.json(
		{
			id: tool.id,
			name: tool.name,
			description: tool.description || '',
			type: mapToolType(tool.type),
			inputSchema: data.inputSchema ?? {},
			config: tool.config || undefined,
			code: data.code,
			isSystem: false,
			createdAt: tool.createdAt.toISOString(),
			updatedAt: tool.updatedAt.toISOString(),
		},
		200
	)
})

app.openapi(deleteToolRoute, async (c) => {
	const { id } = c.req.valid('param')
	const db = await getDb(c)
	const workspace = c.get('workspace')
	const role = c.get('workspaceRole')

	// Check if trying to delete system tool
	if (SYSTEM_TOOLS.some((t) => t.id === id)) {
		return c.json({ error: 'Cannot delete system tools' }, 400)
	}

	if (!db) {
		return c.json({ error: 'Service unavailable' }, 503)
	}

	// Check admin permission for delete
	if (role !== 'owner' && role !== 'admin') {
		return c.json({ error: 'Insufficient permissions' }, 403)
	}

	// Verify tool belongs to workspace and delete
	const result = await db
		.delete(tools)
		.where(and(eq(tools.id, id), eq(tools.workspaceId, workspace.id)))
		.returning()

	if (result.length === 0) {
		return c.json({ error: 'Tool not found' }, 404)
	}

	return c.json({ success: true }, 200)
})

export default app
