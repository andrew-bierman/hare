/**
 * MCP (Model Context Protocol) API Routes
 *
 * Enables external AI clients (Claude, Cursor, etc.) to connect
 * to Hare's tools via the Model Context Protocol.
 */

import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { isWebSocketRequest, routeToMcpAgent } from 'web-app/lib/agents'
import { getCloudflareEnv } from '../db'
import { optionalAuthMiddleware } from '../middleware'
import { ErrorSchema } from '../schemas'
import type { OptionalAuthEnv } from '../types'

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

// Create app
const app = new OpenAPIHono<OptionalAuthEnv>()

// Apply optional auth middleware
app.use('*', optionalAuthMiddleware)

// MCP WebSocket connection
app.openapi(mcpConnectRoute, async (c) => {
	const { workspaceId } = c.req.valid('param')
	const env = await getCloudflareEnv(c)

	// Check if it's a WebSocket request
	if (!isWebSocketRequest(c.req.raw)) {
		return c.json({ error: 'WebSocket upgrade required' }, 400)
	}

	// Route to the MCP Agent Durable Object
	return routeToMcpAgent(c.req.raw, env, workspaceId)
})

// MCP info
app.openapi(mcpInfoRoute, async (c) => {
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

Available capabilities:
- Tools: 40+ built-in tools for data processing, AI, integrations, etc.
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

export default app
