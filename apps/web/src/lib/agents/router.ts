/**
 * Agent Router - Routes requests to Durable Object agents
 *
 * This router handles:
 * - WebSocket upgrade requests to HareAgent
 * - HTTP requests to agents
 * - MCP protocol requests
 */

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
 * Route a request to a HareAgent Durable Object.
 *
 * @param request The incoming request
 * @param env Cloudflare environment bindings
 * @param agentId The agent ID to route to
 * @returns Response from the agent
 */
export async function routeToHareAgent(
	request: Request,
	env: CloudflareEnv,
	agentId: string,
): Promise<Response> {
	// Get the Durable Object stub and forward the request
	const id = env.HARE_AGENT.idFromName(agentId)
	const stub = env.HARE_AGENT.get(id)
	return stub.fetch(request)
}

/**
 * Route a WebSocket connection to an agent.
 *
 * @param request The WebSocket upgrade request
 * @param env Cloudflare environment bindings
 * @param agentId The agent ID to connect to
 * @returns WebSocket response
 */
export async function routeWebSocketToAgent(
	request: Request,
	env: CloudflareEnv,
	agentId: string,
): Promise<Response> {
	// Get the Durable Object stub
	const id = env.HARE_AGENT.idFromName(agentId)
	const stub = env.HARE_AGENT.get(id)

	// Forward the WebSocket upgrade request
	return stub.fetch(request)
}

/**
 * Route an HTTP request to an agent.
 *
 * @param request The HTTP request
 * @param env Cloudflare environment bindings
 * @param agentId The agent ID
 * @param path The path to route to (e.g., '/chat', '/state')
 * @returns Response from the agent
 */
export async function routeHttpToAgent(
	request: Request,
	env: CloudflareEnv,
	agentId: string,
	path: string,
): Promise<Response> {
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
 *
 * @param request The MCP request
 * @param env Cloudflare environment bindings
 * @param workspaceId The workspace ID for MCP context
 * @returns Response from the MCP agent
 */
export async function routeToMcpAgent(
	request: Request,
	env: CloudflareEnv,
	workspaceId: string,
): Promise<Response> {
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
