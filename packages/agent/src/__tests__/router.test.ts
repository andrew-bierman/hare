/**
 * Tests for router.ts - Agent routing functions
 */

import { describe, expect, it, vi } from 'vitest'
import {
	createAgentHeaders,
	getAgentIdFromRequest,
	isWebSocketRequest,
	routeHttpToAgent,
	routeToHareAgent,
	routeToMcpAgent,
	routeWebSocketToAgent,
	type HareAgentEnv,
} from '../router'

/**
 * Create a mock Durable Object stub for testing.
 */
function createMockStub() {
	return {
		fetch: vi.fn().mockResolvedValue(new Response('OK', { status: 200 })),
	}
}

/**
 * Create a mock Durable Object namespace for testing.
 */
function createMockNamespace() {
	const stub = createMockStub()
	return {
		idFromName: vi.fn().mockReturnValue({ name: 'test-id' }),
		get: vi.fn().mockReturnValue(stub),
		stub,
	}
}

/**
 * Create a mock environment with Durable Object bindings.
 */
function createMockEnv(options: { includeMcpAgent?: boolean } = {}): HareAgentEnv {
	const mockEnv: Partial<HareAgentEnv> = {
		HARE_AGENT: createMockNamespace() as unknown as DurableObjectNamespace,
	}

	if (options.includeMcpAgent) {
		mockEnv.MCP_AGENT = createMockNamespace() as unknown as DurableObjectNamespace
	}

	return mockEnv as HareAgentEnv
}

