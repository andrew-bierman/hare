/**
 * MCP (Model Context Protocol) Routes
 *
 * WebSocket + HTTP endpoints for external AI clients.
 */

import { isWebSocketRequest, routeToMcpAgent } from '@hare/agent'
import type { Database } from '@hare/db'
import { workspaceMembers, workspaces } from '@hare/db/schema'
import { agentControlTools, createRegistry, getSystemTools, type ToolContext } from '@hare/tools'
import type { CloudflareEnv } from '@hare/types'
import { and, eq } from 'drizzle-orm'
import { Elysia, status } from 'elysia'
import { z } from 'zod'
import { type AuthUserContext, optionalAuthPlugin } from '../context'

async function hasWorkspaceAccess(
	db: Database,
	userId: string,
	workspaceId: string,
): Promise<boolean> {
	// Check owner first (covers cases where no membership row exists for the owner)
	const [workspace] = await db
		.select({ ownerId: workspaces.ownerId })
		.from(workspaces)
		.where(eq(workspaces.id, workspaceId))
	if (!workspace) return false
	if (workspace.ownerId === userId) return true

	const [membership] = await db
		.select()
		.from(workspaceMembers)
		.where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))
	return !!membership
}

function createToolContext(
	cfEnv: CloudflareEnv,
	user: AuthUserContext | null,
	workspaceId: string,
): ToolContext {
	return {
		env: cfEnv,
		workspaceId,
		userId: user?.id ?? 'mcp-client',
		agentId: undefined,
	}
}

export const mcpRoutes = new Elysia({ prefix: '/mcp', name: 'mcp-routes' })
	.use(optionalAuthPlugin)

	// WebSocket connection
	.get('/:workspaceId', async ({ db, cfEnv, user, params, request }) => {
		if (!isWebSocketRequest(request)) {
			return status(400, { error: 'WebSocket upgrade required' })
		}

		if (!user?.id) return status(401, { error: 'Authentication required' })
		const hasAccess = await hasWorkspaceAccess(db, user.id, params.workspaceId)
		if (!hasAccess) return status(403, { error: 'Unauthorized' })

		return routeToMcpAgent({ request, env: cfEnv, workspaceId: params.workspaceId })
	})

	// MCP info
	.get('/:workspaceId/info', ({ params }) => ({
		name: 'hare-mcp',
		version: '1.0.0',
		capabilities: { tools: true, resources: true, prompts: true },
		instructions: `
Connect to Hare MCP server to access AI agent tools.

WebSocket URL: wss://your-domain/api/mcp/${params.workspaceId}
HTTP Endpoints:
- GET  /api/mcp/${params.workspaceId}/tools - List available tools
- POST /api/mcp/${params.workspaceId}/tools/{toolId} - Execute a tool
- POST /api/mcp/${params.workspaceId}/rpc - JSON-RPC endpoint
		`.trim(),
	}))

	// List tools
	.get('/:workspaceId/tools', async ({ db, cfEnv, user, params }) => {
		if (!user?.id) return status(401, { error: 'Authentication required' })
		const hasAccess = await hasWorkspaceAccess(db, user.id, params.workspaceId)
		if (!hasAccess) return status(403, { error: 'Unauthorized' })

		const context = createToolContext(cfEnv, user, params.workspaceId)
		const systemTools = getSystemTools(context)
		const allTools = [...systemTools, ...agentControlTools]

		return {
			tools: allTools.map((tool) => ({ name: tool.id, description: tool.description })),
		}
	})

	// Execute tool
	.post('/:workspaceId/tools/:toolId', async ({ db, cfEnv, user, params, request }) => {
		if (!user?.id) return status(401, { error: 'Authentication required' })
		const hasAccess = await hasWorkspaceAccess(db, user.id, params.workspaceId)
		if (!hasAccess) return status(403, { error: 'Unauthorized' })

		const context = createToolContext(cfEnv, user, params.workspaceId)
		const systemTools = getSystemTools(context)
		const allToolsRegistry = createRegistry([...systemTools, ...agentControlTools])

		if (!allToolsRegistry.has(params.toolId)) {
			return status(404, { error: `Tool not found: ${params.toolId}` })
		}

		const toolParams = await request.json()
		const result = await allToolsRegistry.execute({
			id: params.toolId,
			params: toolParams,
			context,
		})
		return { success: result.success, data: result.data, error: result.error }
	})

	// JSON-RPC endpoint
	.post('/:workspaceId/rpc', async ({ db, cfEnv, user, params, request }) => {
		const {
			id,
			method,
			params: rpcParams,
		} = (await request.json()) as {
			jsonrpc: string
			id: string | number
			method: string
			params?: unknown
		}

		if (method !== 'initialize') {
			if (!user?.id) {
				return { jsonrpc: '2.0', id, error: { code: -32600, message: 'Authentication required' } }
			}
			const hasAccess = await hasWorkspaceAccess(db, user.id, params.workspaceId)
			if (!hasAccess) {
				return { jsonrpc: '2.0', id, error: { code: -32600, message: 'Unauthorized' } }
			}
		}

		const context = createToolContext(cfEnv, user, params.workspaceId)

		switch (method) {
			case 'initialize':
				return {
					jsonrpc: '2.0',
					id,
					result: {
						protocolVersion: '2024-11-05',
						capabilities: {
							tools: { listChanged: true },
							resources: { subscribe: true, listChanged: true },
							prompts: { listChanged: true },
						},
						serverInfo: { name: 'hare-mcp', version: '1.0.0' },
					},
				}

			case 'tools/list': {
				const systemTools = getSystemTools(context)
				const allTools = [...systemTools, ...agentControlTools]
				return {
					jsonrpc: '2.0',
					id,
					result: {
						tools: allTools.map((tool) => ({
							name: tool.id,
							description: tool.description,
							inputSchema: z.toJSONSchema(tool.inputSchema, { unrepresentable: 'any' }),
						})),
					},
				}
			}

			case 'tools/call': {
				const { name, arguments: args } = rpcParams as {
					name: string
					arguments: Record<string, unknown>
				}

				const callSystemTools = getSystemTools(context)
				const allToolsRegistry = createRegistry([...callSystemTools, ...agentControlTools])

				if (!allToolsRegistry.has(name)) {
					return { jsonrpc: '2.0', id, error: { code: -32601, message: `Tool not found: ${name}` } }
				}

				const result = await allToolsRegistry.execute({ id: name, params: args ?? {}, context })
				return {
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
				}
			}

			default:
				return {
					jsonrpc: '2.0',
					id,
					error: { code: -32601, message: `Method not found: ${method}` },
				}
		}
	})
