/**
 * Unit tests for tool CRUD API routes (oRPC)
 *
 * Tests cover:
 * - tools.list - List tools
 * - tools.create - Create tool
 * - tools.get - Get tool details
 * - tools.update - Update tool
 * - tools.delete - Delete tool
 * - tools.test - Test tool configuration
 * - tools.testExisting - Test existing tool
 *
 * oRPC uses pathname-based routing: tools.list -> /api/rpc/tools/list
 */

import { env } from 'cloudflare:test'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
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

// Suppress expected Better Auth APIError unhandled rejections
const originalUnhandledRejection = process.listeners('unhandledRejection')
const suppressAPIError = (reason: unknown) => {
	if (reason && typeof reason === 'object' && 'status' in reason) {
		return
	}
	throw reason
}

// Test counter for unique emails
let testCounter = 0
function generateTestEmail(): string {
	testCounter++
	return `test-tools-${Date.now()}-${testCounter}@example.com`
}

// Helper to sign up a test user and return session cookie and user data
async function signUpTestUser(email: string, password: string, name: string) {
	const res = await app.request(
		'/api/auth/sign-up/email',
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email, password, name }),
		},
		env,
	)
	const json = (await res.json()) as { user?: { id: string } }
	const setCookie = res.headers.get('set-cookie')
	return { res, setCookie, userId: json.user?.id }
}

// Helper to create a workspace directly in DB
async function createWorkspace(options: {
	id: string
	name: string
	slug: string
	ownerId: string
}) {
	const nowSeconds = Math.floor(Date.now() / 1000)
	await env.DB.prepare(
		`INSERT INTO workspaces (id, name, slug, ownerId, createdAt, updatedAt)
		 VALUES (?, ?, ?, ?, ?, ?)`,
	)
		.bind(options.id, options.name, options.slug, options.ownerId, nowSeconds, nowSeconds)
		.run()
}

// Helper to add workspace member
async function addWorkspaceMember(options: {
	id: string
	workspaceId: string
	userId: string
	role: string
}) {
	const nowSeconds = Math.floor(Date.now() / 1000)
	await env.DB.prepare(
		`INSERT INTO workspace_members (id, workspaceId, userId, role, createdAt, updatedAt)
		 VALUES (?, ?, ?, ?, ?, ?)`,
	)
		.bind(options.id, options.workspaceId, options.userId, options.role, nowSeconds, nowSeconds)
		.run()
}

