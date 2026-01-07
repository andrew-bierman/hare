import { env } from 'cloudflare:test'
import { beforeAll, describe, expect, it } from 'vitest'
import { app } from '@hare/api'
import { applyMigrations } from './setup'

// Augment the cloudflare:test module with the bindings we use
declare module 'cloudflare:test' {
	interface ProvidedEnv {
		DB: D1Database
		KV: KVNamespace
		R2: R2Bucket
	}
}

// Apply D1 migrations before tests
beforeAll(async () => {
	await applyMigrations(env.DB)
})

describe('MCP API', () => {
	describe('GET /api/mcp/:workspaceId', () => {
		it('returns 400 for non-WebSocket request', async () => {
			// MCP WebSocket endpoint requires upgrade, should return 400 without upgrade headers
			const res = await app.request('/api/mcp/ws_test123', {}, env)
			expect(res.status).toBe(400)

			const json = (await res.json()) as { error: string }
			expect(json.error).toBe('WebSocket upgrade required')
		})
	})

	describe('GET /api/mcp/:workspaceId/info', () => {
		it('returns MCP server information', async () => {
			const res = await app.request('/api/mcp/ws_test123/info', {}, env)
			expect(res.status).toBe(200)

			const json = (await res.json()) as {
				name: string
				version: string
				capabilities: {
					tools: boolean
					resources: boolean
					prompts: boolean
				}
				instructions: string
			}

			expect(json.name).toBe('hare-mcp')
			expect(json.version).toBe('1.0.0')
			expect(json.capabilities).toEqual({
				tools: true,
				resources: true,
				prompts: true,
			})
			expect(json.instructions).toBeDefined()
			expect(typeof json.instructions).toBe('string')
		})

		it('includes workspace ID in instructions', async () => {
			const workspaceId = 'ws_custom_123'
			const res = await app.request(`/api/mcp/${workspaceId}/info`, {}, env)
			expect(res.status).toBe(200)

			const json = (await res.json()) as { instructions: string }
			expect(json.instructions).toContain(workspaceId)
		})
	})

	describe('GET /api/mcp/:workspaceId/tools', () => {
		it('returns list of available tools', async () => {
			const res = await app.request('/api/mcp/ws_test123/tools', {}, env)
			expect(res.status).toBe(200)

			const json = (await res.json()) as {
				tools: Array<{ name: string; description: string }>
			}

			expect(json.tools).toBeDefined()
			expect(Array.isArray(json.tools)).toBe(true)

			// Each tool should have name and description
			for (const tool of json.tools) {
				expect(tool).toHaveProperty('name')
				expect(tool).toHaveProperty('description')
				expect(typeof tool.name).toBe('string')
				expect(typeof tool.description).toBe('string')
			}
		})
	})

	describe('POST /api/mcp/:workspaceId/tools/:toolId', () => {
		it('returns 404 for non-existent tool', async () => {
			const res = await app.request(
				'/api/mcp/ws_test123/tools/nonexistent_tool',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({}),
				},
				env,
			)
			expect(res.status).toBe(404)

			const json = (await res.json()) as { error: string }
			expect(json.error).toContain('Tool not found')
		})
	})

	describe('POST /api/mcp/:workspaceId/rpc', () => {
		it('handles initialize method', async () => {
			const res = await app.request(
				'/api/mcp/ws_test123/rpc',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						jsonrpc: '2.0',
						id: 1,
						method: 'initialize',
					}),
				},
				env,
			)
			expect(res.status).toBe(200)

			const json = (await res.json()) as {
				jsonrpc: string
				id: number
				result: {
					protocolVersion: string
					capabilities: Record<string, unknown>
					serverInfo: { name: string; version: string }
				}
			}

			expect(json.jsonrpc).toBe('2.0')
			expect(json.id).toBe(1)
			expect(json.result).toBeDefined()
			expect(json.result.protocolVersion).toBe('2024-11-05')
			expect(json.result.serverInfo.name).toBe('hare-mcp')
			expect(json.result.serverInfo.version).toBe('1.0.0')
		})

		it('handles tools/list method', async () => {
			const res = await app.request(
				'/api/mcp/ws_test123/rpc',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						jsonrpc: '2.0',
						id: 2,
						method: 'tools/list',
					}),
				},
				env,
			)
			expect(res.status).toBe(200)

			const json = (await res.json()) as {
				jsonrpc: string
				id: number
				result: {
					tools: Array<{ name: string; description: string; inputSchema: unknown }>
				}
			}

			expect(json.jsonrpc).toBe('2.0')
			expect(json.id).toBe(2)
			expect(json.result).toBeDefined()
			expect(json.result.tools).toBeDefined()
			expect(Array.isArray(json.result.tools)).toBe(true)

			// Each tool should have name, description, and inputSchema
			for (const tool of json.result.tools) {
				expect(tool).toHaveProperty('name')
				expect(tool).toHaveProperty('description')
				expect(tool).toHaveProperty('inputSchema')
			}
		})

		it('handles tools/call for non-existent tool', async () => {
			const res = await app.request(
				'/api/mcp/ws_test123/rpc',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						jsonrpc: '2.0',
						id: 3,
						method: 'tools/call',
						params: {
							name: 'nonexistent_tool',
							arguments: {},
						},
					}),
				},
				env,
			)
			expect(res.status).toBe(200)

			const json = (await res.json()) as {
				jsonrpc: string
				id: number
				error: { code: number; message: string }
			}

			expect(json.jsonrpc).toBe('2.0')
			expect(json.id).toBe(3)
			expect(json.error).toBeDefined()
			expect(json.error.code).toBe(-32601)
			expect(json.error.message).toContain('Tool not found')
		})

		it('returns error for unknown method', async () => {
			const res = await app.request(
				'/api/mcp/ws_test123/rpc',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						jsonrpc: '2.0',
						id: 4,
						method: 'unknown/method',
					}),
				},
				env,
			)
			expect(res.status).toBe(200)

			const json = (await res.json()) as {
				jsonrpc: string
				id: number
				error: { code: number; message: string }
			}

			expect(json.jsonrpc).toBe('2.0')
			expect(json.id).toBe(4)
			expect(json.error).toBeDefined()
			expect(json.error.code).toBe(-32601)
			expect(json.error.message).toContain('Method not found')
		})

		it('validates JSON-RPC format', async () => {
			const res = await app.request(
				'/api/mcp/ws_test123/rpc',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						// Missing jsonrpc version
						id: 1,
						method: 'initialize',
					}),
				},
				env,
			)
			// Should return 400 for invalid JSON-RPC format
			expect(res.status).toBe(400)
		})

		it('validates id is required', async () => {
			const res = await app.request(
				'/api/mcp/ws_test123/rpc',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						jsonrpc: '2.0',
						// Missing id
						method: 'initialize',
					}),
				},
				env,
			)
			// Should return 400 for missing id
			expect(res.status).toBe(400)
		})

		it('validates method is required', async () => {
			const res = await app.request(
				'/api/mcp/ws_test123/rpc',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						jsonrpc: '2.0',
						id: 1,
						// Missing method
					}),
				},
				env,
			)
			// Should return 400 for missing method
			expect(res.status).toBe(400)
		})
	})
})
