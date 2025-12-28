import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { and, eq } from 'drizzle-orm'
import { tools } from 'web-app/db/schema'
import {
	getSystemTools,
	getSystemToolsMap,
	isSystemTool,
	type HareEnv,
	type ToolContext,
} from '@hare/tools'
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
import { serializeHareTool, serializeHareTools, serializeTool } from '../serializers'
import {
	HttpToolConfigSchema,
	InputSchemaSchema,
	isUrlSafe,
	testHttpTool,
} from '../services/custom-tool-executor'
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
		400: {
			description: 'Invalid configuration or URL not allowed',
			content: { 'application/json': { schema: ErrorSchema } },
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

// Tool test request schema
const TestToolRequestSchema = z
	.object({
		config: HttpToolConfigSchema,
		inputSchema: InputSchemaSchema.optional(),
		testInput: z.record(z.string(), z.unknown()).optional(),
	})
	.openapi('TestToolRequest')

// Tool test response schema
const ToolTestResultSchema = z
	.object({
		success: z.boolean(),
		status: z.number().optional(),
		statusText: z.string().optional(),
		headers: z.record(z.string(), z.string()).optional(),
		data: z.unknown().optional(),
		error: z.string().optional(),
		duration: z.number(),
		requestDetails: z.object({
			url: z.string(),
			method: z.string(),
			headers: z.record(z.string(), z.string()).optional(),
			body: z.string().optional(),
		}),
	})
	.openapi('ToolTestResult')

const testToolRoute = createRoute({
	method: 'post',
	path: '/test',
	tags: ['Tools'],
	summary: 'Test HTTP tool configuration',
	description: 'Test an HTTP tool configuration with mock input before saving',
	request: {
		query: z.object({
			workspaceId: z.string().describe('Workspace ID'),
		}),
		body: {
			content: {
				'application/json': {
					schema: TestToolRequestSchema,
				},
			},
		},
	},
	responses: {
		200: {
			description: 'Tool test result',
			content: {
				'application/json': {
					schema: ToolTestResultSchema,
				},
			},
		},
		400: {
			description: 'Invalid configuration or URL not allowed',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		403: {
			description: 'Write access required',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		...commonResponses,
	},
})

const testExistingToolRoute = createRoute({
	method: 'post',
	path: '/{id}/test',
	tags: ['Tools'],
	summary: 'Test an existing tool',
	description: 'Test an existing HTTP tool with test input',
	request: {
		params: IdParamSchema,
		query: z.object({
			workspaceId: z.string().describe('Workspace ID'),
		}),
		body: {
			content: {
				'application/json': {
					schema: z.object({
						testInput: z.record(z.string(), z.unknown()).optional(),
					}),
				},
			},
		},
	},
	responses: {
		200: {
			description: 'Tool test result',
			content: {
				'application/json': {
					schema: ToolTestResultSchema,
				},
			},
		},
		400: {
			description: 'Tool type does not support testing',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		403: {
			description: 'Write access required',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		404: {
			description: 'Tool not found',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		...commonResponses,
	},
})

// Create app with proper typing
const app = new OpenAPIHono<WorkspaceEnv>()

// Apply middleware
app.use('*', authMiddleware)
app.use('*', workspaceMiddleware)

/**
 * Create a minimal tool context for serialization purposes.
 *
 * This context is safe to use with empty env bindings because:
 * - Tool instantiation only captures static metadata (id, description, inputSchema)
 * - Cloudflare bindings (AI, KV, R2, D1, VECTORIZE) are only accessed during execute()
 * - We never call tool.execute() when serializing for API responses
 *
 * The workspaceId/userId are set to 'system' since these are system tool definitions,
 * not user-specific tool instances.
 */
function createMinimalToolContext(): ToolContext {
	return {
		env: {} as HareEnv,
		workspaceId: 'system',
		userId: 'system',
	}
}

// Register routes
app.openapi(listToolsRoute, async (c) => {
	const { includeSystem } = c.req.valid('query')
	const db = await getDb(c)
	const workspace = c.get('workspace')

	// Get custom tools from database
	const customTools = await db.select().from(tools).where(eq(tools.workspaceId, workspace.id))
	const customToolsData = customTools.map((tool) => serializeTool(tool))

	// Include system tools if requested
	let systemToolsData: ReturnType<typeof serializeHareTools> = []
	if (includeSystem) {
		const context = createMinimalToolContext()
		const hareTools = getSystemTools(context)
		systemToolsData = serializeHareTools(hareTools)
	}

	return c.json({ tools: [...systemToolsData, ...customToolsData] }, 200)
})

app.openapi(createToolRoute, async (c) => {
	const data = c.req.valid('json')
	const db = await getDb(c)
	const user = c.get('user')
	const workspace = c.get('workspace')
	const role = c.get('workspaceRole')

	requireWriteAccess(role)

	// Validate URL safety for HTTP tools
	if (data.type === 'http' && data.config?.url && typeof data.config.url === 'string') {
		const urlSafety = isUrlSafe(data.config.url)
		if (!urlSafety.safe) {
			return c.json({ error: urlSafety.reason || 'Invalid URL' }, 400)
		}
	}

	// Transform inputSchema from API format to database format
	const dbInputSchema = data.inputSchema
		? {
				type: 'object' as const,
				properties: data.inputSchema as typeof tools.$inferInsert.inputSchema extends infer T
					? T extends { properties?: infer P }
						? P
						: never
					: never,
			}
		: null

	const [tool] = await db
		.insert(tools)
		.values({
			workspaceId: workspace.id,
			name: data.name,
			description: data.description,
			type: data.type,
			inputSchema: dbInputSchema,
			config: data.config as typeof tools.$inferInsert.config,
			createdBy: user.id,
		})
		.returning()

	if (!tool) {
		return c.json({ error: 'Failed to create tool' }, 500)
	}

	return c.json(serializeTool(tool, { inputSchema: data.inputSchema, code: data.code }), 201)
})

app.openapi(getToolRoute, async (c) => {
	const { id } = c.req.valid('param')
	const db = await getDb(c)
	const workspace = c.get('workspace')

	// Check for system tool first - use Map for O(1) lookup
	if (isSystemTool(id)) {
		const context = createMinimalToolContext()
		const toolsMap = getSystemToolsMap(context)
		const systemTool = toolsMap.get(id)
		if (systemTool) {
			return c.json(serializeHareTool(systemTool), 200)
		}
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
	if (isSystemTool(id)) {
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

	// Validate URL safety for HTTP tools
	if (data.config?.url && typeof data.config.url === 'string') {
		const urlSafety = isUrlSafe(data.config.url)
		if (!urlSafety.safe) {
			return c.json({ error: urlSafety.reason || 'Invalid URL' }, 400)
		}
	}

	// Transform inputSchema from API format to database format
	const dbInputSchema = data.inputSchema
		? {
				type: 'object' as const,
				properties: data.inputSchema as typeof tools.$inferInsert.inputSchema extends infer T
					? T extends { properties?: infer P }
						? P
						: never
					: never,
			}
		: undefined

	// Build typed update object
	const updateData: Partial<typeof tools.$inferInsert> = {
		updatedAt: new Date(),
		...(data.name !== undefined && { name: data.name }),
		...(data.description !== undefined && { description: data.description }),
		...(data.type !== undefined && { type: data.type }),
		...(data.inputSchema !== undefined && { inputSchema: dbInputSchema }),
		...(data.config !== undefined && { config: data.config as typeof tools.$inferInsert.config }),
	}

	const [tool] = await db.update(tools).set(updateData).where(eq(tools.id, id)).returning()

	if (!tool) {
		return c.json({ error: 'Failed to update tool' }, 500)
	}

	return c.json(serializeTool(tool, { inputSchema: data.inputSchema, code: data.code }), 200)
})

app.openapi(deleteToolRoute, async (c) => {
	const { id } = c.req.valid('param')
	const db = await getDb(c)
	const workspace = c.get('workspace')
	const role = c.get('workspaceRole')

	// Check if trying to delete system tool
	if (isSystemTool(id)) {
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

// Test tool configuration (before saving)
app.openapi(testToolRoute, async (c) => {
	const data = c.req.valid('json')
	const role = c.get('workspaceRole')

	requireWriteAccess(role)

	// Validate URL safety
	const urlSafety = isUrlSafe(data.config.url)
	if (!urlSafety.safe) {
		return c.json({ error: urlSafety.reason || 'Invalid URL' }, 400)
	}

	// Execute the test
	const result = await testHttpTool(data)

	return c.json(result, 200)
})

// Test existing tool
app.openapi(testExistingToolRoute, async (c) => {
	const { id } = c.req.valid('param')
	const data = c.req.valid('json')
	const db = await getDb(c)
	const workspace = c.get('workspace')
	const role = c.get('workspaceRole')

	requireWriteAccess(role)

	// Get the tool
	const [tool] = await db
		.select()
		.from(tools)
		.where(and(eq(tools.id, id), eq(tools.workspaceId, workspace.id)))

	if (!tool) {
		return c.json({ error: 'Tool not found' }, 404)
	}

	// Only HTTP tools can be tested
	if (tool.type !== 'http') {
		return c.json({ error: 'Only HTTP tools can be tested' }, 400)
	}

	// Validate config exists
	if (!tool.config?.url) {
		return c.json({ error: 'Tool has no URL configured' }, 400)
	}

	// Build test config from tool
	const testConfig = {
		url: tool.config.url,
		method: (tool.config.method as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE') || 'GET',
		headers: tool.config.headers,
		body: tool.config.body,
		bodyType: (tool.config.bodyType as 'json' | 'form' | 'text') || 'json',
		responseMapping: tool.config.responseMapping,
		timeout: tool.config.timeout || 10000,
	}

	// Parse the config
	const configParsed = HttpToolConfigSchema.safeParse(testConfig)
	if (!configParsed.success) {
		return c.json({ error: `Invalid tool configuration: ${configParsed.error.message}` }, 400)
	}

	// Get input schema from tool
	const inputSchema = tool.inputSchema ? InputSchemaSchema.safeParse(tool.inputSchema) : undefined

	// Execute the test
	const result = await testHttpTool({
		config: configParsed.data,
		inputSchema: inputSchema?.success ? inputSchema.data : undefined,
		testInput: data.testInput,
	})

	return c.json(result, 200)
})

export default app