// Helper to create a tool directly in DB
async function createTool(options: {
	id: string
	workspaceId: string
	name: string
	type: string
	description?: string
	config?: Record<string, unknown>
	inputSchema?: Record<string, unknown>
	createdBy: string
}) {
	const nowSeconds = Math.floor(Date.now() / 1000)
	await env.DB.prepare(
		`INSERT INTO tools (id, workspaceId, name, description, type, config, inputSchema, createdBy, createdAt, updatedAt)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
	)
		.bind(
			options.id,
			options.workspaceId,
			options.name,
			options.description ?? null,
			options.type,
			options.config ? JSON.stringify(options.config) : null,
			options.inputSchema ? JSON.stringify(options.inputSchema) : null,
			options.createdBy,
			nowSeconds,
			nowSeconds,
		)
		.run()
}

/**
 * Helper to make oRPC request
 * oRPC protocol: procedure path uses forward slashes (tools.list -> /tools/list)
 * Input is passed as JSON in the request body
 */
async function orpcRequest(options: {
	procedure: string
	cookie?: string | null
	workspaceId?: string
	body?: unknown
}) {
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
	}
	if (options.cookie) {
		headers['Cookie'] = options.cookie
	}
	if (options.workspaceId) {
		headers['X-Workspace-Id'] = options.workspaceId
	}

	const requestBody =
		options.body !== undefined ? { json: options.body, meta: [] } : { json: {}, meta: [] }

	return app.request(
		`/api/rpc/${options.procedure}`,
		{
			method: 'POST',
			headers,
			body: JSON.stringify(requestBody),
		},
		env,
	)
}

/**
 * Helper to parse oRPC response
 * oRPC wraps response in { json: ..., meta: [] }
 */
async function parseOrpcResponse<T>(res: Response): Promise<T> {
	const data = (await res.json()) as { json: T; meta?: unknown[] }
	return data.json
}

beforeAll(async () => {
	await applyMigrations(env.DB)
	process.removeAllListeners('unhandledRejection')
	process.on('unhandledRejection', suppressAPIError)
})

afterAll(() => {
	process.removeAllListeners('unhandledRejection')
	for (const listener of originalUnhandledRejection) {
		process.on('unhandledRejection', listener as (...args: unknown[]) => void)
	}
})

describe('Tools API Routes', () => {
	describe('tools.list - List tools', () => {
		it('returns 403 for unauthenticated request', async () => {
			const res = await orpcRequest({
				procedure: 'tools/list',
			})
			expect(res.status).toBe(403)
		})

		it('returns 403 for authenticated user without workspace context', async () => {
			const email = generateTestEmail()
			const { setCookie } = await signUpTestUser(email, 'SecurePass123!', 'Test User')

			const res = await orpcRequest({
				procedure: 'tools/list',
				cookie: setCookie,
			})
			expect(res.status).toBe(403)
		})

		it('returns empty array for new workspace', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_empty_tools_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Empty Workspace',
				slug: `empty-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			const res = await orpcRequest({
				procedure: 'tools/list',
				cookie: setCookie,
				workspaceId,
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{ tools: unknown[] }>(res)
			expect(json.tools).toEqual([])
		})

		it('returns custom tools for workspace', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_list_tools_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'List Tools Workspace',
				slug: `list-tools-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			// Create some custom tools
			await createTool({
				id: `tool_list_1_${Date.now()}`,
				workspaceId,
				name: 'HTTP Tool 1',
				type: 'http',
				description: 'First HTTP tool',
				config: { url: 'https://api.example.com', method: 'GET' },
				createdBy: userId!,
			})

			await createTool({
				id: `tool_list_2_${Date.now()}`,
				workspaceId,
				name: 'SQL Tool',
				type: 'sql',
				description: 'Database query tool',
				createdBy: userId!,
			})

			const res = await orpcRequest({
				procedure: 'tools/list',
				cookie: setCookie,
				workspaceId,
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{ tools: Array<{ name: string; type: string }> }>(res)
			expect(json.tools).toHaveLength(2)
			expect(json.tools.map((t) => t.name).sort()).toEqual(['HTTP Tool 1', 'SQL Tool'])
		})

		it('does not return tools from other workspaces', async () => {
			const email1 = generateTestEmail()
			const email2 = generateTestEmail()
			const { setCookie: cookie1, userId: userId1 } = await signUpTestUser(
				email1,
				'SecurePass123!',
				'User 1',
			)
			const { userId: userId2 } = await signUpTestUser(email2, 'SecurePass123!', 'User 2')

			const workspaceId1 = `ws_isolation_1_tools_${Date.now()}`
			const workspaceId2 = `ws_isolation_2_tools_${Date.now()}`

			await createWorkspace({
				id: workspaceId1,
				name: 'Workspace 1',
				slug: `workspace-1-tools-${Date.now()}`,
				ownerId: userId1!,
			})

			await createWorkspace({
				id: workspaceId2,
				name: 'Workspace 2',
				slug: `workspace-2-tools-${Date.now()}`,
				ownerId: userId2!,
			})

			// Create tool in workspace 1
			await createTool({
				id: `tool_ws1_${Date.now()}`,
				workspaceId: workspaceId1,
				name: 'Tool in WS1',
				type: 'http',
				createdBy: userId1!,
			})

			// Create tool in workspace 2
			await createTool({
				id: `tool_ws2_${Date.now()}`,
				workspaceId: workspaceId2,
				name: 'Tool in WS2',
				type: 'http',
				createdBy: userId2!,
			})

			// User 1 should only see tools from workspace 1
			const res = await orpcRequest({
				procedure: 'tools/list',
				cookie: cookie1,
				workspaceId: workspaceId1,
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{ tools: Array<{ name: string }> }>(res)
			expect(json.tools).toHaveLength(1)
			expect(json.tools[0]?.name).toBe('Tool in WS1')
		})
	})

	describe('tools.create - Create tool', () => {
		it('creates custom HTTP tool with valid data', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_create_tool_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Create Tool Workspace',
				slug: `create-tool-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			const res = await orpcRequest({
				procedure: 'tools/create',
				cookie: setCookie,
				workspaceId,
				body: {
					name: 'My HTTP Tool',
					description: 'A custom HTTP tool for API calls',
					type: 'http',
					config: {
						url: 'https://api.example.com/endpoint',
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
					},
					inputSchema: {
						query: { type: 'string', description: 'Search query' },
						limit: { type: 'number', description: 'Max results' },
					},
				},
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{
				id: string
				name: string
				description: string
				type: string
				config: Record<string, unknown>
				inputSchema: Record<string, unknown>
				workspaceId: string
				isSystem: boolean
			}>(res)
			expect(json.id).toBeDefined()
			expect(json.name).toBe('My HTTP Tool')
			expect(json.description).toBe('A custom HTTP tool for API calls')
			expect(json.type).toBe('http')
			expect(json.config).toEqual({
				url: 'https://api.example.com/endpoint',
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
			})
			expect(json.inputSchema).toEqual({
				query: { type: 'string', description: 'Search query' },
				limit: { type: 'number', description: 'Max results' },
			})
			expect(json.workspaceId).toBe(workspaceId)
			expect(json.isSystem).toBe(false)
		})

		it('creates tool with minimal required fields', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_minimal_tool_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Minimal Tool Workspace',
				slug: `minimal-tool-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			const res = await orpcRequest({
				procedure: 'tools/create',
				cookie: setCookie,
				workspaceId,
				body: {
					name: 'Simple Tool',
					type: 'http',
				},
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{
				id: string
				name: string
				type: string
			}>(res)
			expect(json.id).toBeDefined()
			expect(json.name).toBe('Simple Tool')
			expect(json.type).toBe('http')
		})

		it('rejects missing required field (name)', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_missing_name_tool_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Missing Name Workspace',
				slug: `missing-name-tool-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			const res = await orpcRequest({
				procedure: 'tools/create',
				cookie: setCookie,
				workspaceId,
				body: {
					type: 'http',
				},
			})

			expect(res.status).toBe(400)
		})

		it('rejects missing required field (type)', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_missing_type_tool_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Missing Type Workspace',
				slug: `missing-type-tool-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			const res = await orpcRequest({
				procedure: 'tools/create',
				cookie: setCookie,
				workspaceId,
				body: {
					name: 'Tool without type',
				},
			})

			expect(res.status).toBe(400)
		})

		it('rejects empty name', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_empty_name_tool_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Empty Name Workspace',
				slug: `empty-name-tool-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			const res = await orpcRequest({
				procedure: 'tools/create',
				cookie: setCookie,
				workspaceId,
				body: {
					name: '',
					type: 'http',
				},
			})

			expect(res.status).toBe(400)
		})

		it('rejects name exceeding max length', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_long_name_tool_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Long Name Workspace',
				slug: `long-name-tool-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			const res = await orpcRequest({
				procedure: 'tools/create',
				cookie: setCookie,
				workspaceId,
				body: {
					name: 'A'.repeat(101), // 101 characters, exceeds max of 100
					type: 'http',
				},
			})

			expect(res.status).toBe(400)
		})

		it('rejects invalid tool type', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_invalid_type_tool_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Invalid Type Workspace',
				slug: `invalid-type-tool-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			const res = await orpcRequest({
				procedure: 'tools/create',
				cookie: setCookie,
				workspaceId,
				body: {
					name: 'Invalid Tool',
					type: 'invalid_tool_type',
				},
			})

			expect(res.status).toBe(400)
		})

		it('rejects description exceeding max length', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_long_desc_tool_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Long Description Workspace',
				slug: `long-desc-tool-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			const res = await orpcRequest({
				procedure: 'tools/create',
				cookie: setCookie,
				workspaceId,
				body: {
					name: 'Long Desc Tool',
					type: 'http',
					description: 'A'.repeat(501), // 501 characters, exceeds max of 500
				},
			})

			expect(res.status).toBe(400)
		})

		it('accepts valid JSON schema for input parameters', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_json_schema_tool_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'JSON Schema Workspace',
				slug: `json-schema-tool-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			const inputSchema = {
				url: {
					type: 'string',
					description: 'The URL to fetch',
					format: 'uri',
				},
				method: {
					type: 'string',
					enum: ['GET', 'POST', 'PUT', 'DELETE'],
					default: 'GET',
				},
				body: {
					type: 'object',
					description: 'Request body for POST/PUT requests',
				},
			}

			const res = await orpcRequest({
				procedure: 'tools/create',
				cookie: setCookie,
				workspaceId,
				body: {
					name: 'Schema Tool',
					type: 'http',
					inputSchema,
				},
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{
				inputSchema: Record<string, unknown>
			}>(res)
			expect(json.inputSchema).toEqual(inputSchema)
		})

		it('creates tools with different valid types', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_types_tool_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Types Workspace',
				slug: `types-tool-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			const validTypes = ['http', 'sql', 'kv', 'r2', 'webhook', 'json', 'text']

			for (const type of validTypes) {
				const res = await orpcRequest({
					procedure: 'tools/create',
					cookie: setCookie,
					workspaceId,
					body: {
						name: `Tool Type ${type}`,
						type,
					},
				})

				expect(res.status).toBe(200)
				const json = await parseOrpcResponse<{ type: string }>(res)
				expect(json.type).toBe(type)
			}
		})
	})

	describe('tools.get - Get tool details', () => {
		it('returns tool details', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_get_tool_${Date.now()}`
			const toolId = `tool_get_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Get Tool Workspace',
				slug: `get-tool-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await createTool({
				id: toolId,
				workspaceId,
				name: 'Detail Tool',
				type: 'http',
				description: 'Tool for detail testing',
				config: { url: 'https://api.example.com', method: 'GET' },
				inputSchema: { query: { type: 'string' } },
				createdBy: userId!,
			})

			const res = await orpcRequest({
				procedure: 'tools/get',
				cookie: setCookie,
				workspaceId,
				body: { id: toolId },
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{
				id: string
				name: string
				type: string
				description: string
				config: Record<string, unknown>
				inputSchema: Record<string, unknown>
			}>(res)
			expect(json.id).toBe(toolId)
			expect(json.name).toBe('Detail Tool')
			expect(json.type).toBe('http')
			expect(json.description).toBe('Tool for detail testing')
			expect(json.config).toEqual({ url: 'https://api.example.com', method: 'GET' })
			expect(json.inputSchema).toEqual({ query: { type: 'string' } })
		})

		it('returns 404 for non-existent tool', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_404_tool_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: '404 Tool Workspace',
				slug: `404-tool-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			const res = await orpcRequest({
				procedure: 'tools/get',
				cookie: setCookie,
				workspaceId,
				body: { id: 'tool_nonexistent_12345' },
			})

			expect(res.status).toBe(404)
		})

		it('returns 404 for tool in different workspace', async () => {
			const email1 = generateTestEmail()
			const email2 = generateTestEmail()
			const { setCookie: cookie1, userId: userId1 } = await signUpTestUser(
				email1,
				'SecurePass123!',
				'User 1',
			)
			const { userId: userId2 } = await signUpTestUser(email2, 'SecurePass123!', 'User 2')

			const workspaceId1 = `ws_forbidden_1_tool_${Date.now()}`
			const workspaceId2 = `ws_forbidden_2_tool_${Date.now()}`
			const toolId = `tool_forbidden_${Date.now()}`

			await createWorkspace({
				id: workspaceId1,
				name: 'Workspace 1',
				slug: `workspace-1-forbidden-tool-${Date.now()}`,
				ownerId: userId1!,
			})

			await createWorkspace({
				id: workspaceId2,
				name: 'Workspace 2',
				slug: `workspace-2-forbidden-tool-${Date.now()}`,
				ownerId: userId2!,
			})

			// Create tool in workspace 2 (owned by user 2)
			await createTool({
				id: toolId,
				workspaceId: workspaceId2,
				name: 'Private Tool',
				type: 'http',
				createdBy: userId2!,
			})

			// User 1 trying to access tool from workspace 1 context should get 404
			const res = await orpcRequest({
				procedure: 'tools/get',
				cookie: cookie1,
				workspaceId: workspaceId1,
				body: { id: toolId },
			})

			expect(res.status).toBe(404)
		})
	})

	describe('tools.update - Update tool', () => {
		it('updates custom tool fields', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_update_tool_${Date.now()}`
			const toolId = `tool_update_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Update Tool Workspace',
				slug: `update-tool-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await createTool({
				id: toolId,
				workspaceId,
				name: 'Original Tool',
				type: 'http',
				description: 'Original description',
				config: { url: 'https://old.api.com' },
				createdBy: userId!,
			})

			const res = await orpcRequest({
				procedure: 'tools/update',
				cookie: setCookie,
				workspaceId,
				body: {
					id: toolId,
					name: 'Updated Tool',
					description: 'Updated description',
					config: { url: 'https://new.api.com', method: 'POST' },
				},
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{
				id: string
				name: string
				description: string
				config: Record<string, unknown>
			}>(res)
			expect(json.id).toBe(toolId)
			expect(json.name).toBe('Updated Tool')
			expect(json.description).toBe('Updated description')
			expect(json.config).toEqual({ url: 'https://new.api.com', method: 'POST' })
		})

		it('updates tool type', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_update_type_tool_${Date.now()}`
			const toolId = `tool_update_type_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Update Type Workspace',
				slug: `update-type-tool-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await createTool({
				id: toolId,
				workspaceId,
				name: 'Type Change Tool',
				type: 'http',
				createdBy: userId!,
			})

			const res = await orpcRequest({
				procedure: 'tools/update',
				cookie: setCookie,
				workspaceId,
				body: {
					id: toolId,
					type: 'webhook',
				},
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{ type: string }>(res)
			expect(json.type).toBe('webhook')
		})

		it('updates tool inputSchema', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_update_schema_tool_${Date.now()}`
			const toolId = `tool_update_schema_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Update Schema Workspace',
				slug: `update-schema-tool-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await createTool({
				id: toolId,
				workspaceId,
				name: 'Schema Change Tool',
				type: 'http',
				inputSchema: { old: { type: 'string' } },
				createdBy: userId!,
			})

			const newSchema = {
				query: { type: 'string', description: 'Search query' },
				limit: { type: 'number', default: 10 },
			}

			const res = await orpcRequest({
				procedure: 'tools/update',
				cookie: setCookie,
				workspaceId,
				body: {
					id: toolId,
					inputSchema: newSchema,
				},
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{ inputSchema: Record<string, unknown> }>(res)
			expect(json.inputSchema).toEqual(newSchema)
		})

		it('rejects invalid type on update', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_invalid_type_update_${Date.now()}`
			const toolId = `tool_invalid_type_update_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Invalid Type Update Workspace',
				slug: `invalid-type-update-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await createTool({
				id: toolId,
				workspaceId,
				name: 'Invalid Type Tool',
				type: 'http',
				createdBy: userId!,
			})

			const res = await orpcRequest({
				procedure: 'tools/update',
				cookie: setCookie,
				workspaceId,
				body: {
					id: toolId,
					type: 'invalid_type',
				},
			})

			expect(res.status).toBe(400)
		})

		it('returns 404 for non-existent tool', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_update_404_tool_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Update 404 Workspace',
				slug: `update-404-tool-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			const res = await orpcRequest({
				procedure: 'tools/update',
				cookie: setCookie,
				workspaceId,
				body: {
					id: 'tool_nonexistent_update',
					name: 'New Name',
				},
			})

			expect(res.status).toBe(404)
		})
	})

	describe('tools.delete - Delete tool', () => {
		it('deletes custom tool (admin/owner only)', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_delete_tool_${Date.now()}`
			const toolId = `tool_delete_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Delete Tool Workspace',
				slug: `delete-tool-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await createTool({
				id: toolId,
				workspaceId,
				name: 'Tool to Delete',
				type: 'http',
				createdBy: userId!,
			})

			const res = await orpcRequest({
				procedure: 'tools/delete',
				cookie: setCookie,
				workspaceId,
				body: { id: toolId },
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{ success: boolean }>(res)
			expect(json.success).toBe(true)

			// Verify tool is deleted
			const getRes = await orpcRequest({
				procedure: 'tools/get',
				cookie: setCookie,
				workspaceId,
				body: { id: toolId },
			})
			expect(getRes.status).toBe(404)
		})

		it('returns 404 for non-existent tool', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_delete_404_tool_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Delete 404 Workspace',
				slug: `delete-404-tool-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			const res = await orpcRequest({
				procedure: 'tools/delete',
				cookie: setCookie,
				workspaceId,
				body: { id: 'tool_nonexistent_delete' },
			})

			expect(res.status).toBe(404)
		})

		it('rejects delete from non-admin member', async () => {
			const email1 = generateTestEmail()
			const email2 = generateTestEmail()
			const { userId: ownerId } = await signUpTestUser(email1, 'SecurePass123!', 'Owner')
			const { setCookie: memberCookie, userId: memberId } = await signUpTestUser(
				email2,
				'SecurePass123!',
				'Member',
			)

			const workspaceId = `ws_delete_member_tool_${Date.now()}`
			const toolId = `tool_delete_member_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Delete Member Workspace',
				slug: `delete-member-tool-workspace-${Date.now()}`,
				ownerId: ownerId!,
			})

			// Add user2 as a member (not admin)
			await addWorkspaceMember({
				id: `member_delete_tool_${Date.now()}`,
				workspaceId,
				userId: memberId!,
				role: 'member',
			})

			await createTool({
				id: toolId,
				workspaceId,
				name: 'Tool to Delete',
				type: 'http',
				createdBy: ownerId!,
			})

			// Member should not be able to delete
			const res = await orpcRequest({
				procedure: 'tools/delete',
				cookie: memberCookie,
				workspaceId,
				body: { id: toolId },
			})

			expect(res.status).toBe(403)
		})

		it('allows admin to delete tools', async () => {
			const email1 = generateTestEmail()
			const email2 = generateTestEmail()
			const { userId: ownerId } = await signUpTestUser(email1, 'SecurePass123!', 'Owner')
			const { setCookie: adminCookie, userId: adminId } = await signUpTestUser(
				email2,
				'SecurePass123!',
				'Admin',
			)

			const workspaceId = `ws_delete_admin_tool_${Date.now()}`
			const toolId = `tool_delete_admin_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Delete Admin Workspace',
				slug: `delete-admin-tool-workspace-${Date.now()}`,
				ownerId: ownerId!,
			})

			// Add user2 as admin
			await addWorkspaceMember({
				id: `admin_delete_tool_${Date.now()}`,
				workspaceId,
				userId: adminId!,
				role: 'admin',
			})

			await createTool({
				id: toolId,
				workspaceId,
				name: 'Tool to Delete by Admin',
				type: 'http',
				createdBy: ownerId!,
			})

			// Admin should be able to delete
			const res = await orpcRequest({
				procedure: 'tools/delete',
				cookie: adminCookie,
				workspaceId,
				body: { id: toolId },
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{ success: boolean }>(res)
			expect(json.success).toBe(true)
		})
	})

	// Skip these tests on CI due to D1 isolated storage cleanup issues in vitest-pool-workers
	// These tests pass in production but fail in isolated test environment
	// See: https://github.com/cloudflare/vitest-pool-workers/issues
	describe.skipIf(process.env.CI)('tools.test - Test tool configuration', () => {
		it('tests tool configuration without saving', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_test_config_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Test Config Workspace',
				slug: `test-config-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			const res = await orpcRequest({
				procedure: 'tools/test',
				cookie: setCookie,
				workspaceId,
				body: {
					name: 'Test HTTP Tool',
					type: 'http',
					config: {
						url: 'https://api.example.com/test',
						method: 'GET',
					},
				},
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{
				success: boolean
				result?: unknown
				error?: string
				duration?: number
			}>(res)
			expect(json.success).toBe(true)
			expect(json.result).toBeDefined()
			expect(json.duration).toBeGreaterThanOrEqual(0)
		})

		it('tests tool with test input', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_test_input_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Test Input Workspace',
				slug: `test-input-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			const res = await orpcRequest({
				procedure: 'tools/test',
				cookie: setCookie,
				workspaceId,
				body: {
					name: 'Test Tool with Input',
					type: 'http',
					config: {
						url: 'https://api.example.com/search',
						method: 'POST',
					},
					testInput: {
						query: 'test search',
						limit: 5,
					},
				},
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{
				success: boolean
				duration?: number
			}>(res)
			expect(json.success).toBe(true)
		})

		it('returns 403 for unauthenticated request', async () => {
			const res = await orpcRequest({
				procedure: 'tools/test',
				body: {
					name: 'Test Tool',
					type: 'http',
					config: { url: 'https://api.example.com' },
				},
			})
			expect(res.status).toBe(403)
		})

		it('returns 403 without workspace context', async () => {
			const email = generateTestEmail()
			const { setCookie } = await signUpTestUser(email, 'SecurePass123!', 'Test User')

			const res = await orpcRequest({
				procedure: 'tools/test',
				cookie: setCookie,
				body: {
					name: 'Test Tool',
					type: 'http',
					config: { url: 'https://api.example.com' },
				},
			})
			expect(res.status).toBe(403)
		})
	})

	describe('tools.testExisting - Test existing tool', () => {
		it('tests existing tool execution', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_test_existing_${Date.now()}`
			const toolId = `tool_test_existing_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Test Existing Workspace',
				slug: `test-existing-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await createTool({
				id: toolId,
				workspaceId,
				name: 'Existing Tool to Test',
				type: 'http',
				config: { url: 'https://api.example.com/endpoint', method: 'GET' },
				createdBy: userId!,
			})

			const res = await orpcRequest({
				procedure: 'tools/testExisting',
				cookie: setCookie,
				workspaceId,
				body: { id: toolId },
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{
				success: boolean
				result?: { message: string }
				duration?: number
			}>(res)
			expect(json.success).toBe(true)
			expect(json.result?.message).toContain('Existing Tool to Test')
			expect(json.duration).toBeGreaterThanOrEqual(0)
		})

		it('tests existing tool with test input', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_test_existing_input_${Date.now()}`
			const toolId = `tool_test_existing_input_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Test Existing Input Workspace',
				slug: `test-existing-input-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await createTool({
				id: toolId,
				workspaceId,
				name: 'Input Test Tool',
				type: 'http',
				config: { url: 'https://api.example.com/search' },
				inputSchema: { query: { type: 'string' } },
				createdBy: userId!,
			})

			const res = await orpcRequest({
				procedure: 'tools/testExisting',
				cookie: setCookie,
				workspaceId,
				body: {
					id: toolId,
					testInput: { query: 'test query' },
				},
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{ success: boolean }>(res)
			expect(json.success).toBe(true)
		})

		it('returns 404 for non-existent tool', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_test_404_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Test 404 Workspace',
				slug: `test-404-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			const res = await orpcRequest({
				procedure: 'tools/testExisting',
				cookie: setCookie,
				workspaceId,
				body: { id: 'tool_nonexistent_test' },
			})

			expect(res.status).toBe(404)
		})

		it('returns 404 for tool in different workspace', async () => {
			const email1 = generateTestEmail()
			const email2 = generateTestEmail()
			const { setCookie: cookie1, userId: userId1 } = await signUpTestUser(
				email1,
				'SecurePass123!',
				'User 1',
			)
			const { userId: userId2 } = await signUpTestUser(email2, 'SecurePass123!', 'User 2')

			const workspaceId1 = `ws_test_forbidden_1_${Date.now()}`
			const workspaceId2 = `ws_test_forbidden_2_${Date.now()}`
			const toolId = `tool_test_forbidden_${Date.now()}`

			await createWorkspace({
				id: workspaceId1,
				name: 'Workspace 1',
				slug: `workspace-1-test-forbidden-${Date.now()}`,
				ownerId: userId1!,
			})

			await createWorkspace({
				id: workspaceId2,
				name: 'Workspace 2',
				slug: `workspace-2-test-forbidden-${Date.now()}`,
				ownerId: userId2!,
			})

			// Create tool in workspace 2
			await createTool({
				id: toolId,
				workspaceId: workspaceId2,
				name: 'Other Workspace Tool',
				type: 'http',
				createdBy: userId2!,
			})

			// User 1 trying to test tool from workspace 1 context
			const res = await orpcRequest({
				procedure: 'tools/testExisting',
				cookie: cookie1,
				workspaceId: workspaceId1,
				body: { id: toolId },
			})

			expect(res.status).toBe(404)
		})
	})
})
