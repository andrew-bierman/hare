/**
 * Unit tests for agent CRUD API routes (oRPC)
 *
 * Tests cover:
 * - agents.list - List agents
 * - agents.create - Create agent
 * - agents.get - Get agent details
 * - agents.update - Update agent
 * - agents.delete - Delete agent
 * - agents.deploy - Deploy agent
 *
 * oRPC uses pathname-based routing: agents.list -> /api/rpc/agents/list
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

// Valid model ID for testing
const VALID_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast'

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
	return `test-agent-${Date.now()}-${testCounter}@example.com`
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
	// Drizzle mode: 'timestamp' stores Unix timestamp in seconds
	// new Date(seconds * 1000) is used to read back
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

// Helper to create an agent directly in DB
async function createAgent(options: {
	id: string
	workspaceId: string
	name: string
	model: string
	instructions: string
	status?: string
	createdBy: string
}) {
	const nowSeconds = Math.floor(Date.now() / 1000)
	await env.DB.prepare(
		`INSERT INTO agents (id, workspaceId, name, model, instructions, status, systemToolsEnabled, createdBy, createdAt, updatedAt)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
	)
		.bind(
			options.id,
			options.workspaceId,
			options.name,
			options.model,
			options.instructions,
			options.status ?? 'draft',
			1, // systemToolsEnabled = true
			options.createdBy,
			nowSeconds,
			nowSeconds,
		)
		.run()
}

/**
 * Helper to make oRPC request
 * oRPC protocol: procedure path uses forward slashes (agents.list -> /agents/list)
 * Input is passed as JSON in the request body
 */
