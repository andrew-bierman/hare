/**
 * MCP (Model Context Protocol) API Routes using @hono/mcp
 *
 * Exposes Hare's tools via the Model Context Protocol over HTTP Streaming Transport.
 * This enables external AI clients (Claude, Cursor, etc.) to connect to Hare's tools
 * via a stateless HTTP-based MCP server.
 *
 * @see https://www.npmjs.com/package/@hono/mcp
 */

import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { StreamableHTTPTransport } from '@hono/mcp'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { and, eq } from 'drizzle-orm'
import { workspaceMembers } from 'web-app/db/schema'
import { getCloudflareEnv, getDb } from '../db'
import { optionalAuthMiddleware } from '../middleware'
import { ErrorSchema } from '../schemas'
import type { OptionalAuthEnv } from '../types'
import { getSystemTools, type ToolContext, type Tool } from 'web-app/lib/agents/tools'

// MCP server instances per workspace (in-memory cache for stateless handling)
const mcpServers = new Map<string, McpServer>()
const transports = new Map<string, StreamableHTTPTransport>()

/**
 * Check if a user has access to a workspace.
 */
async function hasWorkspaceAccess(
	db: ReturnType<typeof import('../db').getDb> extends Promise<infer T> ? T : never,
	userId: string,
	workspaceId: string,
): Promise<boolean> {
	const [membership] = await db
		.select()
		.from(workspaceMembers)
		.where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))
	return !!membership
}

/**
 * Create an MCP server with all Hare tools registered.
 */
function createMcpServer(context: ToolContext): McpServer {
	const server = new McpServer({
		name: 'hare-mcp-api',
		version: '1.0.0',
	})

	// Get all system tools
	const tools = getSystemTools(context)

	// Register each tool with MCP server
	for (const tool of tools) {
		registerToolWithMcp(server, tool, context)
	}

	// Register prompts
	registerPrompts(server)

	// Register resources
	registerResources(server, context)

	return server
}

/**
 * Register a Hare tool with the MCP server.
 */
function registerToolWithMcp(server: McpServer, tool: Tool, context: ToolContext): void {
	// Convert Zod schema to JSON Schema for MCP
	const jsonSchema = z.toJSONSchema(tool.inputSchema) as Record<string, unknown>

	server.tool(tool.id, tool.description, jsonSchema, async (params) => {
		try {
			// Validate input
			const validatedParams = tool.inputSchema.parse(params)

			// Execute the tool
			const result = await tool.execute(validatedParams, context)

			if (result.success) {
				return {
					content: [
						{
							type: 'text' as const,
							text: JSON.stringify(result.data, null, 2),
						},
					],
				}
			} else {
				return {
					content: [
						{
							type: 'text' as const,
							text: `Error: ${result.error}`,
						},
					],
					isError: true,
				}
			}
		} catch (error) {
			return {
				content: [
					{
						type: 'text' as const,
						text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
					},
				],
				isError: true,
			}
		}
	})
}

/**
 * Register MCP prompts for common tasks.
 */
function registerPrompts(server: McpServer): void {
	// Summarize content prompt
	server.prompt(
		'summarize',
		'Summarize text content using AI',
		{ text: z.string().describe('The text to summarize') },
		async ({ text }) => ({
			messages: [
				{
					role: 'user' as const,
					content: {
						type: 'text' as const,
						text: `Please summarize the following text:\n\n${text}`,
					},
				},
			],
		}),
	)

	// Translate content prompt
	server.prompt(
		'translate',
		'Translate text to another language',
		{
			text: z.string().describe('The text to translate'),
			targetLanguage: z.string().describe('Target language (e.g., Spanish, French, German)'),
		},
		async ({ text, targetLanguage }) => ({
			messages: [
				{
					role: 'user' as const,
					content: {
						type: 'text' as const,
						text: `Please translate the following text to ${targetLanguage}:\n\n${text}`,
					},
				},
			],
		}),
	)

	// Code review prompt
	server.prompt(
		'code-review',
		'Review code for issues and improvements',
		{ code: z.string().describe('The code to review') },
		async ({ code }) => ({
			messages: [
				{
					role: 'user' as const,
					content: {
						type: 'text' as const,
						text: `Please review the following code for bugs, security issues, and potential improvements:\n\n\`\`\`\n${code}\n\`\`\``,
					},
				},
			],
		}),
	)

	// Data analysis prompt
	server.prompt(
		'analyze-data',
		'Analyze JSON data and provide insights',
		{ data: z.string().describe('JSON data to analyze') },
		async ({ data }) => ({
			messages: [
				{
					role: 'user' as const,
					content: {
						type: 'text' as const,
						text: `Please analyze the following JSON data and provide insights:\n\n\`\`\`json\n${data}\n\`\`\``,
					},
				},
			],
		}),
	)
}

