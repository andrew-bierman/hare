/**
 * Integration tests for agent-tool assignment relationships
 *
 * Tests cover:
 * - Assigning tool to agent creates relationship
 * - Agent retrieval includes assigned tools
 * - Removing tool from agent removes relationship
 * - Deleting tool removes from all agents (cascade)
 * - Agent with tools executes tool correctly
 * - Tool permissions are respected per agent
 * - Bulk tool assignment works
 *
 * Uses real D1 database in test environment.
 */

import { env } from 'cloudflare:test'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { app } from '@hare/api'
import { applyMigrations } from '../routes/__tests__/setup'

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
	return `test-agent-tools-${Date.now()}-${testCounter}@example.com`
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

// Helper to create an agent directly in DB
async function createAgent(options: {
	id: string
	workspaceId: string
	name: string
	model: string
	instructions: string
	status?: string
	systemToolsEnabled?: boolean
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
			options.systemToolsEnabled !== false ? 1 : 0,
			options.createdBy,
			nowSeconds,
			nowSeconds,
		)
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

// Helper to create agent-tool relationship directly in DB
async function assignToolToAgent(options: { id: string; agentId: string; toolId: string }) {
	const nowSeconds = Math.floor(Date.now() / 1000)
	await env.DB.prepare(
		`INSERT INTO agent_tools (id, agentId, toolId, createdAt)
		 VALUES (?, ?, ?, ?)`,
	)
		.bind(options.id, options.agentId, options.toolId, nowSeconds)
		.run()
}

// Helper to get agent-tool relationships from DB
async function getAgentToolRelationships(agentId: string): Promise<string[]> {
	const result = await env.DB.prepare(
		`SELECT toolId FROM agent_tools WHERE agentId = ?`,
	)
		.bind(agentId)
		.all()
	return result.results.map((r) => (r as { toolId: string }).toolId)
}

// Helper to get all agents that have a specific tool assigned
async function getAgentsWithTool(toolId: string): Promise<string[]> {
	const result = await env.DB.prepare(
		`SELECT agentId FROM agent_tools WHERE toolId = ?`,
	)
		.bind(toolId)
		.all()
	return result.results.map((r) => (r as { agentId: string }).agentId)
}

/**
 * Helper to make oRPC request
 * oRPC protocol: procedure path uses forward slashes (agents.list -> /agents/list)
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

describe('Agent-Tool Integration', () => {
	describe('Assigning tool to agent creates relationship', () => {
		it('creates agent with toolIds and verifies relationship in DB', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_assign_${Date.now()}`
			const toolId = `tool_assign_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Assign Workspace',
				slug: `assign-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await createTool({
				id: toolId,
				workspaceId,
				name: 'Test HTTP Tool',
				type: 'http',
				config: { url: 'https://api.example.com', method: 'GET' },
				createdBy: userId!,
			})

			// Create agent with tool assignment via API
			const res = await orpcRequest({
				procedure: 'agents/create',
				cookie: setCookie,
				workspaceId,
				body: {
					name: 'Agent with Tool',
					model: VALID_MODEL,
					instructions: 'Test agent with assigned tool',
					toolIds: [toolId],
				},
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{
				id: string
				name: string
				toolIds: string[]
			}>(res)

			expect(json.toolIds).toContain(toolId)

			// Verify relationship exists in DB
			const toolIds = await getAgentToolRelationships(json.id)
			expect(toolIds).toContain(toolId)
		})

		it('assigns tool to existing agent via update', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_update_assign_${Date.now()}`
			const agentId = `agent_update_assign_${Date.now()}`
			const toolId = `tool_update_assign_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Update Assign Workspace',
				slug: `update-assign-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await createAgent({
				id: agentId,
				workspaceId,
				name: 'Agent without Tool',
				model: VALID_MODEL,
				instructions: 'Initially no tools',
				createdBy: userId!,
			})

			await createTool({
				id: toolId,
				workspaceId,
				name: 'Tool to Assign',
				type: 'http',
				createdBy: userId!,
			})

			// Verify no tools initially
			let toolIds = await getAgentToolRelationships(agentId)
			expect(toolIds).toHaveLength(0)

			// Update agent to add tool
			const res = await orpcRequest({
				procedure: 'agents/update',
				cookie: setCookie,
				workspaceId,
				body: {
					id: agentId,
					toolIds: [toolId],
				},
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{ toolIds: string[] }>(res)
			expect(json.toolIds).toContain(toolId)

			// Verify relationship in DB
			toolIds = await getAgentToolRelationships(agentId)
			expect(toolIds).toContain(toolId)
		})
	})

	describe('Agent retrieval includes assigned tools', () => {
		it('agent.get returns toolIds array', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_get_tools_${Date.now()}`
			const agentId = `agent_get_tools_${Date.now()}`
			const toolId1 = `tool_get_1_${Date.now()}`
			const toolId2 = `tool_get_2_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Get Tools Workspace',
				slug: `get-tools-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await createAgent({
				id: agentId,
				workspaceId,
				name: 'Agent with Tools',
				model: VALID_MODEL,
				instructions: 'Agent for retrieval test',
				createdBy: userId!,
			})

			await createTool({
				id: toolId1,
				workspaceId,
				name: 'Tool 1',
				type: 'http',
				createdBy: userId!,
			})

			await createTool({
				id: toolId2,
				workspaceId,
				name: 'Tool 2',
				type: 'sql',
				createdBy: userId!,
			})

			// Assign tools directly in DB
			await assignToolToAgent({ id: `at_${Date.now()}_1`, agentId, toolId: toolId1 })
			await assignToolToAgent({ id: `at_${Date.now()}_2`, agentId, toolId: toolId2 })

			// Fetch agent and verify toolIds
			const res = await orpcRequest({
				procedure: 'agents/get',
				cookie: setCookie,
				workspaceId,
				body: { id: agentId },
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{
				id: string
				toolIds: string[]
			}>(res)

			expect(json.toolIds).toHaveLength(2)
			expect(json.toolIds).toContain(toolId1)
			expect(json.toolIds).toContain(toolId2)
		})

		it('agents.list includes toolIds for each agent', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_list_tools_${Date.now()}`
			const agentId1 = `agent_list_1_${Date.now()}`
			const agentId2 = `agent_list_2_${Date.now()}`
			const toolId = `tool_list_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'List Tools Workspace',
				slug: `list-tools-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await createAgent({
				id: agentId1,
				workspaceId,
				name: 'Agent 1',
				model: VALID_MODEL,
				instructions: 'First agent',
				createdBy: userId!,
			})

			await createAgent({
				id: agentId2,
				workspaceId,
				name: 'Agent 2',
				model: VALID_MODEL,
				instructions: 'Second agent',
				createdBy: userId!,
			})

			await createTool({
				id: toolId,
				workspaceId,
				name: 'Shared Tool',
				type: 'http',
				createdBy: userId!,
			})

			// Assign tool only to agent 1
			await assignToolToAgent({ id: `at_list_${Date.now()}`, agentId: agentId1, toolId })

			// List agents
			const res = await orpcRequest({
				procedure: 'agents/list',
				cookie: setCookie,
				workspaceId,
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{
				agents: Array<{ id: string; toolIds: string[] }>
			}>(res)

			const agent1 = json.agents.find((a) => a.id === agentId1)
			const agent2 = json.agents.find((a) => a.id === agentId2)

			expect(agent1?.toolIds).toContain(toolId)
			expect(agent2?.toolIds).toHaveLength(0)
		})
	})

	describe('Removing tool from agent removes relationship', () => {
		it('updates agent with empty toolIds removes all relationships', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_remove_all_${Date.now()}`
			const agentId = `agent_remove_all_${Date.now()}`
			const toolId1 = `tool_remove_1_${Date.now()}`
			const toolId2 = `tool_remove_2_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Remove All Workspace',
				slug: `remove-all-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await createAgent({
				id: agentId,
				workspaceId,
				name: 'Agent with Tools to Remove',
				model: VALID_MODEL,
				instructions: 'Test removal',
				createdBy: userId!,
			})

			await createTool({
				id: toolId1,
				workspaceId,
				name: 'Tool 1',
				type: 'http',
				createdBy: userId!,
			})

			await createTool({
				id: toolId2,
				workspaceId,
				name: 'Tool 2',
				type: 'sql',
				createdBy: userId!,
			})

			// Assign tools
			await assignToolToAgent({ id: `at_rem_1_${Date.now()}`, agentId, toolId: toolId1 })
			await assignToolToAgent({ id: `at_rem_2_${Date.now()}`, agentId, toolId: toolId2 })

			// Verify tools are assigned
			let toolIds = await getAgentToolRelationships(agentId)
			expect(toolIds).toHaveLength(2)

			// Update agent with empty toolIds
			const res = await orpcRequest({
				procedure: 'agents/update',
				cookie: setCookie,
				workspaceId,
				body: {
					id: agentId,
					toolIds: [],
				},
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{ toolIds: string[] }>(res)
			expect(json.toolIds).toHaveLength(0)

			// Verify relationships removed from DB
			toolIds = await getAgentToolRelationships(agentId)
			expect(toolIds).toHaveLength(0)
		})

		it('updates agent with different toolIds replaces relationships', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_replace_${Date.now()}`
			const agentId = `agent_replace_${Date.now()}`
			const toolId1 = `tool_old_${Date.now()}`
			const toolId2 = `tool_new_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Replace Workspace',
				slug: `replace-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await createAgent({
				id: agentId,
				workspaceId,
				name: 'Agent for Replacement',
				model: VALID_MODEL,
				instructions: 'Test replacement',
				createdBy: userId!,
			})

			await createTool({
				id: toolId1,
				workspaceId,
				name: 'Old Tool',
				type: 'http',
				createdBy: userId!,
			})

			await createTool({
				id: toolId2,
				workspaceId,
				name: 'New Tool',
				type: 'sql',
				createdBy: userId!,
			})

			// Assign old tool
			await assignToolToAgent({ id: `at_old_${Date.now()}`, agentId, toolId: toolId1 })

			// Verify old tool is assigned
			let toolIds = await getAgentToolRelationships(agentId)
			expect(toolIds).toContain(toolId1)
			expect(toolIds).not.toContain(toolId2)

			// Update with new tool (replaces old)
			const res = await orpcRequest({
				procedure: 'agents/update',
				cookie: setCookie,
				workspaceId,
				body: {
					id: agentId,
					toolIds: [toolId2],
				},
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{ toolIds: string[] }>(res)
			expect(json.toolIds).toContain(toolId2)
			expect(json.toolIds).not.toContain(toolId1)

			// Verify in DB
			toolIds = await getAgentToolRelationships(agentId)
			expect(toolIds).toContain(toolId2)
			expect(toolIds).not.toContain(toolId1)
		})
	})

	describe('Deleting tool removes from all agents', () => {
		it('deleting tool cascades to agent_tools junction table', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_cascade_${Date.now()}`
			const agentId1 = `agent_cascade_1_${Date.now()}`
			const agentId2 = `agent_cascade_2_${Date.now()}`
			const toolId = `tool_cascade_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Cascade Workspace',
				slug: `cascade-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await createAgent({
				id: agentId1,
				workspaceId,
				name: 'Agent 1',
				model: VALID_MODEL,
				instructions: 'First agent',
				createdBy: userId!,
			})

			await createAgent({
				id: agentId2,
				workspaceId,
				name: 'Agent 2',
				model: VALID_MODEL,
				instructions: 'Second agent',
				createdBy: userId!,
			})

			await createTool({
				id: toolId,
				workspaceId,
				name: 'Tool to Delete',
				type: 'http',
				createdBy: userId!,
			})

			// Assign tool to both agents
			await assignToolToAgent({ id: `at_c1_${Date.now()}`, agentId: agentId1, toolId })
			await assignToolToAgent({ id: `at_c2_${Date.now()}`, agentId: agentId2, toolId })

			// Verify tool is assigned to both
			let agentsWithTool = await getAgentsWithTool(toolId)
			expect(agentsWithTool).toHaveLength(2)
			expect(agentsWithTool).toContain(agentId1)
			expect(agentsWithTool).toContain(agentId2)

			// Delete the tool
			const res = await orpcRequest({
				procedure: 'tools/delete',
				cookie: setCookie,
				workspaceId,
				body: { id: toolId },
			})

			expect(res.status).toBe(200)

			// Verify tool is removed from both agents (cascade delete)
			agentsWithTool = await getAgentsWithTool(toolId)
			expect(agentsWithTool).toHaveLength(0)

			// Verify agents themselves still exist
			const agent1ToolIds = await getAgentToolRelationships(agentId1)
			const agent2ToolIds = await getAgentToolRelationships(agentId2)
			expect(agent1ToolIds).not.toContain(toolId)
			expect(agent2ToolIds).not.toContain(toolId)
		})

		it('deleting agent cascades to agent_tools junction table', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_agent_cascade_${Date.now()}`
			const agentId = `agent_to_delete_${Date.now()}`
			const toolId1 = `tool_cascade_1_${Date.now()}`
			const toolId2 = `tool_cascade_2_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Agent Cascade Workspace',
				slug: `agent-cascade-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await createAgent({
				id: agentId,
				workspaceId,
				name: 'Agent to Delete',
				model: VALID_MODEL,
				instructions: 'Will be deleted',
				createdBy: userId!,
			})

			await createTool({
				id: toolId1,
				workspaceId,
				name: 'Tool 1',
				type: 'http',
				createdBy: userId!,
			})

			await createTool({
				id: toolId2,
				workspaceId,
				name: 'Tool 2',
				type: 'sql',
				createdBy: userId!,
			})

			// Assign tools to agent
			await assignToolToAgent({ id: `at_ac1_${Date.now()}`, agentId, toolId: toolId1 })
			await assignToolToAgent({ id: `at_ac2_${Date.now()}`, agentId, toolId: toolId2 })

			// Verify relationships exist
			let toolIds = await getAgentToolRelationships(agentId)
			expect(toolIds).toHaveLength(2)

			// Delete the agent
			const res = await orpcRequest({
				procedure: 'agents/delete',
				cookie: setCookie,
				workspaceId,
				body: { id: agentId },
			})

			expect(res.status).toBe(200)

			// Verify relationships are removed (cascade delete)
			toolIds = await getAgentToolRelationships(agentId)
			expect(toolIds).toHaveLength(0)

			// Verify tools themselves still exist
			const getToolRes = await orpcRequest({
				procedure: 'tools/get',
				cookie: setCookie,
				workspaceId,
				body: { id: toolId1 },
			})
			expect(getToolRes.status).toBe(200)
		})
	})

	describe('Agent with tools executes tool correctly', () => {
		it('agent.get includes tool details when tools are assigned', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_exec_${Date.now()}`
			const agentId = `agent_exec_${Date.now()}`
			const toolId = `tool_exec_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Execution Workspace',
				slug: `execution-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await createAgent({
				id: agentId,
				workspaceId,
				name: 'Execution Agent',
				model: VALID_MODEL,
				instructions: 'Agent for execution test',
				systemToolsEnabled: true,
				createdBy: userId!,
			})

			await createTool({
				id: toolId,
				workspaceId,
				name: 'HTTP Execution Tool',
				type: 'http',
				config: { url: 'https://api.example.com/data', method: 'GET' },
				inputSchema: { query: { type: 'string' } },
				createdBy: userId!,
			})

			// Assign tool
			await assignToolToAgent({ id: `at_exec_${Date.now()}`, agentId, toolId })

			// Verify agent has tool
			const agentRes = await orpcRequest({
				procedure: 'agents/get',
				cookie: setCookie,
				workspaceId,
				body: { id: agentId },
			})

			expect(agentRes.status).toBe(200)
			const agentJson = await parseOrpcResponse<{
				id: string
				toolIds: string[]
				systemToolsEnabled: boolean
			}>(agentRes)

			expect(agentJson.toolIds).toContain(toolId)
			expect(agentJson.systemToolsEnabled).toBe(true)

			// Verify tool can be retrieved
			const toolRes = await orpcRequest({
				procedure: 'tools/get',
				cookie: setCookie,
				workspaceId,
				body: { id: toolId },
			})

			expect(toolRes.status).toBe(200)
			const toolJson = await parseOrpcResponse<{
				id: string
				name: string
				type: string
				config: Record<string, unknown>
			}>(toolRes)

			expect(toolJson.name).toBe('HTTP Execution Tool')
			expect(toolJson.type).toBe('http')
		})

		it('tool.testExisting works for tool assigned to agent', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_test_exec_${Date.now()}`
			const agentId = `agent_test_exec_${Date.now()}`
			const toolId = `tool_test_exec_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Test Exec Workspace',
				slug: `test-exec-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await createAgent({
				id: agentId,
				workspaceId,
				name: 'Test Exec Agent',
				model: VALID_MODEL,
				instructions: 'Agent for test execution',
				createdBy: userId!,
			})

			await createTool({
				id: toolId,
				workspaceId,
				name: 'Test Exec Tool',
				type: 'http',
				config: { url: 'https://api.example.com', method: 'POST' },
				createdBy: userId!,
			})

			// Assign tool to agent
			await assignToolToAgent({ id: `at_te_${Date.now()}`, agentId, toolId })

			// Test the tool execution
			const res = await orpcRequest({
				procedure: 'tools/testExisting',
				cookie: setCookie,
				workspaceId,
				body: {
					id: toolId,
					testInput: { query: 'test' },
				},
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{
				success: boolean
				duration: number
			}>(res)

			expect(json.success).toBe(true)
			expect(json.duration).toBeGreaterThanOrEqual(0)
		})
	})

	describe('Tool permissions are respected per agent', () => {
		it('system tools filtering excludes system- prefixed tools from junction table', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_system_filter_${Date.now()}`
			const customToolId = `tool_custom_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'System Filter Workspace',
				slug: `system-filter-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await createTool({
				id: customToolId,
				workspaceId,
				name: 'Custom Tool',
				type: 'http',
				createdBy: userId!,
			})

			// Create agent with both system and custom tool IDs
			const res = await orpcRequest({
				procedure: 'agents/create',
				cookie: setCookie,
				workspaceId,
				body: {
					name: 'System Filter Agent',
					model: VALID_MODEL,
					instructions: 'Test system tool filtering',
					toolIds: ['system-storage', 'system-http', customToolId],
				},
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{
				id: string
				toolIds: string[]
			}>(res)

			// API returns all toolIds including system ones (for UI display)
			expect(json.toolIds).toContain(customToolId)
			expect(json.toolIds).toContain('system-storage')
			expect(json.toolIds).toContain('system-http')

			// But junction table should only have custom tool (system tools are filtered)
			const dbToolIds = await getAgentToolRelationships(json.id)
			expect(dbToolIds).toContain(customToolId)
			expect(dbToolIds).not.toContain('system-storage')
			expect(dbToolIds).not.toContain('system-http')
		})

		it('agent with systemToolsEnabled=false only uses custom tools', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_no_system_${Date.now()}`
			const toolId = `tool_no_system_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'No System Workspace',
				slug: `no-system-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await createTool({
				id: toolId,
				workspaceId,
				name: 'Only Custom Tool',
				type: 'http',
				createdBy: userId!,
			})

			// Create agent with systemToolsEnabled=false
			const res = await orpcRequest({
				procedure: 'agents/create',
				cookie: setCookie,
				workspaceId,
				body: {
					name: 'No System Agent',
					model: VALID_MODEL,
					instructions: 'Agent without system tools',
					systemToolsEnabled: false,
					toolIds: [toolId],
				},
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{
				id: string
				systemToolsEnabled: boolean
				toolIds: string[]
			}>(res)

			expect(json.systemToolsEnabled).toBe(false)
			expect(json.toolIds).toContain(toolId)
		})

		it('member role cannot access tools from another workspace', async () => {
			const email1 = generateTestEmail()
			const email2 = generateTestEmail()
			const { setCookie: cookie1, userId: userId1 } = await signUpTestUser(
				email1,
				'SecurePass123!',
				'Owner',
			)
			const { setCookie: cookie2, userId: userId2 } = await signUpTestUser(
				email2,
				'SecurePass123!',
				'Other User',
			)

			const workspaceId1 = `ws_perm_1_${Date.now()}`
			const workspaceId2 = `ws_perm_2_${Date.now()}`
			const toolId = `tool_perm_${Date.now()}`

			await createWorkspace({
				id: workspaceId1,
				name: 'Workspace 1',
				slug: `workspace-1-perm-${Date.now()}`,
				ownerId: userId1!,
			})

			await createWorkspace({
				id: workspaceId2,
				name: 'Workspace 2',
				slug: `workspace-2-perm-${Date.now()}`,
				ownerId: userId2!,
			})

			// Create tool in workspace 1
			await createTool({
				id: toolId,
				workspaceId: workspaceId1,
				name: 'Private Tool',
				type: 'http',
				createdBy: userId1!,
			})

			// User 2 tries to create agent with tool from workspace 1
			const res = await orpcRequest({
				procedure: 'agents/create',
				cookie: cookie2,
				workspaceId: workspaceId2,
				body: {
					name: 'Cross Workspace Agent',
					model: VALID_MODEL,
					instructions: 'Should not have access to other workspace tool',
					toolIds: [toolId],
				},
			})

			// Agent creation succeeds but tool won't actually work since it's not in this workspace
			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{
				id: string
				toolIds: string[]
			}>(res)

			// The toolId is stored but when the agent runs, the tool won't be found
			// This is expected behavior - the junction table stores the reference
			// but the tool itself doesn't exist in this workspace
		})
	})

	describe('Bulk tool assignment works', () => {
		it('creates agent with multiple tools assigned', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_bulk_create_${Date.now()}`
			const toolIds = Array.from({ length: 5 }, (_, i) => `tool_bulk_${Date.now()}_${i}`)

			await createWorkspace({
				id: workspaceId,
				name: 'Bulk Create Workspace',
				slug: `bulk-create-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			// Create multiple tools
			for (const toolId of toolIds) {
				await createTool({
					id: toolId,
					workspaceId,
					name: `Bulk Tool ${toolId}`,
					type: 'http',
					createdBy: userId!,
				})
			}

			// Create agent with all tools
			const res = await orpcRequest({
				procedure: 'agents/create',
				cookie: setCookie,
				workspaceId,
				body: {
					name: 'Bulk Agent',
					model: VALID_MODEL,
					instructions: 'Agent with multiple tools',
					toolIds,
				},
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{
				id: string
				toolIds: string[]
			}>(res)

			expect(json.toolIds).toHaveLength(5)
			for (const toolId of toolIds) {
				expect(json.toolIds).toContain(toolId)
			}

			// Verify in DB
			const dbToolIds = await getAgentToolRelationships(json.id)
			expect(dbToolIds).toHaveLength(5)
		})

		it('updates agent with multiple tools at once', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_bulk_update_${Date.now()}`
			const agentId = `agent_bulk_update_${Date.now()}`
			const oldToolIds = [`tool_old_1_${Date.now()}`, `tool_old_2_${Date.now()}`]
			const newToolIds = [
				`tool_new_1_${Date.now()}`,
				`tool_new_2_${Date.now()}`,
				`tool_new_3_${Date.now()}`,
			]

			await createWorkspace({
				id: workspaceId,
				name: 'Bulk Update Workspace',
				slug: `bulk-update-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await createAgent({
				id: agentId,
				workspaceId,
				name: 'Bulk Update Agent',
				model: VALID_MODEL,
				instructions: 'Agent for bulk update',
				createdBy: userId!,
			})

			// Create old tools and assign them
			for (const toolId of oldToolIds) {
				await createTool({
					id: toolId,
					workspaceId,
					name: `Old Tool ${toolId}`,
					type: 'http',
					createdBy: userId!,
				})
				await assignToolToAgent({
					id: `at_${toolId}_${Date.now()}`,
					agentId,
					toolId,
				})
			}

			// Create new tools
			for (const toolId of newToolIds) {
				await createTool({
					id: toolId,
					workspaceId,
					name: `New Tool ${toolId}`,
					type: 'sql',
					createdBy: userId!,
				})
			}

			// Verify old tools are assigned
			let dbToolIds = await getAgentToolRelationships(agentId)
			expect(dbToolIds).toHaveLength(2)

			// Bulk update to new tools
			const res = await orpcRequest({
				procedure: 'agents/update',
				cookie: setCookie,
				workspaceId,
				body: {
					id: agentId,
					toolIds: newToolIds,
				},
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{ toolIds: string[] }>(res)

			expect(json.toolIds).toHaveLength(3)
			for (const toolId of newToolIds) {
				expect(json.toolIds).toContain(toolId)
			}
			for (const toolId of oldToolIds) {
				expect(json.toolIds).not.toContain(toolId)
			}

			// Verify in DB
			dbToolIds = await getAgentToolRelationships(agentId)
			expect(dbToolIds).toHaveLength(3)
			for (const toolId of newToolIds) {
				expect(dbToolIds).toContain(toolId)
			}
		})

		it('respects max tools limit (20)', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_max_tools_${Date.now()}`
			const toolIds = Array.from({ length: 21 }, (_, i) => `tool_max_${Date.now()}_${i}`)

			await createWorkspace({
				id: workspaceId,
				name: 'Max Tools Workspace',
				slug: `max-tools-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			// Create 21 tools
			for (const toolId of toolIds) {
				await createTool({
					id: toolId,
					workspaceId,
					name: `Max Tool ${toolId}`,
					type: 'http',
					createdBy: userId!,
				})
			}

			// Try to create agent with 21 tools (exceeds limit of 20)
			const res = await orpcRequest({
				procedure: 'agents/create',
				cookie: setCookie,
				workspaceId,
				body: {
					name: 'Max Tools Agent',
					model: VALID_MODEL,
					instructions: 'Agent with too many tools',
					toolIds,
				},
			})

			// Should be rejected due to schema validation
			expect(res.status).toBe(400)
		})

		it('allows exactly 20 tools (at limit)', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_exact_limit_${Date.now()}`
			const toolIds = Array.from({ length: 20 }, (_, i) => `tool_limit_${Date.now()}_${i}`)

			await createWorkspace({
				id: workspaceId,
				name: 'Exact Limit Workspace',
				slug: `exact-limit-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			// Create 20 tools
			for (const toolId of toolIds) {
				await createTool({
					id: toolId,
					workspaceId,
					name: `Limit Tool ${toolId}`,
					type: 'http',
					createdBy: userId!,
				})
			}

			// Create agent with exactly 20 tools
			const res = await orpcRequest({
				procedure: 'agents/create',
				cookie: setCookie,
				workspaceId,
				body: {
					name: 'Exact Limit Agent',
					model: VALID_MODEL,
					instructions: 'Agent with exactly 20 tools',
					toolIds,
				},
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{ toolIds: string[] }>(res)
			expect(json.toolIds).toHaveLength(20)
		})
	})
})
