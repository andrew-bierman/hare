/**
 * Unit tests for usage and analytics API routes (oRPC)
 *
 * Tests cover:
 * - usage.getWorkspaceUsage - Get usage stats for current period
 * - usage.getWorkspaceUsage - Filter by date range
 * - usage.getWorkspaceUsage - Aggregate by agent
 * - usage.getAgentUsage - Get agent-specific usage
 * - analytics.get - Get analytics dashboard data
 * - analytics.get - Token usage breakdown
 * - analytics.get - API call statistics
 *
 * oRPC uses pathname-based routing: usage.getWorkspaceUsage -> /api/rpc/usage/getWorkspaceUsage
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
	return `test-usage-${Date.now()}-${testCounter}@example.com`
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
	description?: string
}) {
	const nowSeconds = Math.floor(Date.now() / 1000)
	await env.DB.prepare(
		`INSERT INTO workspaces (id, name, slug, description, ownerId, createdAt, updatedAt)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`,
	)
		.bind(
			options.id,
			options.name,
			options.slug,
			options.description ?? null,
			options.ownerId,
			nowSeconds,
			nowSeconds,
		)
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
	createdBy: string
	model?: string
	instructions?: string
	status?: string
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
			options.model ?? 'llama-3.3-70b',
			options.instructions ?? 'You are a helpful assistant.',
			options.status ?? 'draft',
			1, // systemToolsEnabled = true
			options.createdBy,
			nowSeconds,
			nowSeconds,
		)
		.run()
}

// Helper to create usage record directly in DB
async function createUsageRecord(options: {
	id: string
	workspaceId: string
	agentId?: string
	userId?: string
	type: string
	inputTokens?: number
	outputTokens?: number
	totalTokens?: number
	cost?: number
	metadata?: { model?: string; endpoint?: string; duration?: number; statusCode?: number }
	createdAt?: Date
}) {
	const createdAtSeconds = Math.floor((options.createdAt ?? new Date()).getTime() / 1000)
	await env.DB.prepare(
		`INSERT INTO usage (id, workspaceId, agentId, userId, type, inputTokens, outputTokens, totalTokens, cost, metadata, createdAt)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
	)
		.bind(
			options.id,
			options.workspaceId,
			options.agentId ?? null,
			options.userId ?? null,
			options.type,
			options.inputTokens ?? 0,
			options.outputTokens ?? 0,
			options.totalTokens ?? 0,
			options.cost ?? 0,
			options.metadata ? JSON.stringify(options.metadata) : null,
			createdAtSeconds,
		)
		.run()
}

/**
 * Helper to make oRPC request
 * oRPC protocol: procedure path uses forward slashes (usage.getWorkspaceUsage -> /usage/getWorkspaceUsage)
 * Input is passed as JSON in the request body
 */