/**
 * Register MCP resources for workspace access.
 */
function registerResources(server: McpServer, context: ToolContext): void {
	// Workspace info resource
	server.resource(
		'workspace-info',
		'hare://workspace/info',
		async () => ({
			contents: [
				{
					uri: `hare://workspace/${context.workspaceId}/info`,
					mimeType: 'application/json',
					text: JSON.stringify(
						{
							workspaceId: context.workspaceId,
							userId: context.userId,
							availableTools: getSystemTools(context).map((t) => ({
								id: t.id,
								description: t.description,
							})),
						},
						null,
						2,
					),
				},
			],
		}),
	)

	// Tool catalog resource
	server.resource(
		'tool-catalog',
		'hare://tools/catalog',
		async () => ({
			contents: [
				{
					uri: 'hare://tools/catalog',
					mimeType: 'application/json',
					text: JSON.stringify(
						{
							totalTools: getSystemTools(context).length,
							categories: {
								cloudflare: ['kv_get', 'kv_put', 'kv_delete', 'kv_list', 'r2_get', 'r2_put', 'r2_delete', 'r2_list', 'r2_head', 'sql_query', 'sql_execute', 'sql_batch', 'http_request', 'http_get', 'http_post', 'ai_search', 'ai_search_answer'],
								utility: ['datetime', 'json', 'text', 'math', 'uuid', 'hash', 'base64', 'url', 'delay'],
								integrations: ['zapier', 'zapier_save', 'zapier_list', 'zapier_trigger', 'zapier_delete', 'zapier_test', 'webhook'],
								ai: ['sentiment', 'summarize', 'translate', 'image_generate', 'classify', 'ner', 'embedding', 'question_answer'],
								data: ['rss', 'scrape', 'regex', 'crypto', 'json_schema', 'csv', 'template'],
								sandbox: ['code_execute', 'code_validate', 'sandbox_file'],
								validation: ['validate_email', 'validate_phone', 'validate_url', 'validate_credit_card', 'validate_ip', 'validate_json'],
								transform: ['markdown', 'diff', 'qrcode', 'compression', 'color'],
								memory: ['recall_memory', 'store_memory'],
							},
						},
						null,
						2,
					),
				},
			],
		}),
	)
}

/**
 * Get or create MCP server for a workspace.
 */
function getOrCreateMcpServer(workspaceId: string, context: ToolContext): { server: McpServer; transport: StreamableHTTPTransport } {
	let server = mcpServers.get(workspaceId)
	let transport = transports.get(workspaceId)

	if (!server) {
		server = createMcpServer(context)
		mcpServers.set(workspaceId, server)
	}

	if (!transport) {
		transport = new StreamableHTTPTransport()
		transports.set(workspaceId, transport)
	}

	return { server, transport }
}

// OpenAPI route definitions
const mcpApiRoute = createRoute({
	method: 'post',
	path: '/{workspaceId}',
	tags: ['MCP'],
	summary: 'MCP HTTP Streaming endpoint',
	description: 'Handle MCP requests via HTTP Streaming Transport. This endpoint supports the Model Context Protocol over HTTP.',
	request: {
		params: z.object({
			workspaceId: z.string().describe('Workspace ID for MCP context'),
		}),
		body: {
			content: {
				'application/json': {
					schema: z.object({
						jsonrpc: z.literal('2.0'),
						id: z.union([z.string(), z.number()]).optional(),
						method: z.string(),
						params: z.unknown().optional(),
					}),
				},
			},
		},
	},
	responses: {
		200: {
			description: 'MCP response',
			content: {
				'application/json': {
					schema: z.object({
						jsonrpc: z.literal('2.0'),
						id: z.union([z.string(), z.number()]).optional(),
						result: z.unknown().optional(),
						error: z.object({
							code: z.number(),
							message: z.string(),
							data: z.unknown().optional(),
						}).optional(),
					}),
				},
			},
		},
		401: {
			description: 'Unauthorized',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		503: {
			description: 'Service unavailable',
			content: { 'application/json': { schema: ErrorSchema } },
		},
	},
})

const mcpInfoApiRoute = createRoute({
	method: 'get',
	path: '/{workspaceId}/info',
	tags: ['MCP'],
	summary: 'Get MCP API server info',
	description: 'Get information about the MCP API server and available tools',
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
						transport: z.string(),
						capabilities: z.object({
							tools: z.boolean(),
							resources: z.boolean(),
							prompts: z.boolean(),
						}),
						toolCount: z.number(),
						instructions: z.string(),
					}),
				},
			},
		},
	},
})