async function orpcRequest(options: {
	procedure: string // e.g., "agents/list", "agents/get"
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

	// oRPC expects input wrapped in { json: ..., meta: [] }
	const requestBody =
		options.body !== undefined ? { json: options.body, meta: [] } : { json: {}, meta: [] }

	return app.request(
		`/api/rpc/${options.procedure}`,
		{
			method: 'POST', // oRPC uses POST by default
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

describe('Agent API Routes', () => {
	describe('agents.list - List agents', () => {
		it('returns 401 for unauthenticated request', async () => {
			const res = await orpcRequest({
				procedure: 'agents/list',
			})
			expect(res.status).toBe(401)
		})

		it('returns 403 for authenticated user without workspace context', async () => {
			const email = generateTestEmail()
			const { setCookie } = await signUpTestUser(email, 'SecurePass123!', 'Test User')

			const res = await orpcRequest({
				procedure: 'agents/list',
				cookie: setCookie,
			})
			expect(res.status).toBe(403)
		})

		it('returns empty array for new user with workspace', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_empty_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Empty Workspace',
				slug: `empty-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			const res = await orpcRequest({
				procedure: 'agents/list',
				cookie: setCookie,
				workspaceId,
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{ agents: unknown[] }>(res)
			expect(json.agents).toEqual([])
		})

		it("returns list of user's agents", async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_list_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'List Workspace',
				slug: `list-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			// Create some agents
			await createAgent({
				id: `agent_list_1_${Date.now()}`,
				workspaceId,
				name: 'Agent 1',
				model: VALID_MODEL,
				instructions: 'You are agent 1',
				createdBy: userId!,
			})

			await createAgent({
				id: `agent_list_2_${Date.now()}`,
				workspaceId,
				name: 'Agent 2',
				model: VALID_MODEL,
				instructions: 'You are agent 2',
				createdBy: userId!,
			})

			const res = await orpcRequest({
				procedure: 'agents/list',
				cookie: setCookie,
				workspaceId,
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{ agents: Array<{ name: string }> }>(res)
			expect(json.agents).toHaveLength(2)
			expect(json.agents.map((a) => a.name).sort()).toEqual(['Agent 1', 'Agent 2'])
		})

		it('does not return agents from other workspaces', async () => {
			const email1 = generateTestEmail()
			const email2 = generateTestEmail()
			const { setCookie: cookie1, userId: userId1 } = await signUpTestUser(
				email1,
				'SecurePass123!',
				'User 1',
			)
			const { userId: userId2 } = await signUpTestUser(email2, 'SecurePass123!', 'User 2')

			const workspaceId1 = `ws_isolation_1_${Date.now()}`
			const workspaceId2 = `ws_isolation_2_${Date.now()}`

			await createWorkspace({
				id: workspaceId1,
				name: 'Workspace 1',
				slug: `workspace-1-${Date.now()}`,
				ownerId: userId1!,
			})

			await createWorkspace({
				id: workspaceId2,
				name: 'Workspace 2',
				slug: `workspace-2-${Date.now()}`,
				ownerId: userId2!,
			})

			// Create agent in workspace 1
			await createAgent({
				id: `agent_ws1_${Date.now()}`,
				workspaceId: workspaceId1,
				name: 'Agent in WS1',
				model: VALID_MODEL,
				instructions: 'You are in workspace 1',
				createdBy: userId1!,
			})

			// Create agent in workspace 2
			await createAgent({
				id: `agent_ws2_${Date.now()}`,
				workspaceId: workspaceId2,
				name: 'Agent in WS2',
				model: VALID_MODEL,
				instructions: 'You are in workspace 2',
				createdBy: userId2!,
			})

			// User 1 should only see agents from workspace 1
			const res = await orpcRequest({
				procedure: 'agents/list',
				cookie: cookie1,
				workspaceId: workspaceId1,
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{ agents: Array<{ name: string }> }>(res)
			expect(json.agents).toHaveLength(1)
			expect(json.agents[0]?.name).toBe('Agent in WS1')
		})
	})

	describe('agents.create - Create agent', () => {
		it('creates agent with valid data', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_create_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Create Workspace',
				slug: `create-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			const res = await orpcRequest({
				procedure: 'agents/create',
				cookie: setCookie,
				workspaceId,
				body: {
					name: 'New Test Agent',
					model: VALID_MODEL,
					instructions: 'You are a helpful test assistant.',
					description: 'A test agent for unit testing',
				},
			})

			// oRPC returns 200 for successful responses regardless of successStatus config
			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{
				id: string
				name: string
				model: string
				instructions: string
				description: string
				status: string
				workspaceId: string
			}>(res)
			expect(json.id).toBeDefined()
			expect(json.name).toBe('New Test Agent')
			expect(json.model).toBe(VALID_MODEL)
			expect(json.instructions).toBe('You are a helpful test assistant.')
			expect(json.description).toBe('A test agent for unit testing')
			expect(json.status).toBe('draft')
			expect(json.workspaceId).toBe(workspaceId)
		})

		it('rejects invalid model selection', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_invalid_model_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Invalid Model Workspace',
				slug: `invalid-model-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			const res = await orpcRequest({
				procedure: 'agents/create',
				cookie: setCookie,
				workspaceId,
				body: {
					name: 'Agent with Invalid Model',
					model: 'invalid-model-that-does-not-exist',
					instructions: 'Test instructions',
				},
			})

			expect(res.status).toBe(400)
		})

		it('rejects missing required fields (name)', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_missing_name_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Missing Name Workspace',
				slug: `missing-name-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			const res = await orpcRequest({
				procedure: 'agents/create',
				cookie: setCookie,
				workspaceId,
				body: {
					model: VALID_MODEL,
					instructions: 'Test instructions',
				},
			})

			expect(res.status).toBe(400)
		})

		it('rejects missing required fields (model)', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_missing_model_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Missing Model Workspace',
				slug: `missing-model-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			const res = await orpcRequest({
				procedure: 'agents/create',
				cookie: setCookie,
				workspaceId,
				body: {
					name: 'Agent without model',
					instructions: 'Test instructions',
				},
			})

			expect(res.status).toBe(400)
		})

		it('rejects missing required fields (instructions)', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_missing_instructions_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Missing Instructions Workspace',
				slug: `missing-instructions-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			const res = await orpcRequest({
				procedure: 'agents/create',
				cookie: setCookie,
				workspaceId,
				body: {
					name: 'Agent without instructions',
					model: VALID_MODEL,
				},
			})

			expect(res.status).toBe(400)
		})

		it('rejects empty name', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_empty_name_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Empty Name Workspace',
				slug: `empty-name-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			const res = await orpcRequest({
				procedure: 'agents/create',
				cookie: setCookie,
				workspaceId,
				body: {
					name: '',
					model: VALID_MODEL,
					instructions: 'Test instructions',
				},
			})

			expect(res.status).toBe(400)
		})
	})

	describe('agents.get - Get agent details', () => {
		it('returns agent details', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_details_${Date.now()}`
			const agentId = `agent_details_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Details Workspace',
				slug: `details-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await createAgent({
				id: agentId,
				workspaceId,
				name: 'Detail Agent',
				model: VALID_MODEL,
				instructions: 'Detailed instructions',
				createdBy: userId!,
			})

			const res = await orpcRequest({
				procedure: 'agents/get',
				cookie: setCookie,
				workspaceId,
				body: { id: agentId },
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{
				id: string
				name: string
				model: string
				instructions: string
			}>(res)
			expect(json.id).toBe(agentId)
			expect(json.name).toBe('Detail Agent')
			expect(json.model).toBe(VALID_MODEL)
			expect(json.instructions).toBe('Detailed instructions')
		})

		it('returns 404 for non-existent agent', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_404_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: '404 Workspace',
				slug: `404-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			const res = await orpcRequest({
				procedure: 'agents/get',
				cookie: setCookie,
				workspaceId,
				body: { id: 'agent_nonexistent_12345' },
			})

			expect(res.status).toBe(404)
		})

		it('returns 404 for agent in different workspace (403 equivalent)', async () => {
			const email1 = generateTestEmail()
			const email2 = generateTestEmail()
			const { setCookie: cookie1, userId: userId1 } = await signUpTestUser(
				email1,
				'SecurePass123!',
				'User 1',
			)
			const { userId: userId2 } = await signUpTestUser(email2, 'SecurePass123!', 'User 2')

			const workspaceId1 = `ws_forbidden_1_${Date.now()}`
			const workspaceId2 = `ws_forbidden_2_${Date.now()}`
			const agentId = `agent_forbidden_${Date.now()}`

			await createWorkspace({
				id: workspaceId1,
				name: 'Workspace 1',
				slug: `workspace-1-forbidden-${Date.now()}`,
				ownerId: userId1!,
			})

			await createWorkspace({
				id: workspaceId2,
				name: 'Workspace 2',
				slug: `workspace-2-forbidden-${Date.now()}`,
				ownerId: userId2!,
			})

			// Create agent in workspace 2 (owned by user 2)
			await createAgent({
				id: agentId,
				workspaceId: workspaceId2,
				name: 'Private Agent',
				model: VALID_MODEL,
				instructions: 'Private instructions',
				createdBy: userId2!,
			})

			// User 1 trying to access agent from workspace 1 context should get 404
			// (agent is in workspace 2, not workspace 1)
			const res = await orpcRequest({
				procedure: 'agents/get',
				cookie: cookie1,
				workspaceId: workspaceId1,
				body: { id: agentId },
			})

			// The agent is not found in workspace 1 context (it's in workspace 2)
			expect(res.status).toBe(404)
		})
	})

	describe('agents.update - Update agent', () => {
		it('updates agent fields', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_update_${Date.now()}`
			const agentId = `agent_update_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Update Workspace',
				slug: `update-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await createAgent({
				id: agentId,
				workspaceId,
				name: 'Original Name',
				model: VALID_MODEL,
				instructions: 'Original instructions',
				createdBy: userId!,
			})

			const res = await orpcRequest({
				procedure: 'agents/update',
				cookie: setCookie,
				workspaceId,
				body: {
					id: agentId,
					name: 'Updated Name',
					description: 'New description',
					instructions: 'Updated instructions',
				},
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{
				id: string
				name: string
				description: string
				instructions: string
			}>(res)
			expect(json.id).toBe(agentId)
			expect(json.name).toBe('Updated Name')
			expect(json.description).toBe('New description')
			expect(json.instructions).toBe('Updated instructions')
		})

		it('validates model on update', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_update_model_${Date.now()}`
			const agentId = `agent_update_model_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Update Model Workspace',
				slug: `update-model-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await createAgent({
				id: agentId,
				workspaceId,
				name: 'Model Test Agent',
				model: VALID_MODEL,
				instructions: 'Test instructions',
				createdBy: userId!,
			})

			const res = await orpcRequest({
				procedure: 'agents/update',
				cookie: setCookie,
				workspaceId,
				body: {
					id: agentId,
					model: 'invalid-model-id',
				},
			})

			expect(res.status).toBe(400)
		})

		it('returns 404 for non-existent agent', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_update_404_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Update 404 Workspace',
				slug: `update-404-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			const res = await orpcRequest({
				procedure: 'agents/update',
				cookie: setCookie,
				workspaceId,
				body: {
					id: 'agent_nonexistent_update',
					name: 'New Name',
				},
			})

			expect(res.status).toBe(404)
		})
	})

	describe('agents.delete - Delete agent', () => {
		it('deletes agent (admin/owner only)', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_delete_${Date.now()}`
			const agentId = `agent_delete_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Delete Workspace',
				slug: `delete-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await createAgent({
				id: agentId,
				workspaceId,
				name: 'Agent to Delete',
				model: VALID_MODEL,
				instructions: 'Delete me',
				createdBy: userId!,
			})

			const res = await orpcRequest({
				procedure: 'agents/delete',
				cookie: setCookie,
				workspaceId,
				body: { id: agentId },
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{ success: boolean }>(res)
			expect(json.success).toBe(true)

			// Verify agent is deleted
			const getRes = await orpcRequest({
				procedure: 'agents/get',
				cookie: setCookie,
				workspaceId,
				body: { id: agentId },
			})
			expect(getRes.status).toBe(404)
		})

		it('returns 404 for non-existent agent', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_delete_404_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Delete 404 Workspace',
				slug: `delete-404-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			const res = await orpcRequest({
				procedure: 'agents/delete',
				cookie: setCookie,
				workspaceId,
				body: { id: 'agent_nonexistent_delete' },
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

			const workspaceId = `ws_delete_member_${Date.now()}`
			const agentId = `agent_delete_member_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Delete Member Workspace',
				slug: `delete-member-workspace-${Date.now()}`,
				ownerId: ownerId!,
			})

			// Add user2 as a member (not admin)
			await addWorkspaceMember({
				id: `member_delete_${Date.now()}`,
				workspaceId,
				userId: memberId!,
				role: 'member',
			})

			await createAgent({
				id: agentId,
				workspaceId,
				name: 'Agent to Delete',
				model: VALID_MODEL,
				instructions: 'Delete me',
				createdBy: ownerId!,
			})

			// Member should not be able to delete
			const res = await orpcRequest({
				procedure: 'agents/delete',
				cookie: memberCookie,
				workspaceId,
				body: { id: agentId },
			})

			expect(res.status).toBe(403)
		})
	})

	describe('agents.deploy - Deploy agent', () => {
		it('deploys draft agent', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_deploy_${Date.now()}`
			const agentId = `agent_deploy_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Deploy Workspace',
				slug: `deploy-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await createAgent({
				id: agentId,
				workspaceId,
				name: 'Agent to Deploy',
				model: VALID_MODEL,
				instructions: 'Deploy me',
				status: 'draft',
				createdBy: userId!,
			})

			const res = await orpcRequest({
				procedure: 'agents/deploy',
				cookie: setCookie,
				workspaceId,
				body: { id: agentId },
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{
				id: string
				status: string
				version: string
				url: string
				endpoints: {
					chat: string
					websocket: string
					state: string
				}
			}>(res)
			expect(json.status).toBe('active')
			expect(json.version).toBeDefined()
			expect(json.url).toBeDefined()
			expect(json.endpoints).toBeDefined()
			expect(json.endpoints.chat).toBeDefined()
			expect(json.endpoints.websocket).toBeDefined()
		})

		it('returns 404 for non-existent agent', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_deploy_404_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Deploy 404 Workspace',
				slug: `deploy-404-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			const res = await orpcRequest({
				procedure: 'agents/deploy',
				cookie: setCookie,
				workspaceId,
				body: { id: 'agent_nonexistent_deploy' },
			})

			expect(res.status).toBe(404)
		})

		it('requires admin access to deploy', async () => {
			const email1 = generateTestEmail()
			const email2 = generateTestEmail()
			const { userId: ownerId } = await signUpTestUser(email1, 'SecurePass123!', 'Owner')
			const { setCookie: memberCookie, userId: memberId } = await signUpTestUser(
				email2,
				'SecurePass123!',
				'Member',
			)

			const workspaceId = `ws_deploy_member_${Date.now()}`
			const agentId = `agent_deploy_member_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Deploy Member Workspace',
				slug: `deploy-member-workspace-${Date.now()}`,
				ownerId: ownerId!,
			})

			// Add user2 as a member (not admin)
			await addWorkspaceMember({
				id: `member_deploy_${Date.now()}`,
				workspaceId,
				userId: memberId!,
				role: 'member',
			})

			await createAgent({
				id: agentId,
				workspaceId,
				name: 'Agent to Deploy',
				model: VALID_MODEL,
				instructions: 'Deploy me',
				status: 'draft',
				createdBy: ownerId!,
			})

			// Member should not be able to deploy
			const res = await orpcRequest({
				procedure: 'agents/deploy',
				cookie: memberCookie,
				workspaceId,
				body: { id: agentId },
			})

			expect(res.status).toBe(403)
		})

		it('rejects deploying agent without instructions', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_deploy_no_inst_${Date.now()}`
			const agentId = `agent_deploy_no_inst_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Deploy No Instructions Workspace',
				slug: `deploy-no-inst-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			// Create agent without instructions
			const nowSeconds = Math.floor(Date.now() / 1000)
			await env.DB.prepare(
				`INSERT INTO agents (id, workspaceId, name, model, status, systemToolsEnabled, createdBy, createdAt, updatedAt)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			)
				.bind(
					agentId,
					workspaceId,
					'Agent without instructions',
					VALID_MODEL,
					'draft',
					1, // systemToolsEnabled = true
					userId!,
					nowSeconds,
					nowSeconds,
				)
				.run()

			const res = await orpcRequest({
				procedure: 'agents/deploy',
				cookie: setCookie,
				workspaceId,
				body: { id: agentId },
			})

			expect(res.status).toBe(400)
		})
	})
})
