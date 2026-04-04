/**
 * MCP (Model Context Protocol) API Routes
 *
 * Enables external AI clients (Claude, Cursor, etc.) to connect
 * to Hare's tools via the Model Context Protocol.
 *
 * Supports both:
 * - WebSocket connections for real-time MCP (Cloudflare Agents SDK)
 * - HTTP endpoints for stateless MCP operations
 */

import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { and, eq } from 'drizzle-orm'
import { workspaceMembers } from '@hare/db/schema'
import { isWebSocketRequest, routeToMcpAgent } from '@hare/agent'
import { agentControlTools, createRegistry, getSystemTools, type ToolContext } from '@hare/tools'
import { type Database, getCloudflareEnv, getDb } from '../db'
import { optionalAuthMiddleware } from '../middleware'
import { ErrorSchema } from '../schemas'
import type { OptionalAuthEnv } from '@hare/types'

/**
 * Check if a user has access to a workspace.
 */
async function hasWorkspaceAccess(
	db: Database,
	userId: string,
	workspaceId: string,
): Promise<boolean> {
	const [membership] = await db
		.select()
		.from(workspaceMembers)
		.where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))
	return !!membership
}

// MCP WebSocket route
const mcpConnectRoute = createRoute({
	method: 'get',
	path: '/{workspaceId}',
	tags: ['MCP'],
	summary: 'Connect to MCP server',
	description:
		'Upgrade to WebSocket connection for Model Context Protocol. External AI clients can discover and use Hare tools.',
	request: {
		params: z.object({
			workspaceId: z.string().describe('Workspace ID for MCP context'),
		}),
	},
	responses: {
		101: {
			description: 'WebSocket upgrade successful',
		},
		400: {
			description: 'Not a WebSocket request',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		503: {
			description: 'Service unavailable',
			content: { 'application/json': { schema: ErrorSchema } },
		},
	},
})

// MCP info route
const mcpInfoRoute = createRoute({
	method: 'get',
	path: '/{workspaceId}/info',
	tags: ['MCP'],
	summary: 'Get MCP server info',
	description: 'Get information about the MCP server and available tools',
	request: {
		params: z.object({
			workspaceId: z.string().describe('Workspace ID'),
		}),
	},
	responses: {
		200: {
			description: 'MCP server information',
			content: {
				'application/json': {
					schema: z.object({
						name: z.string(),
						version: z.string(),
						capabilities: z.object({
							tools: z.boolean(),
							resources: z.boolean(),
							prompts: z.boolean(),
						}),
						instructions: z.string(),
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

// MCP tools list route (HTTP)
const mcpToolsRoute = createRoute({
	method: 'get',
	path: '/{workspaceId}/tools',
	tags: ['MCP'],
	summary: 'List available MCP tools',
	description: 'Returns all agent control tools available via MCP',
	request: {
		params: z.object({
			workspaceId: z.string().describe('Workspace ID'),
		}),
	},
	responses: {
		200: {
			description: 'List of available tools',
			content: {
				'application/json': {
					schema: z.object({
						tools: z.array(
							z.object({
								name: z.string(),
								description: z.string(),
							}),
						),
					}),
				},
			},
		},
		401: {
			description: 'Authentication required',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		403: {
			description: 'Unauthorized',
			content: { 'application/json': { schema: ErrorSchema } },
		},
	},
})

// MCP tool execute route (HTTP)
const mcpToolExecuteRoute = createRoute({
	method: 'post',
	path: '/{workspaceId}/tools/{toolId}',
	tags: ['MCP'],
	summary: 'Execute an MCP tool',
	description: 'Execute a specific agent control tool with provided parameters',
	request: {
		params: z.object({
			workspaceId: z.string().describe('Workspace ID'),
			toolId: z.string().describe('Tool ID to execute'),
		}),
		body: {
			content: {
				'application/json': {
					schema: z.record(z.string(), z.unknown()),
				},
			},
		},
	},
	responses: {
		200: {
			description: 'Tool execution result',
			content: {
				'application/json': {
					schema: z.object({
						success: z.boolean(),
						data: z.unknown().optional(),
						error: z.string().optional(),
					}),
				},
			},
		},
		400: {
			description: 'Invalid tool parameters',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		401: {
			description: 'Authentication required',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		403: {
			description: 'Unauthorized',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		404: {
			description: 'Tool not found',
			content: { 'application/json': { schema: ErrorSchema } },
		},
	},
})

// MCP JSON-RPC route (HTTP)
const mcpRpcRoute = createRoute({
	method: 'post',
	path: '/{workspaceId}/rpc',
	tags: ['MCP'],
	summary: 'MCP JSON-RPC endpoint',
	description: 'Handle MCP protocol messages via JSON-RPC over HTTP',
	request: {
		params: z.object({
			workspaceId: z.string().describe('Workspace ID'),
		}),
		body: {
			content: {
				'application/json': {
					schema: z.object({
						jsonrpc: z.literal('2.0'),
						id: z.union([z.string(), z.number()]),
						method: z.string(),
						params: z.unknown().optional(),
					}),
				},
			},
		},
	},
	responses: {
		200: {
			description: 'JSON-RPC response',
			content: {
				'application/json': {
					schema: z.object({
						jsonrpc: z.literal('2.0'),
						id: z.union([z.string(), z.number()]),
						result: z.unknown().optional(),
						error: z
							.object({
								code: z.number(),
								message: z.string(),
							})
							.optional(),
					}),
				},
			},
		},
	},
})

// Create app
const baseApp = new OpenAPIHono<OptionalAuthEnv>()

// Apply optional auth middleware
baseApp.use('*', optionalAuthMiddleware)

// MCP WebSocket connection
const app = baseApp.openapi(mcpConnectRoute, async (c) => {
	const { workspaceId } = c.req.valid('param')
	const db = getDb(c)
	const env = getCloudflareEnv(c)
	const user = c.get('user')

	// Check if it's a WebSocket request
	if (!isWebSocketRequest(c.req.raw)) {
		return c.json({ error: 'WebSocket upgrade required' }, 400)
	}

	// Authorization: require authentication and verify workspace access
	if (!user?.id) {
		return c.json({ error: 'Authentication required' }, 401)
	}
	const hasAccess = await hasWorkspaceAccess(db, user.id, workspaceId)
	if (!hasAccess) {
		return c.json({ error: 'Unauthorized: no access to this workspace' }, 403)
	}

	// Route to the MCP Agent Durable Object
	return routeToMcpAgent({ request: c.req.raw, env, workspaceId })
})
// MCP info
.openapi(mcpInfoRoute, async (c) => {
	const { workspaceId } = c.req.valid('param')

	return c.json(
		{
			name: 'hare-mcp',
			version: '1.0.0',
			capabilities: {
				tools: true,
				resources: true,
				prompts: true,
			},
			instructions: `
Connect to Hare MCP server to access AI agent tools.

WebSocket URL: wss://your-domain/api/mcp/${workspaceId}
HTTP Endpoints:
- GET  /api/mcp/${workspaceId}/tools - List available tools
- POST /api/mcp/${workspaceId}/tools/{toolId} - Execute a tool
- POST /api/mcp/${workspaceId}/rpc - JSON-RPC endpoint

Available capabilities:
- Tools: Agent control tools (list, create, configure, message agents)
- Resources: Access to workspace information
- Prompts: Pre-configured prompts for common tasks

Example connection with Claude Desktop:
{
  "mcpServers": {
    "hare": {
      "url": "wss://your-domain/api/mcp/${workspaceId}"
    }
  }
}
			`.trim(),
		},
		200,
	)
})

// Helper to create tool context
async function createToolContext(
	c: Parameters<Parameters<typeof app.openapi>[1]>[0],
	workspaceId: string,
): Promise<ToolContext> {
	const env = getCloudflareEnv(c)
	const user = c.get('user')

	return {
		env,
		workspaceId,
		userId: user?.id ?? 'mcp-client',
		agentId: undefined, // MCP operates at workspace level, not per-agent
	}
}

// MCP tools list (HTTP)
const app2 = app.openapi(mcpToolsRoute, async (c) => {
	const { workspaceId } = c.req.valid('param')
	const db = getDb(c)
	const user = c.get('user')

	// Require authentication
	if (!user?.id) {
		return c.json({ error: 'Authentication required' }, 401)
	}
	const hasAccess = await hasWorkspaceAccess(db, user.id, workspaceId)
	if (!hasAccess) {
		return c.json({ error: 'Unauthorized: no access to this workspace' }, 403)
	}

	// Return ALL system tools + agent control tools
	const context = await createToolContext(c, workspaceId)
	const systemTools = getSystemTools(context)
	const allTools = [...systemTools, ...agentControlTools]

	const tools = allTools.map((tool) => ({
		name: tool.id,
		description: tool.description,
	}))

	return c.json({ tools }, 200)
})
// MCP tool execute (HTTP)
.openapi(mcpToolExecuteRoute, async (c) => {
	const { workspaceId, toolId } = c.req.valid('param')
	const db = getDb(c)
	const user = c.get('user')

	// Require authentication
	if (!user?.id) {
		return c.json({ error: 'Authentication required' }, 401)
	}
	const hasAccess = await hasWorkspaceAccess(db, user.id, workspaceId)
	if (!hasAccess) {
		return c.json({ error: 'Unauthorized: no access to this workspace' }, 403)
	}

	// Build registry with ALL tools (system + agent control)
	const context = await createToolContext(c, workspaceId)
	const systemTools = getSystemTools(context)
	const allToolsRegistry = createRegistry([...systemTools, ...agentControlTools])

	if (!allToolsRegistry.has(toolId)) {
		return c.json({ error: `Tool not found: ${toolId}` }, 404)
	}

	const params = await c.req.json()
	const result = await allToolsRegistry.execute({ id: toolId, params, context })

	return c.json({ success: result.success, data: result.data, error: result.error }, 200)
})
// MCP JSON-RPC (HTTP)
.openapi(mcpRpcRoute, async (c) => {
	const { workspaceId } = c.req.valid('param')
	const { id, method, params } = c.req.valid('json')
	const db = getDb(c)
	const user = c.get('user')

	// Require authentication for non-initialize methods
	if (method !== 'initialize') {
		if (!user?.id) {
			return c.json({
				jsonrpc: '2.0',
				id,
				error: { code: -32600, message: 'Authentication required' },
			})
		}
		const hasAccess = await hasWorkspaceAccess(db, user.id, workspaceId)
		if (!hasAccess) {
			return c.json({
				jsonrpc: '2.0',
				id,
				error: { code: -32600, message: 'Unauthorized: no access to this workspace' },
			})
		}
	}

	const context = await createToolContext(c, workspaceId)

	switch (method) {
		case 'initialize':
			return c.json({
				jsonrpc: '2.0',
				id,
				result: {
					protocolVersion: '2024-11-05',
					capabilities: {
						tools: { listChanged: true },
						resources: { subscribe: true, listChanged: true },
						prompts: { listChanged: true },
					},
					serverInfo: {
						name: 'hare-mcp',
						version: '1.0.0',
					},
				},
			})

		case 'tools/list': {
			const systemTools = getSystemTools(context)
			const allTools = [...systemTools, ...agentControlTools]
			return c.json({
				jsonrpc: '2.0',
				id,
				result: {
					tools: allTools.map((tool) => ({
						name: tool.id,
						description: tool.description,
						inputSchema: z.toJSONSchema(tool.inputSchema, { unrepresentable: 'any' }),
					})),
				},
			})
		}

		case 'tools/call': {
			const { name, arguments: args } = params as {
				name: string
				arguments: Record<string, unknown>
			}

			// Build registry with ALL tools
			const callSystemTools = getSystemTools(context)
			const allToolsRegistry = createRegistry([...callSystemTools, ...agentControlTools])

			if (!allToolsRegistry.has(name)) {
				return c.json({
					jsonrpc: '2.0',
					id,
					error: { code: -32601, message: `Tool not found: ${name}` },
				})
			}

			const result = await allToolsRegistry.execute({ id: name, params: args ?? {}, context })

			return c.json({
				jsonrpc: '2.0',
				id,
				result: {
					content: [
						{
							type: 'text',
							text: result.success
								? JSON.stringify(result.data, null, 2)
								: `Error: ${result.error}`,
						},
					],
					isError: !result.success,
				},
			})
		}

		default:
			return c.json({
				jsonrpc: '2.0',
				id,
				error: { code: -32601, message: `Method not found: ${method}` },
			})
	}
})

export default app2