const mcpToolsRoute = createRoute({
	method: 'get',
	path: '/{workspaceId}/tools',
	tags: ['MCP'],
	summary: 'List available MCP tools',
	description: 'Get a list of all tools available via MCP',
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
						tools: z.array(z.object({
							id: z.string(),
							description: z.string(),
						})),
					}),
				},
			},
		},
	},
})

// Create app
const app = new OpenAPIHono<OptionalAuthEnv>()

// Apply optional auth middleware
app.use('*', optionalAuthMiddleware)

// MCP HTTP Streaming endpoint
app.openapi(mcpApiRoute, async (c) => {
	const { workspaceId } = c.req.valid('param')
	const db = await getDb(c)
	const env = await getCloudflareEnv(c)
	const user = c.get('user')

	// Authorization: verify user has access to the workspace
	if (user?.id) {
		const hasAccess = await hasWorkspaceAccess(db, user.id, workspaceId)
		if (!hasAccess) {
			return c.json({ error: 'Unauthorized: no access to this workspace' }, 401)
		}
	}

	// Create tool context
	const context: ToolContext = {
		env,
		workspaceId,
		userId: user?.id ?? 'anonymous',
	}

	// Get or create MCP server and transport
	const { server, transport } = getOrCreateMcpServer(workspaceId, context)

	// Connect if not already connected
	if (!server.isConnected()) {
		await server.connect(transport)
	}

	// Handle the MCP request
	return transport.handleRequest(c)
})

// MCP info endpoint
app.openapi(mcpInfoApiRoute, async (c) => {
	const { workspaceId } = c.req.valid('param')
	const env = await getCloudflareEnv(c)
	const user = c.get('user')

	// Create tool context for counting tools
	const context: ToolContext = {
		env,
		workspaceId,
		userId: user?.id ?? 'anonymous',
	}

	const tools = getSystemTools(context)

	return c.json(
		{
			name: 'hare-mcp-api',
			version: '1.0.0',
			transport: 'HTTP Streaming (Streamable HTTP Transport)',
			capabilities: {
				tools: true,
				resources: true,
				prompts: true,
			},
			toolCount: tools.length,
			instructions: `
Connect to Hare MCP API server via HTTP Streaming Transport.

Endpoint: POST /api/mcp-api/${workspaceId}

This is a stateless MCP server that exposes Hare's tools via HTTP.
Compatible with any MCP client that supports Streamable HTTP Transport.

Available capabilities:
- Tools: ${tools.length} built-in tools for data processing, AI, integrations, etc.
- Resources: Access to workspace information and tool catalog
- Prompts: Pre-configured prompts for common tasks (summarize, translate, code-review, analyze-data)

Example MCP client configuration:
{
  "mcpServers": {
    "hare": {
      "url": "https://your-domain/api/mcp-api/${workspaceId}",
      "transport": "streamable-http"
    }
  }
}
			`.trim(),
		},
		200,
	)
})

// List tools endpoint
app.openapi(mcpToolsRoute, async (c) => {
	const { workspaceId } = c.req.valid('param')
	const env = await getCloudflareEnv(c)
	const user = c.get('user')

	// Create tool context
	const context: ToolContext = {
		env,
		workspaceId,
		userId: user?.id ?? 'anonymous',
	}

	const tools = getSystemTools(context)

	return c.json(
		{
			tools: tools.map((t) => ({
				id: t.id,
				description: t.description,
			})),
		},
		200,
	)
})

export default app