describe('router', () => {
	describe('isWebSocketRequest', () => {
		it('returns true for WebSocket upgrade request', () => {
			const request = new Request('http://localhost/ws', {
				headers: { Upgrade: 'websocket' },
			})
			expect(isWebSocketRequest(request)).toBe(true)
		})

		it('returns true for WebSocket upgrade request (case insensitive)', () => {
			const request = new Request('http://localhost/ws', {
				headers: { Upgrade: 'WebSocket' },
			})
			expect(isWebSocketRequest(request)).toBe(true)
		})

		it('returns false for regular HTTP request', () => {
			const request = new Request('http://localhost/api')
			expect(isWebSocketRequest(request)).toBe(false)
		})

		it('returns false for request with different upgrade header', () => {
			const request = new Request('http://localhost/api', {
				headers: { Upgrade: 'h2c' },
			})
			expect(isWebSocketRequest(request)).toBe(false)
		})
	})

	describe('getAgentIdFromRequest', () => {
		it('returns agent ID from x-agent-id header', () => {
			const request = new Request('http://localhost/api', {
				headers: { 'x-agent-id': 'agent_123' },
			})
			expect(getAgentIdFromRequest(request)).toBe('agent_123')
		})

		it('returns agent ID from URL path /agents/:id', () => {
			const request = new Request('http://localhost/agents/agent_456/chat')
			expect(getAgentIdFromRequest(request)).toBe('agent_456')
		})

		it('returns agent ID from query parameter', () => {
			const request = new Request('http://localhost/api?agentId=agent_789')
			expect(getAgentIdFromRequest(request)).toBe('agent_789')
		})

		it('prioritizes header over URL path', () => {
			const request = new Request('http://localhost/agents/url_agent/chat', {
				headers: { 'x-agent-id': 'header_agent' },
			})
			expect(getAgentIdFromRequest(request)).toBe('header_agent')
		})

		it('prioritizes URL path over query parameter', () => {
			const request = new Request('http://localhost/agents/path_agent?agentId=query_agent')
			expect(getAgentIdFromRequest(request)).toBe('path_agent')
		})

		it('returns null when no agent ID is found', () => {
			const request = new Request('http://localhost/api/other')
			expect(getAgentIdFromRequest(request)).toBe(null)
		})
	})

	describe('createAgentHeaders', () => {
		it('creates headers with agent ID and workspace ID', () => {
			const headers = createAgentHeaders({
				agentId: 'agent_123',
				workspaceId: 'workspace_456',
			})

			expect(headers.get('x-agent-id')).toBe('agent_123')
			expect(headers.get('x-workspace-id')).toBe('workspace_456')
			expect(headers.get('x-user-id')).toBe(null)
		})

		it('includes user ID when provided', () => {
			const headers = createAgentHeaders({
				agentId: 'agent_123',
				workspaceId: 'workspace_456',
				userId: 'user_789',
			})

			expect(headers.get('x-agent-id')).toBe('agent_123')
			expect(headers.get('x-workspace-id')).toBe('workspace_456')
			expect(headers.get('x-user-id')).toBe('user_789')
		})
	})

	describe('routeToHareAgent', () => {
		it('routes request to Durable Object by agent ID', async () => {
			const env = createMockEnv()
			const request = new Request('http://localhost/api')

			await routeToHareAgent({
				request,
				env,
				agentId: 'test-agent',
			})

			expect(env.HARE_AGENT.idFromName).toHaveBeenCalledWith('test-agent')
			expect(env.HARE_AGENT.get).toHaveBeenCalled()
		})

		it('forwards the request to the stub', async () => {
			const env = createMockEnv()
			const request = new Request('http://localhost/api')

			const response = await routeToHareAgent({
				request,
				env,
				agentId: 'test-agent',
			})

			const mockNamespace = env.HARE_AGENT as unknown as ReturnType<typeof createMockNamespace>
			expect(mockNamespace.stub.fetch).toHaveBeenCalledWith(request)
			expect(response.status).toBe(200)
		})
	})

	describe('routeWebSocketToAgent', () => {
		it('routes WebSocket request to Durable Object', async () => {
			const env = createMockEnv()
			const request = new Request('http://localhost/ws', {
				headers: { Upgrade: 'websocket' },
			})

			await routeWebSocketToAgent({
				request,
				env,
				agentId: 'ws-agent',
			})

			expect(env.HARE_AGENT.idFromName).toHaveBeenCalledWith('ws-agent')
			expect(env.HARE_AGENT.get).toHaveBeenCalled()
		})
	})

	describe('routeHttpToAgent', () => {
		it('routes HTTP request with modified path', async () => {
			const env = createMockEnv()
			const request = new Request('http://localhost/api/agents/123/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ message: 'hello' }),
			})

			await routeHttpToAgent({
				request,
				env,
				agentId: 'http-agent',
				path: '/chat',
			})

			const mockNamespace = env.HARE_AGENT as unknown as ReturnType<typeof createMockNamespace>
			const fetchCall = mockNamespace.stub.fetch.mock.calls[0][0] as Request
			expect(new URL(fetchCall.url).pathname).toBe('/chat')
		})

		it('preserves request method and headers', async () => {
			const env = createMockEnv()
			const request = new Request('http://localhost/api/agents/123/state', {
				method: 'GET',
				headers: { 'x-custom': 'value' },
			})

			await routeHttpToAgent({
				request,
				env,
				agentId: 'http-agent',
				path: '/state',
			})

			const mockNamespace = env.HARE_AGENT as unknown as ReturnType<typeof createMockNamespace>
			const fetchCall = mockNamespace.stub.fetch.mock.calls[0][0] as Request
			expect(fetchCall.method).toBe('GET')
			expect(fetchCall.headers.get('x-custom')).toBe('value')
		})
	})

	describe('routeToMcpAgent', () => {
		it('routes request to MCP agent Durable Object', async () => {
			const env = createMockEnv({ includeMcpAgent: true })
			const request = new Request('http://localhost/mcp')

			await routeToMcpAgent({
				request,
				env,
				workspaceId: 'workspace_123',
			})

			expect(env.MCP_AGENT!.idFromName).toHaveBeenCalledWith('workspace_123')
			expect(env.MCP_AGENT!.get).toHaveBeenCalled()
		})

		it('returns 501 when MCP agent is not configured', async () => {
			const env = createMockEnv({ includeMcpAgent: false })
			const request = new Request('http://localhost/mcp')

			const response = await routeToMcpAgent({
				request,
				env,
				workspaceId: 'workspace_123',
			})

			expect(response.status).toBe(501)
			const text = await response.text()
			expect(text).toBe('MCP Agent not configured')
		})
	})
})
