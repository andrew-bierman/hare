/**
 * Agent Router - Routes requests to Durable Object agents
 *
 * This router handles:
 * - WebSocket upgrade requests to HareAgent
 * - HTTP requests to agents
 * - MCP protocol requests
 */

import type { HareEnv } from '@hare/tools'

/**
 * Extended environment with Durable Object bindings.
 */
export interface HareAgentEnv extends HareEnv {
	HARE_AGENT: DurableObjectNamespace
	MCP_AGENT?: DurableObjectNamespace
}

/**
 * Route configuration for agents.
 */
export interface AgentRouteConfig {
	/** The agent ID (used as Durable Object ID) */
	agentId: string
	/** Workspace ID for context */
	workspaceId: string
	/** Optional user ID */
	userId?: string
}

/**
 * Input for routing to a HareAgent.
 */
export interface RouteToHareAgentInput {
	request: Request
	env: HareAgentEnv
	agentId: string
}

/**
 * Input for routing a WebSocket to an agent.
 */
export interface RouteWebSocketToAgentInput {
	request: Request
	env: HareAgentEnv
	agentId: string
}

/**
 * Input for routing HTTP to an agent.
 */
export interface RouteHttpToAgentInput {
	request: Request
	env: HareAgentEnv
	agentId: string
	path: string
}

/**
 * Input for routing to the MCP agent.
 */
export interface RouteToMcpAgentInput {
	request: Request
	env: HareAgentEnv
	workspaceId: string
}

/**
 * Route a request to a HareAgent Durable Object.
 */
export async function routeToHareAgent(input: RouteToHareAgentInput): Promise<Response> {
	const { request, env, agentId } = input
	// Get the Durable Object stub and forward the request
	const id = env.HARE_AGENT.idFromName(agentId)
	const stub = env.HARE_AGENT.get(id)
	return stub.fetch(request)
}

/**
 * Route a WebSocket connection to an agent.
 */
export async function routeWebSocketToAgent(input: RouteWebSocketToAgentInput): Promise<Response> {
	const { request, env, agentId } = input
	// Get the Durable Object stub
	const id = env.HARE_AGENT.idFromName(agentId)
	const stub = env.HARE_AGENT.get(id)

	// Forward the WebSocket upgrade request
	return stub.fetch(request)
}

/**
 * Route an HTTP request to an agent.
 */
export async function routeHttpToAgent(input: RouteHttpToAgentInput): Promise<Response> {
	const { request, env, agentId, path } = input
	// Get the Durable Object stub
	const id = env.HARE_AGENT.idFromName(agentId)
	const stub = env.HARE_AGENT.get(id)

	// Create a new request with the agent path
	const url = new URL(request.url)
	url.pathname = path

	const agentRequest = new Request(url.toString(), {
		method: request.method,
		headers: request.headers,
		body: request.body,
	})

	return stub.fetch(agentRequest)
}

/**
 * Route a request to the MCP agent.
 */
export async function routeToMcpAgent(input: RouteToMcpAgentInput): Promise<Response> {
	const { request, env, workspaceId } = input

	if (!env.MCP_AGENT) {
		return new Response('MCP Agent not configured', { status: 501 })
	}

	// Use workspace ID as the MCP agent instance ID
	const id = env.MCP_AGENT.idFromName(workspaceId)
	const stub = env.MCP_AGENT.get(id)

	return stub.fetch(request)
}

/**
 * Check if a request is a WebSocket upgrade request.
 */
export function isWebSocketRequest(request: Request): boolean {
	const upgrade = request.headers.get('Upgrade')
	return upgrade?.toLowerCase() === 'websocket'
}

/**
 * Get agent ID from request (from headers or URL).
 */
export function getAgentIdFromRequest(request: Request): string | null {
	// Check header first
	const headerAgentId = request.headers.get('x-agent-id')
	if (headerAgentId) return headerAgentId

	// Check URL path (e.g., /agents/abc123/chat)
	const url = new URL(request.url)
	const pathMatch = url.pathname.match(/\/agents\/([^/]+)/)
	if (pathMatch?.[1]) return pathMatch[1]

	// Check query param
	const queryAgentId = url.searchParams.get('agentId')
	if (queryAgentId) return queryAgentId

	return null
}

/**
 * Create headers for agent context.
 */
export function createAgentHeaders(config: AgentRouteConfig): Headers {
	const headers = new Headers()
	headers.set('x-agent-id', config.agentId)
	headers.set('x-workspace-id', config.workspaceId)
	if (config.userId) {
		headers.set('x-user-id', config.userId)
	}
	return headers
}
