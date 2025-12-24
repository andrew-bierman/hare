import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { and, eq } from 'drizzle-orm'
import { tools } from 'web-app/db/schema'
import { getSystemToolById, isSystemToolId, SYSTEM_TOOLS } from 'web-app/lib/agents/tools/system-tools'
import { getDb } from '../db'
import { commonResponses, requireAdminAccess, requireWriteAccess } from '../helpers'
import { authMiddleware, workspaceMiddleware } from '../middleware'
import {
	CreateToolSchema,
	ErrorSchema,
	IdParamSchema,
	SuccessSchema,
	ToolSchema,
	UpdateToolSchema,
} from '../schemas'
import { serializeSystemTool, serializeTool, type SystemToolDefinition } from '../serializers'
import type { WorkspaceEnv } from '../types'

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
		...commonResponses,
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
			description: 'Write access required',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		500: {
			description: 'Failed to create tool',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		...commonResponses,
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
		...commonResponses,
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
			description: 'Write access required',
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
			description: 'Failed to update tool',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		...commonResponses,
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
			description: 'Admin access required',
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
		...commonResponses,
	},
})

// Create app with proper typing
const app = new OpenAPIHono<WorkspaceEnv>()

// Apply middleware
app.use('*', authMiddleware)
app.use('*', workspaceMiddleware)

// Register routes
app.openapi(listToolsRoute, async (c) => {
	const { includeSystem } = c.req.valid('query')
	const db = await getDb(c)
	const workspace = c.get('workspace')

	// Get custom tools from database
	const customTools = await db.select().from(tools).where(eq(tools.workspaceId, workspace.id))
	const customToolsData = customTools.map((tool) => serializeTool(tool))

	// Include system tools if requested
	const systemToolsData = includeSystem
		? SYSTEM_TOOLS.map((t) => serializeSystemTool(t as SystemToolDefinition))
		: []

	return c.json({ tools: [...systemToolsData, ...customToolsData] }, 200)
})

app.openapi(createToolRoute, async (c) => {
	const data = c.req.valid('json')
	const db = await getDb(c)
	const user = c.get('user')
	const workspace = c.get('workspace')
	const role = c.get('workspaceRole')

	requireWriteAccess(role)

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
		serializeTool(tool, { inputSchema: data.inputSchema, code: data.code }),
		201,
	)
})

app.openapi(getToolRoute, async (c) => {
	const { id } = c.req.valid('param')
	const db = await getDb(c)
	const workspace = c.get('workspace')

	// Check for system tool first
	const systemTool = getSystemToolById(id)
	if (systemTool) {
		return c.json(serializeSystemTool(systemTool as SystemToolDefinition), 200)
	}

	// Get custom tool from database
	const [tool] = await db
		.select()
		.from(tools)
		.where(and(eq(tools.id, id), eq(tools.workspaceId, workspace.id)))

	if (!tool) {
		return c.json({ error: 'Tool not found' }, 404)
	}

	return c.json(serializeTool(tool), 200)
})

app.openapi(updateToolRoute, async (c) => {
	const { id } = c.req.valid('param')
	const data = c.req.valid('json')
	const db = await getDb(c)
	const workspace = c.get('workspace')
	const role = c.get('workspaceRole')

	// Check if trying to modify system tool
	if (isSystemToolId(id)) {
		return c.json({ error: 'Cannot modify system tools' }, 400)
	}

	requireWriteAccess(role)

	// Verify tool belongs to workspace
	const [existing] = await db
		.select()
		.from(tools)
		.where(and(eq(tools.id, id), eq(tools.workspaceId, workspace.id)))

	if (!existing) {
		return c.json({ error: 'Tool not found' }, 404)
	}

	// Build typed update object
	const updateData: Partial<typeof tools.$inferInsert> = {
		updatedAt: new Date(),
		...(data.name !== undefined && { name: data.name }),
		...(data.description !== undefined && { description: data.description }),
		...(data.type !== undefined && { type: data.type }),
		...(data.config !== undefined && { config: data.config }),
	}

	const [tool] = await db.update(tools).set(updateData).where(eq(tools.id, id)).returning()

	if (!tool) {
		return c.json({ error: 'Failed to update tool' }, 500)
	}

	return c.json(
		serializeTool(tool, { inputSchema: data.inputSchema, code: data.code }),
		200,
	)
})

app.openapi(deleteToolRoute, async (c) => {
	const { id } = c.req.valid('param')
	const db = await getDb(c)
	const workspace = c.get('workspace')
	const role = c.get('workspaceRole')

	// Check if trying to delete system tool
	if (isSystemToolId(id)) {
		return c.json({ error: 'Cannot delete system tools' }, 400)
	}

	requireAdminAccess(role)

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