async function orpcRequest(options: {
	procedure: string // e.g., "usage/getWorkspaceUsage", "analytics/get"
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

describe('Usage API Routes', () => {
	describe('usage.getWorkspaceUsage - Get usage stats', () => {
		it('returns 401 for unauthenticated request', async () => {
			const res = await orpcRequest({
				procedure: 'usage/getWorkspaceUsage',
			})
			expect(res.status).toBe(401)
		})

		it('returns 403 without workspace context', async () => {
			const email = generateTestEmail()
			const { setCookie } = await signUpTestUser(email, 'SecurePass123!', 'Test User')

			const res = await orpcRequest({
				procedure: 'usage/getWorkspaceUsage',
				cookie: setCookie,
			})

			expect(res.status).toBe(403)
		})

		it('returns usage stats for current period', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_usage_${Date.now()}`
			const agentId = `agent_usage_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Usage Workspace',
				slug: `usage-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await addWorkspaceMember({
				id: `member_usage_${Date.now()}`,
				workspaceId,
				userId: userId!,
				role: 'owner',
			})

			await createAgent({
				id: agentId,
				workspaceId,
				name: 'Test Agent',
				createdBy: userId!,
			})

			// Create usage records
			await createUsageRecord({
				id: `usage_1_${Date.now()}`,
				workspaceId,
				agentId,
				userId: userId!,
				type: 'api_call',
				inputTokens: 100,
				outputTokens: 200,
				totalTokens: 300,
				cost: 50, // 50 cents
				metadata: { model: 'llama-3.3-70b', duration: 500 },
			})

			await createUsageRecord({
				id: `usage_2_${Date.now()}`,
				workspaceId,
				agentId,
				userId: userId!,
				type: 'api_call',
				inputTokens: 150,
				outputTokens: 250,
				totalTokens: 400,
				cost: 75, // 75 cents
				metadata: { model: 'llama-3.3-70b', duration: 600 },
			})

			const res = await orpcRequest({
				procedure: 'usage/getWorkspaceUsage',
				cookie: setCookie,
				workspaceId,
				body: {},
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{
				usage: {
					totalMessages: number
					totalTokensIn: number
					totalTokensOut: number
					totalCost: number
					byAgent: Array<{
						agentId: string
						agentName: string
						messages: number
						tokensIn: number
						tokensOut: number
						cost: number
					}>
					byDay: Array<{
						date: string
						messages: number
						tokensIn: number
						tokensOut: number
						cost: number
					}>
				}
				period: { startDate: string; endDate: string }
			}>(res)

			expect(json.usage.totalMessages).toBe(2)
			expect(json.usage.totalTokensIn).toBe(250) // 100 + 150
			expect(json.usage.totalTokensOut).toBe(450) // 200 + 250
			expect(json.usage.totalCost).toBe(1.25) // (50 + 75) / 100
			expect(json.period.startDate).toBeDefined()
			expect(json.period.endDate).toBeDefined()
		})

		it('returns empty stats for workspace with no usage', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_empty_usage_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Empty Usage Workspace',
				slug: `empty-usage-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await addWorkspaceMember({
				id: `member_empty_usage_${Date.now()}`,
				workspaceId,
				userId: userId!,
				role: 'owner',
			})

			const res = await orpcRequest({
				procedure: 'usage/getWorkspaceUsage',
				cookie: setCookie,
				workspaceId,
				body: {},
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{
				usage: {
					totalMessages: number
					totalTokensIn: number
					totalTokensOut: number
					totalCost: number
				}
			}>(res)

			expect(json.usage.totalMessages).toBe(0)
			expect(json.usage.totalTokensIn).toBe(0)
			expect(json.usage.totalTokensOut).toBe(0)
			expect(json.usage.totalCost).toBe(0)
		})

		it('filters by date range', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_date_filter_${Date.now()}`
			const agentId = `agent_date_filter_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Date Filter Workspace',
				slug: `date-filter-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await addWorkspaceMember({
				id: `member_date_filter_${Date.now()}`,
				workspaceId,
				userId: userId!,
				role: 'owner',
			})

			await createAgent({
				id: agentId,
				workspaceId,
				name: 'Test Agent',
				createdBy: userId!,
			})

			// Create usage record from 60 days ago (should be filtered out)
			const oldDate = new Date()
			oldDate.setDate(oldDate.getDate() - 60)
			await createUsageRecord({
				id: `usage_old_${Date.now()}`,
				workspaceId,
				agentId,
				type: 'api_call',
				inputTokens: 1000,
				outputTokens: 2000,
				totalTokens: 3000,
				cost: 500,
				createdAt: oldDate,
			})

			// Create usage record from today (should be included)
			await createUsageRecord({
				id: `usage_new_${Date.now()}`,
				workspaceId,
				agentId,
				type: 'api_call',
				inputTokens: 100,
				outputTokens: 200,
				totalTokens: 300,
				cost: 50,
				createdAt: new Date(),
			})

			// Query with date range for last 30 days
			const startDate = new Date()
			startDate.setDate(startDate.getDate() - 30)
			const endDate = new Date()

			const res = await orpcRequest({
				procedure: 'usage/getWorkspaceUsage',
				cookie: setCookie,
				workspaceId,
				body: {
					startDate: startDate.toISOString(),
					endDate: endDate.toISOString(),
				},
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{
				usage: {
					totalMessages: number
					totalTokensIn: number
					totalTokensOut: number
				}
				period: { startDate: string; endDate: string }
			}>(res)

			// Should only include the recent record
			expect(json.usage.totalMessages).toBe(1)
			expect(json.usage.totalTokensIn).toBe(100)
			expect(json.usage.totalTokensOut).toBe(200)
			expect(json.period.startDate).toBe(startDate.toISOString())
			expect(json.period.endDate).toBe(endDate.toISOString())
		})

		it('aggregates by agent', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_agent_agg_${Date.now()}`
			const agentId1 = `agent_agg_1_${Date.now()}`
			const agentId2 = `agent_agg_2_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Agent Aggregation Workspace',
				slug: `agent-agg-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await addWorkspaceMember({
				id: `member_agent_agg_${Date.now()}`,
				workspaceId,
				userId: userId!,
				role: 'owner',
			})

			await createAgent({
				id: agentId1,
				workspaceId,
				name: 'Agent One',
				createdBy: userId!,
			})

			await createAgent({
				id: agentId2,
				workspaceId,
				name: 'Agent Two',
				createdBy: userId!,
			})

			// Create usage for agent 1
			await createUsageRecord({
				id: `usage_agent1_1_${Date.now()}`,
				workspaceId,
				agentId: agentId1,
				type: 'api_call',
				inputTokens: 100,
				outputTokens: 200,
				totalTokens: 300,
				cost: 50,
			})

			await createUsageRecord({
				id: `usage_agent1_2_${Date.now()}`,
				workspaceId,
				agentId: agentId1,
				type: 'api_call',
				inputTokens: 150,
				outputTokens: 250,
				totalTokens: 400,
				cost: 75,
			})

			// Create usage for agent 2
			await createUsageRecord({
				id: `usage_agent2_1_${Date.now()}`,
				workspaceId,
				agentId: agentId2,
				type: 'api_call',
				inputTokens: 500,
				outputTokens: 1000,
				totalTokens: 1500,
				cost: 200,
			})

			const res = await orpcRequest({
				procedure: 'usage/getWorkspaceUsage',
				cookie: setCookie,
				workspaceId,
				body: {},
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{
				usage: {
					totalMessages: number
					byAgent: Array<{
						agentId: string
						agentName: string
						messages: number
						tokensIn: number
						tokensOut: number
						cost: number
					}>
				}
			}>(res)

			expect(json.usage.totalMessages).toBe(3)
			expect(json.usage.byAgent).toHaveLength(2)

			const agent1Stats = json.usage.byAgent.find((a) => a.agentId === agentId1)
			expect(agent1Stats).toBeDefined()
			expect(agent1Stats?.agentName).toBe('Agent One')
			expect(agent1Stats?.messages).toBe(2)
			expect(agent1Stats?.tokensIn).toBe(250)
			expect(agent1Stats?.tokensOut).toBe(450)

			const agent2Stats = json.usage.byAgent.find((a) => a.agentId === agentId2)
			expect(agent2Stats).toBeDefined()
			expect(agent2Stats?.agentName).toBe('Agent Two')
			expect(agent2Stats?.messages).toBe(1)
			expect(agent2Stats?.tokensIn).toBe(500)
			expect(agent2Stats?.tokensOut).toBe(1000)
		})
	})

	describe('usage.getAgentUsage - Get agent-specific usage', () => {
		it('returns 401 for unauthenticated request', async () => {
			const res = await orpcRequest({
				procedure: 'usage/getAgentUsage',
				body: { id: 'agent_123' },
			})
			expect(res.status).toBe(401)
		})

		it('returns 403 without workspace context', async () => {
			const email = generateTestEmail()
			const { setCookie } = await signUpTestUser(email, 'SecurePass123!', 'Test User')

			const res = await orpcRequest({
				procedure: 'usage/getAgentUsage',
				cookie: setCookie,
				body: { id: 'agent_123' },
			})

			expect(res.status).toBe(403)
		})

		it('returns 404 for non-existent agent', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_agent_404_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Agent 404 Workspace',
				slug: `agent-404-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await addWorkspaceMember({
				id: `member_agent_404_${Date.now()}`,
				workspaceId,
				userId: userId!,
				role: 'owner',
			})

			const res = await orpcRequest({
				procedure: 'usage/getAgentUsage',
				cookie: setCookie,
				workspaceId,
				body: { id: 'nonexistent_agent' },
			})

			expect(res.status).toBe(404)
		})

		it('returns agent-specific usage statistics', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_agent_usage_${Date.now()}`
			const agentId = `agent_specific_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Agent Usage Workspace',
				slug: `agent-usage-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await addWorkspaceMember({
				id: `member_agent_usage_${Date.now()}`,
				workspaceId,
				userId: userId!,
				role: 'owner',
			})

			await createAgent({
				id: agentId,
				workspaceId,
				name: 'Specific Agent',
				createdBy: userId!,
			})

			// Create usage records with different models
			await createUsageRecord({
				id: `usage_model1_${Date.now()}`,
				workspaceId,
				agentId,
				type: 'api_call',
				inputTokens: 100,
				outputTokens: 200,
				totalTokens: 300,
				cost: 50,
				metadata: { model: 'llama-3.3-70b', duration: 500 },
			})

			await createUsageRecord({
				id: `usage_model2_${Date.now()}`,
				workspaceId,
				agentId,
				type: 'api_call',
				inputTokens: 200,
				outputTokens: 400,
				totalTokens: 600,
				cost: 100,
				metadata: { model: 'mistral-7b', duration: 300 },
			})

			await createUsageRecord({
				id: `usage_model3_${Date.now()}`,
				workspaceId,
				agentId,
				type: 'api_call',
				inputTokens: 150,
				outputTokens: 300,
				totalTokens: 450,
				cost: 75,
				metadata: { model: 'llama-3.3-70b', duration: 400 },
			})

			const res = await orpcRequest({
				procedure: 'usage/getAgentUsage',
				cookie: setCookie,
				workspaceId,
				body: { id: agentId },
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{
				agentId: string
				usage: {
					totalMessages: number
					totalTokensIn: number
					totalTokensOut: number
					totalCost: number
					averageLatencyMs: number
					byModel: Array<{
						model: string
						messages: number
						tokensIn: number
						tokensOut: number
						cost: number
					}>
					byDay: Array<{
						date: string
						messages: number
						tokensIn: number
						tokensOut: number
						cost: number
					}>
				}
			}>(res)

			expect(json.agentId).toBe(agentId)
			expect(json.usage.totalMessages).toBe(3)
			expect(json.usage.totalTokensIn).toBe(450) // 100 + 200 + 150
			expect(json.usage.totalTokensOut).toBe(900) // 200 + 400 + 300
			expect(json.usage.totalCost).toBe(2.25) // (50 + 100 + 75) / 100
			expect(json.usage.averageLatencyMs).toBe(400) // avg(500, 300, 400)

			// Check by model breakdown
			expect(json.usage.byModel.length).toBeGreaterThanOrEqual(2)
			const llamaStats = json.usage.byModel.find((m) => m.model === 'llama-3.3-70b')
			expect(llamaStats?.messages).toBe(2)
			expect(llamaStats?.tokensIn).toBe(250) // 100 + 150

			const mistralStats = json.usage.byModel.find((m) => m.model === 'mistral-7b')
			expect(mistralStats?.messages).toBe(1)
			expect(mistralStats?.tokensIn).toBe(200)
		})

		it('returns 404 for agent in different workspace', async () => {
			const email1 = generateTestEmail()
			const email2 = generateTestEmail()
			const { userId: userId1 } = await signUpTestUser(email1, 'SecurePass123!', 'User 1')
			const { setCookie: cookie2, userId: userId2 } = await signUpTestUser(
				email2,
				'SecurePass123!',
				'User 2',
			)

			const workspaceId1 = `ws_isolation_1_${Date.now()}`
			const workspaceId2 = `ws_isolation_2_${Date.now()}`
			const agentId1 = `agent_isolation_${Date.now()}`

			// Create workspace 1 with agent
			await createWorkspace({
				id: workspaceId1,
				name: 'Workspace 1',
				slug: `workspace-1-${Date.now()}`,
				ownerId: userId1!,
			})

			await addWorkspaceMember({
				id: `member_iso_1_${Date.now()}`,
				workspaceId: workspaceId1,
				userId: userId1!,
				role: 'owner',
			})

			await createAgent({
				id: agentId1,
				workspaceId: workspaceId1,
				name: 'Agent in Workspace 1',
				createdBy: userId1!,
			})

			// Create workspace 2 for user 2
			await createWorkspace({
				id: workspaceId2,
				name: 'Workspace 2',
				slug: `workspace-2-${Date.now()}`,
				ownerId: userId2!,
			})

			await addWorkspaceMember({
				id: `member_iso_2_${Date.now()}`,
				workspaceId: workspaceId2,
				userId: userId2!,
				role: 'owner',
			})

			// User 2 trying to access agent from workspace 1
			const res = await orpcRequest({
				procedure: 'usage/getAgentUsage',
				cookie: cookie2,
				workspaceId: workspaceId2,
				body: { id: agentId1 },
			})

			expect(res.status).toBe(404)
		})
	})
})

describe('Analytics API Routes', () => {
	describe('analytics.get - Get analytics dashboard data', () => {
		it('returns 401 for unauthenticated request', async () => {
			const res = await orpcRequest({
				procedure: 'analytics/get',
			})
			expect(res.status).toBe(401)
		})

		it('returns 403 without workspace context', async () => {
			const email = generateTestEmail()
			const { setCookie } = await signUpTestUser(email, 'SecurePass123!', 'Test User')

			const res = await orpcRequest({
				procedure: 'analytics/get',
				cookie: setCookie,
			})

			expect(res.status).toBe(403)
		})

		it('returns comprehensive analytics dashboard data', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_analytics_${Date.now()}`
			const agentId = `agent_analytics_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Analytics Workspace',
				slug: `analytics-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await addWorkspaceMember({
				id: `member_analytics_${Date.now()}`,
				workspaceId,
				userId: userId!,
				role: 'owner',
			})

			await createAgent({
				id: agentId,
				workspaceId,
				name: 'Analytics Agent',
				createdBy: userId!,
			})

			// Create usage records
			await createUsageRecord({
				id: `usage_analytics_1_${Date.now()}`,
				workspaceId,
				agentId,
				type: 'api_call',
				inputTokens: 100,
				outputTokens: 200,
				totalTokens: 300,
				cost: 50,
				metadata: { model: 'llama-3.3-70b', duration: 500 },
			})

			await createUsageRecord({
				id: `usage_analytics_2_${Date.now()}`,
				workspaceId,
				agentId,
				type: 'api_call',
				inputTokens: 200,
				outputTokens: 300,
				totalTokens: 500,
				cost: 100,
				metadata: { model: 'llama-3.3-70b', duration: 400 },
			})

			const res = await orpcRequest({
				procedure: 'analytics/get',
				cookie: setCookie,
				workspaceId,
				body: {},
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{
				summary: {
					totalRequests: number
					totalInputTokens: number
					totalOutputTokens: number
					totalTokens: number
					totalCost: number
					avgLatencyMs: number
				}
				timeSeries: Array<{
					date: string
					inputTokens: number
					outputTokens: number
					totalTokens: number
					requests: number
					cost: number
					avgLatency: number
				}>
				byAgent: Array<{
					agentId: string
					agentName: string
					requests: number
					inputTokens: number
					outputTokens: number
					totalTokens: number
					cost: number
				}>
				byModel: Array<{
					model: string
					modelName: string
					requests: number
					inputTokens: number
					outputTokens: number
					totalTokens: number
					cost: number
				}>
				period: { startDate: string; endDate: string }
			}>(res)

			// Verify summary
			expect(json.summary.totalRequests).toBe(2)
			expect(json.summary.totalInputTokens).toBe(300) // 100 + 200
			expect(json.summary.totalOutputTokens).toBe(500) // 200 + 300
			expect(json.summary.totalTokens).toBe(800) // 300 + 500
			expect(json.summary.totalCost).toBe(1.5) // (50 + 100) / 100
			expect(json.summary.avgLatencyMs).toBe(450) // avg(500, 400)

			// Verify period
			expect(json.period.startDate).toBeDefined()
			expect(json.period.endDate).toBeDefined()

			// Verify byAgent
			expect(json.byAgent.length).toBeGreaterThanOrEqual(1)
			const agentStats = json.byAgent.find((a) => a.agentId === agentId)
			expect(agentStats?.agentName).toBe('Analytics Agent')
			expect(agentStats?.requests).toBe(2)

			// Verify byModel
			expect(json.byModel.length).toBeGreaterThanOrEqual(1)
			const modelStats = json.byModel.find((m) => m.model === 'llama-3.3-70b')
			expect(modelStats?.requests).toBe(2)
		})

		it('returns empty analytics for workspace with no usage', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_empty_analytics_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Empty Analytics Workspace',
				slug: `empty-analytics-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await addWorkspaceMember({
				id: `member_empty_analytics_${Date.now()}`,
				workspaceId,
				userId: userId!,
				role: 'owner',
			})

			const res = await orpcRequest({
				procedure: 'analytics/get',
				cookie: setCookie,
				workspaceId,
				body: {},
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{
				summary: {
					totalRequests: number
					totalInputTokens: number
					totalOutputTokens: number
					totalTokens: number
					totalCost: number
					avgLatencyMs: number
				}
			}>(res)

			expect(json.summary.totalRequests).toBe(0)
			expect(json.summary.totalInputTokens).toBe(0)
			expect(json.summary.totalOutputTokens).toBe(0)
			expect(json.summary.totalTokens).toBe(0)
			expect(json.summary.totalCost).toBe(0)
			expect(json.summary.avgLatencyMs).toBe(0)
		})

		it('returns token usage breakdown', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_token_breakdown_${Date.now()}`
			const agentId = `agent_token_breakdown_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Token Breakdown Workspace',
				slug: `token-breakdown-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await addWorkspaceMember({
				id: `member_token_breakdown_${Date.now()}`,
				workspaceId,
				userId: userId!,
				role: 'owner',
			})

			await createAgent({
				id: agentId,
				workspaceId,
				name: 'Token Agent',
				createdBy: userId!,
			})

			// Create usage records with different models
			await createUsageRecord({
				id: `usage_tokens_1_${Date.now()}`,
				workspaceId,
				agentId,
				type: 'api_call',
				inputTokens: 1000,
				outputTokens: 2000,
				totalTokens: 3000,
				cost: 300,
				metadata: { model: 'llama-3.3-70b' },
			})

			await createUsageRecord({
				id: `usage_tokens_2_${Date.now()}`,
				workspaceId,
				agentId,
				type: 'api_call',
				inputTokens: 500,
				outputTokens: 1000,
				totalTokens: 1500,
				cost: 150,
				metadata: { model: 'mistral-7b' },
			})

			await createUsageRecord({
				id: `usage_tokens_3_${Date.now()}`,
				workspaceId,
				agentId,
				type: 'api_call',
				inputTokens: 2000,
				outputTokens: 4000,
				totalTokens: 6000,
				cost: 600,
				metadata: { model: 'llama-3.3-70b' },
			})

			const res = await orpcRequest({
				procedure: 'analytics/get',
				cookie: setCookie,
				workspaceId,
				body: {},
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{
				summary: {
					totalInputTokens: number
					totalOutputTokens: number
					totalTokens: number
				}
				byModel: Array<{
					model: string
					inputTokens: number
					outputTokens: number
					totalTokens: number
				}>
			}>(res)

			// Verify total tokens
			expect(json.summary.totalInputTokens).toBe(3500) // 1000 + 500 + 2000
			expect(json.summary.totalOutputTokens).toBe(7000) // 2000 + 1000 + 4000
			expect(json.summary.totalTokens).toBe(10500) // 3000 + 1500 + 6000

			// Verify token breakdown by model
			const llamaStats = json.byModel.find((m) => m.model === 'llama-3.3-70b')
			expect(llamaStats?.inputTokens).toBe(3000) // 1000 + 2000
			expect(llamaStats?.outputTokens).toBe(6000) // 2000 + 4000
			expect(llamaStats?.totalTokens).toBe(9000) // 3000 + 6000

			const mistralStats = json.byModel.find((m) => m.model === 'mistral-7b')
			expect(mistralStats?.inputTokens).toBe(500)
			expect(mistralStats?.outputTokens).toBe(1000)
			expect(mistralStats?.totalTokens).toBe(1500)
		})

		it('returns API call statistics', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_api_calls_${Date.now()}`
			const agentId1 = `agent_api_1_${Date.now()}`
			const agentId2 = `agent_api_2_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'API Calls Workspace',
				slug: `api-calls-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await addWorkspaceMember({
				id: `member_api_calls_${Date.now()}`,
				workspaceId,
				userId: userId!,
				role: 'owner',
			})

			await createAgent({
				id: agentId1,
				workspaceId,
				name: 'API Agent 1',
				createdBy: userId!,
			})

			await createAgent({
				id: agentId2,
				workspaceId,
				name: 'API Agent 2',
				createdBy: userId!,
			})

			// Create multiple API call records
			for (let i = 0; i < 5; i++) {
				await createUsageRecord({
					id: `usage_api_1_${i}_${Date.now()}`,
					workspaceId,
					agentId: agentId1,
					type: 'api_call',
					inputTokens: 100,
					outputTokens: 200,
					totalTokens: 300,
					cost: 50,
					metadata: { model: 'llama-3.3-70b', duration: 400 + i * 50 },
				})
			}

			for (let i = 0; i < 3; i++) {
				await createUsageRecord({
					id: `usage_api_2_${i}_${Date.now()}`,
					workspaceId,
					agentId: agentId2,
					type: 'api_call',
					inputTokens: 200,
					outputTokens: 400,
					totalTokens: 600,
					cost: 100,
					metadata: { model: 'mistral-7b', duration: 300 + i * 50 },
				})
			}

			const res = await orpcRequest({
				procedure: 'analytics/get',
				cookie: setCookie,
				workspaceId,
				body: {},
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{
				summary: {
					totalRequests: number
					avgLatencyMs: number
				}
				byAgent: Array<{
					agentId: string
					agentName: string
					requests: number
				}>
				byModel: Array<{
					model: string
					requests: number
				}>
			}>(res)

			// Verify total requests
			expect(json.summary.totalRequests).toBe(8) // 5 + 3

			// Verify requests by agent
			const agent1Stats = json.byAgent.find((a) => a.agentId === agentId1)
			expect(agent1Stats?.requests).toBe(5)
			expect(agent1Stats?.agentName).toBe('API Agent 1')

			const agent2Stats = json.byAgent.find((a) => a.agentId === agentId2)
			expect(agent2Stats?.requests).toBe(3)
			expect(agent2Stats?.agentName).toBe('API Agent 2')

			// Verify requests by model
			const llamaStats = json.byModel.find((m) => m.model === 'llama-3.3-70b')
			expect(llamaStats?.requests).toBe(5)

			const mistralStats = json.byModel.find((m) => m.model === 'mistral-7b')
			expect(mistralStats?.requests).toBe(3)
		})

		it('filters analytics by date range', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_analytics_date_${Date.now()}`
			const agentId = `agent_analytics_date_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Analytics Date Workspace',
				slug: `analytics-date-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await addWorkspaceMember({
				id: `member_analytics_date_${Date.now()}`,
				workspaceId,
				userId: userId!,
				role: 'owner',
			})

			await createAgent({
				id: agentId,
				workspaceId,
				name: 'Date Agent',
				createdBy: userId!,
			})

			// Create old usage record (60 days ago)
			const oldDate = new Date()
			oldDate.setDate(oldDate.getDate() - 60)
			await createUsageRecord({
				id: `usage_old_analytics_${Date.now()}`,
				workspaceId,
				agentId,
				type: 'api_call',
				inputTokens: 10000,
				outputTokens: 20000,
				totalTokens: 30000,
				cost: 5000,
				createdAt: oldDate,
			})

			// Create recent usage record
			await createUsageRecord({
				id: `usage_new_analytics_${Date.now()}`,
				workspaceId,
				agentId,
				type: 'api_call',
				inputTokens: 100,
				outputTokens: 200,
				totalTokens: 300,
				cost: 50,
				createdAt: new Date(),
			})

			// Query with date range for last 30 days
			const startDate = new Date()
			startDate.setDate(startDate.getDate() - 30)
			const endDate = new Date()

			const res = await orpcRequest({
				procedure: 'analytics/get',
				cookie: setCookie,
				workspaceId,
				body: {
					startDate: startDate.toISOString(),
					endDate: endDate.toISOString(),
				},
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{
				summary: {
					totalRequests: number
					totalInputTokens: number
				}
				period: { startDate: string; endDate: string }
			}>(res)

			// Should only include recent record
			expect(json.summary.totalRequests).toBe(1)
			expect(json.summary.totalInputTokens).toBe(100)
			expect(json.period.startDate).toBe(startDate.toISOString())
			expect(json.period.endDate).toBe(endDate.toISOString())
		})

		it('filters analytics by agent', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_analytics_agent_${Date.now()}`
			const agentId1 = `agent_filter_1_${Date.now()}`
			const agentId2 = `agent_filter_2_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Analytics Agent Filter Workspace',
				slug: `analytics-agent-filter-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await addWorkspaceMember({
				id: `member_analytics_agent_${Date.now()}`,
				workspaceId,
				userId: userId!,
				role: 'owner',
			})

			await createAgent({
				id: agentId1,
				workspaceId,
				name: 'Filter Agent 1',
				createdBy: userId!,
			})

			await createAgent({
				id: agentId2,
				workspaceId,
				name: 'Filter Agent 2',
				createdBy: userId!,
			})

			// Create usage for agent 1
			await createUsageRecord({
				id: `usage_filter_1_${Date.now()}`,
				workspaceId,
				agentId: agentId1,
				type: 'api_call',
				inputTokens: 100,
				outputTokens: 200,
				totalTokens: 300,
				cost: 50,
			})

			// Create usage for agent 2
			await createUsageRecord({
				id: `usage_filter_2_${Date.now()}`,
				workspaceId,
				agentId: agentId2,
				type: 'api_call',
				inputTokens: 1000,
				outputTokens: 2000,
				totalTokens: 3000,
				cost: 500,
			})

			// Filter by agent 1
			const res = await orpcRequest({
				procedure: 'analytics/get',
				cookie: setCookie,
				workspaceId,
				body: { agentId: agentId1 },
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{
				summary: {
					totalRequests: number
					totalInputTokens: number
				}
			}>(res)

			// Should only include agent 1's usage
			expect(json.summary.totalRequests).toBe(1)
			expect(json.summary.totalInputTokens).toBe(100)
		})

		it('supports groupBy parameter', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_groupby_${Date.now()}`
			const agentId = `agent_groupby_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'GroupBy Workspace',
				slug: `groupby-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await addWorkspaceMember({
				id: `member_groupby_${Date.now()}`,
				workspaceId,
				userId: userId!,
				role: 'owner',
			})

			await createAgent({
				id: agentId,
				workspaceId,
				name: 'GroupBy Agent',
				createdBy: userId!,
			})

			// Create usage record
			await createUsageRecord({
				id: `usage_groupby_${Date.now()}`,
				workspaceId,
				agentId,
				type: 'api_call',
				inputTokens: 100,
				outputTokens: 200,
				totalTokens: 300,
				cost: 50,
			})

			// Test with groupBy day (default)
			const resDay = await orpcRequest({
				procedure: 'analytics/get',
				cookie: setCookie,
				workspaceId,
				body: { groupBy: 'day' },
			})

			expect(resDay.status).toBe(200)
			const jsonDay = await parseOrpcResponse<{
				timeSeries: Array<{ date: string }>
			}>(resDay)
			expect(jsonDay.timeSeries).toBeDefined()

			// Test with groupBy week
			const resWeek = await orpcRequest({
				procedure: 'analytics/get',
				cookie: setCookie,
				workspaceId,
				body: { groupBy: 'week' },
			})

			expect(resWeek.status).toBe(200)
			const jsonWeek = await parseOrpcResponse<{
				timeSeries: Array<{ date: string }>
			}>(resWeek)
			expect(jsonWeek.timeSeries).toBeDefined()

			// Test with groupBy month
			const resMonth = await orpcRequest({
				procedure: 'analytics/get',
				cookie: setCookie,
				workspaceId,
				body: { groupBy: 'month' },
			})

			expect(resMonth.status).toBe(200)
			const jsonMonth = await parseOrpcResponse<{
				timeSeries: Array<{ date: string }>
			}>(resMonth)
			expect(jsonMonth.timeSeries).toBeDefined()
		})
	})
})
