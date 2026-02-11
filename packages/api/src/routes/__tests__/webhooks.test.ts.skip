/**
 * Unit tests for webhook API routes (oRPC)
 *
 * Tests cover:
 * - webhooks.list - List webhooks for an agent
 * - webhooks.create - Create webhook with valid URL
 * - webhooks.create - Rejects invalid URL
 * - webhooks.create - Validates event types
 * - webhooks.get - Get webhook details
 * - webhooks.update - Update webhook configuration
 * - webhooks.update - Toggle webhook enabled/disabled
 * - webhooks.delete - Delete webhook (admin only)
 * - webhooks.getLogs - Get webhook delivery logs
 * - webhooks.regenerateSecret - Regenerate webhook secret (admin only)
 * - Webhook secret generation and validation
 *
 * oRPC uses pathname-based routing: webhooks.list -> /api/rpc/webhooks/list
 */

import { env } from 'cloudflare:test'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { app } from '@hare/api'
import { generateSignature, verifySignature, generateWebhookSecret } from '../../services/webhooks'
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

// Valid webhook event types
const VALID_EVENTS = ['message.received', 'message.sent', 'tool.called', 'error', 'agent.deployed']

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
	return `test-webhook-${Date.now()}-${testCounter}@example.com`
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

// Helper to create a webhook directly in DB
async function createWebhook(options: {
	id: string
	agentId: string
	url: string
	secret: string
	events: string[]
	status?: string
	description?: string
}) {
	const nowSeconds = Math.floor(Date.now() / 1000)
	await env.DB.prepare(
		`INSERT INTO webhooks (id, agentId, url, secret, events, status, description, createdAt, updatedAt)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
	)
		.bind(
			options.id,
			options.agentId,
			options.url,
			options.secret,
			JSON.stringify(options.events),
			options.status ?? 'active',
			options.description ?? null,
			nowSeconds,
			nowSeconds,
		)
		.run()
}

// Helper to create a webhook log directly in DB
async function createWebhookLog(options: {
	id: string
	webhookId: string
	event: string
	payload: Record<string, unknown>
	status?: string
	responseStatus?: number
	attempts?: number
}) {
	const nowSeconds = Math.floor(Date.now() / 1000)
	await env.DB.prepare(
		`INSERT INTO webhook_logs (id, webhookId, event, payload, status, responseStatus, attempts, createdAt)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
	)
		.bind(
			options.id,
			options.webhookId,
			options.event,
			JSON.stringify(options.payload),
			options.status ?? 'pending',
			options.responseStatus ?? null,
			options.attempts ?? 0,
			nowSeconds,
		)
		.run()
}

/**
 * Helper to make oRPC request
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

describe('Webhook API Routes', () => {
	describe('webhooks.list - List webhooks for an agent', () => {
		it('returns 403 for unauthenticated request', async () => {
			const res = await orpcRequest({
				procedure: 'webhooks/list',
				body: { agentId: 'agent_123' },
			})
			expect(res.status).toBe(403)
		})

		it('returns 403 for authenticated user without workspace context', async () => {
			const email = generateTestEmail()
			const { setCookie } = await signUpTestUser(email, 'SecurePass123!', 'Test User')

			const res = await orpcRequest({
				procedure: 'webhooks/list',
				cookie: setCookie,
				body: { agentId: 'agent_123' },
			})
			expect(res.status).toBe(403)
		})

		it('returns 404 for non-existent agent', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_wh_404_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Webhook 404 Workspace',
				slug: `webhook-404-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			const res = await orpcRequest({
				procedure: 'webhooks/list',
				cookie: setCookie,
				workspaceId,
				body: { agentId: 'nonexistent_agent' },
			})

			expect(res.status).toBe(404)
		})

		it('returns empty array for agent with no webhooks', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_wh_empty_${Date.now()}`
			const agentId = `agent_wh_empty_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Webhook Empty Workspace',
				slug: `webhook-empty-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await createAgent({
				id: agentId,
				workspaceId,
				name: 'Agent without webhooks',
				model: VALID_MODEL,
				instructions: 'Test instructions',
				createdBy: userId!,
			})

			const res = await orpcRequest({
				procedure: 'webhooks/list',
				cookie: setCookie,
				workspaceId,
				body: { agentId },
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{ webhooks: unknown[] }>(res)
			expect(json.webhooks).toEqual([])
		})

		it("returns list of agent's webhooks", async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_wh_list_${Date.now()}`
			const agentId = `agent_wh_list_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Webhook List Workspace',
				slug: `webhook-list-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await createAgent({
				id: agentId,
				workspaceId,
				name: 'Agent with webhooks',
				model: VALID_MODEL,
				instructions: 'Test instructions',
				createdBy: userId!,
			})

			// Create some webhooks
			await createWebhook({
				id: `webhook_list_1_${Date.now()}`,
				agentId,
				url: 'https://example.com/webhook1',
				secret: 'secret123',
				events: ['message.received'],
				description: 'First webhook',
			})

			await createWebhook({
				id: `webhook_list_2_${Date.now()}`,
				agentId,
				url: 'https://example.com/webhook2',
				secret: 'secret456',
				events: ['message.sent', 'error'],
				description: 'Second webhook',
			})

			const res = await orpcRequest({
				procedure: 'webhooks/list',
				cookie: setCookie,
				workspaceId,
				body: { agentId },
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{ webhooks: Array<{ url: string }> }>(res)
			expect(json.webhooks).toHaveLength(2)
			expect(json.webhooks.map((w) => w.url).sort()).toEqual([
				'https://example.com/webhook1',
				'https://example.com/webhook2',
			])
		})

		it('does not return webhooks from other agents', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_wh_isolation_${Date.now()}`
			const agentId1 = `agent_wh_iso_1_${Date.now()}`
			const agentId2 = `agent_wh_iso_2_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Webhook Isolation Workspace',
				slug: `webhook-isolation-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await createAgent({
				id: agentId1,
				workspaceId,
				name: 'Agent 1',
				model: VALID_MODEL,
				instructions: 'Test instructions',
				createdBy: userId!,
			})

			await createAgent({
				id: agentId2,
				workspaceId,
				name: 'Agent 2',
				model: VALID_MODEL,
				instructions: 'Test instructions',
				createdBy: userId!,
			})

			// Create webhook for agent 1
			await createWebhook({
				id: `webhook_iso_1_${Date.now()}`,
				agentId: agentId1,
				url: 'https://example.com/agent1-webhook',
				secret: 'secret123',
				events: ['message.received'],
			})

			// Create webhook for agent 2
			await createWebhook({
				id: `webhook_iso_2_${Date.now()}`,
				agentId: agentId2,
				url: 'https://example.com/agent2-webhook',
				secret: 'secret456',
				events: ['message.sent'],
			})

			// List webhooks for agent 1
			const res = await orpcRequest({
				procedure: 'webhooks/list',
				cookie: setCookie,
				workspaceId,
				body: { agentId: agentId1 },
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{ webhooks: Array<{ url: string }> }>(res)
			expect(json.webhooks).toHaveLength(1)
			expect(json.webhooks[0]?.url).toBe('https://example.com/agent1-webhook')
		})
	})

	describe('webhooks.create - Create webhook', () => {
		it('creates webhook with valid data', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_wh_create_${Date.now()}`
			const agentId = `agent_wh_create_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Webhook Create Workspace',
				slug: `webhook-create-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await createAgent({
				id: agentId,
				workspaceId,
				name: 'Agent for webhook',
				model: VALID_MODEL,
				instructions: 'Test instructions',
				createdBy: userId!,
			})

			const res = await orpcRequest({
				procedure: 'webhooks/create',
				cookie: setCookie,
				workspaceId,
				body: {
					agentId,
					url: 'https://example.com/webhook',
					events: ['message.received', 'message.sent'],
					description: 'Test webhook',
				},
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{
				id: string
				agentId: string
				url: string
				secret: string
				events: string[]
				status: string
				description: string
			}>(res)
			expect(json.id).toBeDefined()
			expect(json.agentId).toBe(agentId)
			expect(json.url).toBe('https://example.com/webhook')
			expect(json.secret).toBeDefined()
			expect(json.secret.length).toBe(64) // 32 bytes = 64 hex chars
			expect(json.events).toEqual(['message.received', 'message.sent'])
			expect(json.status).toBe('active')
			expect(json.description).toBe('Test webhook')
		})

		it('rejects invalid URL', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_wh_invalid_url_${Date.now()}`
			const agentId = `agent_wh_invalid_url_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Webhook Invalid URL Workspace',
				slug: `webhook-invalid-url-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await createAgent({
				id: agentId,
				workspaceId,
				name: 'Agent for webhook',
				model: VALID_MODEL,
				instructions: 'Test instructions',
				createdBy: userId!,
			})

			const res = await orpcRequest({
				procedure: 'webhooks/create',
				cookie: setCookie,
				workspaceId,
				body: {
					agentId,
					url: 'not-a-valid-url',
					events: ['message.received'],
				},
			})

			expect(res.status).toBe(400)
		})

		it('rejects missing URL', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_wh_missing_url_${Date.now()}`
			const agentId = `agent_wh_missing_url_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Webhook Missing URL Workspace',
				slug: `webhook-missing-url-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await createAgent({
				id: agentId,
				workspaceId,
				name: 'Agent for webhook',
				model: VALID_MODEL,
				instructions: 'Test instructions',
				createdBy: userId!,
			})

			const res = await orpcRequest({
				procedure: 'webhooks/create',
				cookie: setCookie,
				workspaceId,
				body: {
					agentId,
					events: ['message.received'],
				},
			})

			expect(res.status).toBe(400)
		})

		it('validates event types - rejects invalid event', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_wh_invalid_event_${Date.now()}`
			const agentId = `agent_wh_invalid_event_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Webhook Invalid Event Workspace',
				slug: `webhook-invalid-event-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await createAgent({
				id: agentId,
				workspaceId,
				name: 'Agent for webhook',
				model: VALID_MODEL,
				instructions: 'Test instructions',
				createdBy: userId!,
			})

			const res = await orpcRequest({
				procedure: 'webhooks/create',
				cookie: setCookie,
				workspaceId,
				body: {
					agentId,
					url: 'https://example.com/webhook',
					events: ['invalid.event.type'],
				},
			})

			expect(res.status).toBe(400)
		})

		it('validates event types - rejects empty events array', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_wh_empty_events_${Date.now()}`
			const agentId = `agent_wh_empty_events_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Webhook Empty Events Workspace',
				slug: `webhook-empty-events-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await createAgent({
				id: agentId,
				workspaceId,
				name: 'Agent for webhook',
				model: VALID_MODEL,
				instructions: 'Test instructions',
				createdBy: userId!,
			})

			const res = await orpcRequest({
				procedure: 'webhooks/create',
				cookie: setCookie,
				workspaceId,
				body: {
					agentId,
					url: 'https://example.com/webhook',
					events: [],
				},
			})

			expect(res.status).toBe(400)
		})

		it('returns 404 for non-existent agent', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_wh_create_404_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Webhook Create 404 Workspace',
				slug: `webhook-create-404-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			const res = await orpcRequest({
				procedure: 'webhooks/create',
				cookie: setCookie,
				workspaceId,
				body: {
					agentId: 'nonexistent_agent',
					url: 'https://example.com/webhook',
					events: ['message.received'],
				},
			})

			expect(res.status).toBe(404)
		})

		it('accepts all valid event types', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_wh_all_events_${Date.now()}`
			const agentId = `agent_wh_all_events_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Webhook All Events Workspace',
				slug: `webhook-all-events-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await createAgent({
				id: agentId,
				workspaceId,
				name: 'Agent for webhook',
				model: VALID_MODEL,
				instructions: 'Test instructions',
				createdBy: userId!,
			})

			const res = await orpcRequest({
				procedure: 'webhooks/create',
				cookie: setCookie,
				workspaceId,
				body: {
					agentId,
					url: 'https://example.com/webhook',
					events: VALID_EVENTS,
				},
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{ events: string[] }>(res)
			expect(json.events).toEqual(VALID_EVENTS)
		})
	})

	describe('webhooks.get - Get webhook details', () => {
		it('returns webhook details', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_wh_get_${Date.now()}`
			const agentId = `agent_wh_get_${Date.now()}`
			const webhookId = `webhook_get_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Webhook Get Workspace',
				slug: `webhook-get-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await createAgent({
				id: agentId,
				workspaceId,
				name: 'Agent for webhook',
				model: VALID_MODEL,
				instructions: 'Test instructions',
				createdBy: userId!,
			})

			await createWebhook({
				id: webhookId,
				agentId,
				url: 'https://example.com/webhook',
				secret: 'test-secret-12345',
				events: ['message.received', 'error'],
				description: 'Test webhook',
			})

			const res = await orpcRequest({
				procedure: 'webhooks/get',
				cookie: setCookie,
				workspaceId,
				body: { agentId, webhookId },
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{
				id: string
				url: string
				secret: string
				events: string[]
				status: string
				description: string
			}>(res)
			expect(json.id).toBe(webhookId)
			expect(json.url).toBe('https://example.com/webhook')
			expect(json.secret).toBe('test-secret-12345')
			expect(json.events).toEqual(['message.received', 'error'])
			expect(json.status).toBe('active')
			expect(json.description).toBe('Test webhook')
		})

		it('returns 404 for non-existent webhook', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_wh_get_404_${Date.now()}`
			const agentId = `agent_wh_get_404_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Webhook Get 404 Workspace',
				slug: `webhook-get-404-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await createAgent({
				id: agentId,
				workspaceId,
				name: 'Agent for webhook',
				model: VALID_MODEL,
				instructions: 'Test instructions',
				createdBy: userId!,
			})

			const res = await orpcRequest({
				procedure: 'webhooks/get',
				cookie: setCookie,
				workspaceId,
				body: { agentId, webhookId: 'nonexistent_webhook' },
			})

			expect(res.status).toBe(404)
		})
	})

	describe('webhooks.update - Update webhook configuration', () => {
		it('updates webhook URL', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_wh_update_url_${Date.now()}`
			const agentId = `agent_wh_update_url_${Date.now()}`
			const webhookId = `webhook_update_url_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Webhook Update URL Workspace',
				slug: `webhook-update-url-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await createAgent({
				id: agentId,
				workspaceId,
				name: 'Agent for webhook',
				model: VALID_MODEL,
				instructions: 'Test instructions',
				createdBy: userId!,
			})

			await createWebhook({
				id: webhookId,
				agentId,
				url: 'https://old-url.com/webhook',
				secret: 'test-secret',
				events: ['message.received'],
			})

			const res = await orpcRequest({
				procedure: 'webhooks/update',
				cookie: setCookie,
				workspaceId,
				body: {
					agentId,
					webhookId,
					url: 'https://new-url.com/webhook',
				},
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{ url: string }>(res)
			expect(json.url).toBe('https://new-url.com/webhook')
		})

		it('updates webhook events', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_wh_update_events_${Date.now()}`
			const agentId = `agent_wh_update_events_${Date.now()}`
			const webhookId = `webhook_update_events_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Webhook Update Events Workspace',
				slug: `webhook-update-events-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await createAgent({
				id: agentId,
				workspaceId,
				name: 'Agent for webhook',
				model: VALID_MODEL,
				instructions: 'Test instructions',
				createdBy: userId!,
			})

			await createWebhook({
				id: webhookId,
				agentId,
				url: 'https://example.com/webhook',
				secret: 'test-secret',
				events: ['message.received'],
			})

			const res = await orpcRequest({
				procedure: 'webhooks/update',
				cookie: setCookie,
				workspaceId,
				body: {
					agentId,
					webhookId,
					events: ['message.sent', 'error', 'tool.called'],
				},
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{ events: string[] }>(res)
			expect(json.events).toEqual(['message.sent', 'error', 'tool.called'])
		})

		it('updates webhook description', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_wh_update_desc_${Date.now()}`
			const agentId = `agent_wh_update_desc_${Date.now()}`
			const webhookId = `webhook_update_desc_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Webhook Update Desc Workspace',
				slug: `webhook-update-desc-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await createAgent({
				id: agentId,
				workspaceId,
				name: 'Agent for webhook',
				model: VALID_MODEL,
				instructions: 'Test instructions',
				createdBy: userId!,
			})

			await createWebhook({
				id: webhookId,
				agentId,
				url: 'https://example.com/webhook',
				secret: 'test-secret',
				events: ['message.received'],
				description: 'Original description',
			})

			const res = await orpcRequest({
				procedure: 'webhooks/update',
				cookie: setCookie,
				workspaceId,
				body: {
					agentId,
					webhookId,
					description: 'Updated description',
				},
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{ description: string }>(res)
			expect(json.description).toBe('Updated description')
		})

		it('toggles webhook status - disable (active to inactive)', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_wh_disable_${Date.now()}`
			const agentId = `agent_wh_disable_${Date.now()}`
			const webhookId = `webhook_disable_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Webhook Disable Workspace',
				slug: `webhook-disable-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await createAgent({
				id: agentId,
				workspaceId,
				name: 'Agent for webhook',
				model: VALID_MODEL,
				instructions: 'Test instructions',
				createdBy: userId!,
			})

			await createWebhook({
				id: webhookId,
				agentId,
				url: 'https://example.com/webhook',
				secret: 'test-secret',
				events: ['message.received'],
				status: 'active',
			})

			const res = await orpcRequest({
				procedure: 'webhooks/update',
				cookie: setCookie,
				workspaceId,
				body: {
					agentId,
					webhookId,
					status: 'inactive',
				},
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{ status: string }>(res)
			expect(json.status).toBe('inactive')
		})

		it('toggles webhook status - enable (inactive to active)', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_wh_enable_${Date.now()}`
			const agentId = `agent_wh_enable_${Date.now()}`
			const webhookId = `webhook_enable_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Webhook Enable Workspace',
				slug: `webhook-enable-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await createAgent({
				id: agentId,
				workspaceId,
				name: 'Agent for webhook',
				model: VALID_MODEL,
				instructions: 'Test instructions',
				createdBy: userId!,
			})

			await createWebhook({
				id: webhookId,
				agentId,
				url: 'https://example.com/webhook',
				secret: 'test-secret',
				events: ['message.received'],
				status: 'inactive',
			})

			const res = await orpcRequest({
				procedure: 'webhooks/update',
				cookie: setCookie,
				workspaceId,
				body: {
					agentId,
					webhookId,
					status: 'active',
				},
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{ status: string }>(res)
			expect(json.status).toBe('active')
		})

		it('reactivates failed webhook', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_wh_reactivate_${Date.now()}`
			const agentId = `agent_wh_reactivate_${Date.now()}`
			const webhookId = `webhook_reactivate_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Webhook Reactivate Workspace',
				slug: `webhook-reactivate-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await createAgent({
				id: agentId,
				workspaceId,
				name: 'Agent for webhook',
				model: VALID_MODEL,
				instructions: 'Test instructions',
				createdBy: userId!,
			})

			await createWebhook({
				id: webhookId,
				agentId,
				url: 'https://example.com/webhook',
				secret: 'test-secret',
				events: ['message.received'],
				status: 'failed',
			})

			const res = await orpcRequest({
				procedure: 'webhooks/update',
				cookie: setCookie,
				workspaceId,
				body: {
					agentId,
					webhookId,
					status: 'active',
				},
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{ status: string }>(res)
			expect(json.status).toBe('active')
		})

		it('rejects invalid URL on update', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_wh_update_invalid_url_${Date.now()}`
			const agentId = `agent_wh_update_invalid_url_${Date.now()}`
			const webhookId = `webhook_update_invalid_url_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Webhook Update Invalid URL Workspace',
				slug: `webhook-update-invalid-url-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await createAgent({
				id: agentId,
				workspaceId,
				name: 'Agent for webhook',
				model: VALID_MODEL,
				instructions: 'Test instructions',
				createdBy: userId!,
			})

			await createWebhook({
				id: webhookId,
				agentId,
				url: 'https://example.com/webhook',
				secret: 'test-secret',
				events: ['message.received'],
			})

			const res = await orpcRequest({
				procedure: 'webhooks/update',
				cookie: setCookie,
				workspaceId,
				body: {
					agentId,
					webhookId,
					url: 'not-a-valid-url',
				},
			})

			expect(res.status).toBe(400)
		})

		it('returns 404 for non-existent webhook', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_wh_update_404_${Date.now()}`
			const agentId = `agent_wh_update_404_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Webhook Update 404 Workspace',
				slug: `webhook-update-404-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await createAgent({
				id: agentId,
				workspaceId,
				name: 'Agent for webhook',
				model: VALID_MODEL,
				instructions: 'Test instructions',
				createdBy: userId!,
			})

			const res = await orpcRequest({
				procedure: 'webhooks/update',
				cookie: setCookie,
				workspaceId,
				body: {
					agentId,
					webhookId: 'nonexistent_webhook',
					url: 'https://new-url.com/webhook',
				},
			})

			expect(res.status).toBe(404)
		})
	})

	describe('webhooks.delete - Delete webhook (admin only)', () => {
		it('deletes webhook as admin/owner', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_wh_delete_${Date.now()}`
			const agentId = `agent_wh_delete_${Date.now()}`
			const webhookId = `webhook_delete_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Webhook Delete Workspace',
				slug: `webhook-delete-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await createAgent({
				id: agentId,
				workspaceId,
				name: 'Agent for webhook',
				model: VALID_MODEL,
				instructions: 'Test instructions',
				createdBy: userId!,
			})

			await createWebhook({
				id: webhookId,
				agentId,
				url: 'https://example.com/webhook',
				secret: 'test-secret',
				events: ['message.received'],
			})

			const res = await orpcRequest({
				procedure: 'webhooks/delete',
				cookie: setCookie,
				workspaceId,
				body: { agentId, webhookId },
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{ success: boolean }>(res)
			expect(json.success).toBe(true)

			// Verify webhook is deleted
			const getRes = await orpcRequest({
				procedure: 'webhooks/get',
				cookie: setCookie,
				workspaceId,
				body: { agentId, webhookId },
			})
			expect(getRes.status).toBe(404)
		})

		it('returns 404 for non-existent webhook', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_wh_delete_404_${Date.now()}`
			const agentId = `agent_wh_delete_404_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Webhook Delete 404 Workspace',
				slug: `webhook-delete-404-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await createAgent({
				id: agentId,
				workspaceId,
				name: 'Agent for webhook',
				model: VALID_MODEL,
				instructions: 'Test instructions',
				createdBy: userId!,
			})

			const res = await orpcRequest({
				procedure: 'webhooks/delete',
				cookie: setCookie,
				workspaceId,
				body: { agentId, webhookId: 'nonexistent_webhook' },
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

			const workspaceId = `ws_wh_delete_member_${Date.now()}`
			const agentId = `agent_wh_delete_member_${Date.now()}`
			const webhookId = `webhook_delete_member_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Webhook Delete Member Workspace',
				slug: `webhook-delete-member-workspace-${Date.now()}`,
				ownerId: ownerId!,
			})

			// Add user2 as a member (not admin)
			await addWorkspaceMember({
				id: `member_wh_delete_${Date.now()}`,
				workspaceId,
				userId: memberId!,
				role: 'member',
			})

			await createAgent({
				id: agentId,
				workspaceId,
				name: 'Agent for webhook',
				model: VALID_MODEL,
				instructions: 'Test instructions',
				createdBy: ownerId!,
			})

			await createWebhook({
				id: webhookId,
				agentId,
				url: 'https://example.com/webhook',
				secret: 'test-secret',
				events: ['message.received'],
			})

			// Member should not be able to delete
			const res = await orpcRequest({
				procedure: 'webhooks/delete',
				cookie: memberCookie,
				workspaceId,
				body: { agentId, webhookId },
			})

			expect(res.status).toBe(403)
		})
	})

	describe('webhooks.getLogs - Get webhook delivery logs', () => {
		it('returns webhook delivery logs', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_wh_logs_${Date.now()}`
			const agentId = `agent_wh_logs_${Date.now()}`
			const webhookId = `webhook_logs_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Webhook Logs Workspace',
				slug: `webhook-logs-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await createAgent({
				id: agentId,
				workspaceId,
				name: 'Agent for webhook',
				model: VALID_MODEL,
				instructions: 'Test instructions',
				createdBy: userId!,
			})

			await createWebhook({
				id: webhookId,
				agentId,
				url: 'https://example.com/webhook',
				secret: 'test-secret',
				events: ['message.received'],
			})

			// Create some logs
			await createWebhookLog({
				id: `log_1_${Date.now()}`,
				webhookId,
				event: 'message.received',
				payload: { message: 'Hello' },
				status: 'success',
				responseStatus: 200,
				attempts: 1,
			})

			await createWebhookLog({
				id: `log_2_${Date.now()}`,
				webhookId,
				event: 'message.sent',
				payload: { message: 'World' },
				status: 'failed',
				responseStatus: 500,
				attempts: 3,
			})

			const res = await orpcRequest({
				procedure: 'webhooks/getLogs',
				cookie: setCookie,
				workspaceId,
				body: { agentId, webhookId },
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{
				logs: Array<{ event: string; status: string }>
				total: number
			}>(res)
			expect(json.total).toBe(2)
			expect(json.logs).toHaveLength(2)
		})

		it('supports pagination', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_wh_logs_page_${Date.now()}`
			const agentId = `agent_wh_logs_page_${Date.now()}`
			const webhookId = `webhook_logs_page_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Webhook Logs Page Workspace',
				slug: `webhook-logs-page-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await createAgent({
				id: agentId,
				workspaceId,
				name: 'Agent for webhook',
				model: VALID_MODEL,
				instructions: 'Test instructions',
				createdBy: userId!,
			})

			await createWebhook({
				id: webhookId,
				agentId,
				url: 'https://example.com/webhook',
				secret: 'test-secret',
				events: ['message.received'],
			})

			// Create many logs
			for (let i = 0; i < 5; i++) {
				await createWebhookLog({
					id: `log_page_${Date.now()}_${i}`,
					webhookId,
					event: 'message.received',
					payload: { index: i },
					status: 'success',
					attempts: 1,
				})
			}

			// Get first page
			const res = await orpcRequest({
				procedure: 'webhooks/getLogs',
				cookie: setCookie,
				workspaceId,
				body: { agentId, webhookId, limit: 2, offset: 0 },
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{ logs: unknown[]; total: number }>(res)
			expect(json.total).toBe(5)
			expect(json.logs).toHaveLength(2)
		})

		it('returns 404 for non-existent webhook', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_wh_logs_404_${Date.now()}`
			const agentId = `agent_wh_logs_404_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Webhook Logs 404 Workspace',
				slug: `webhook-logs-404-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await createAgent({
				id: agentId,
				workspaceId,
				name: 'Agent for webhook',
				model: VALID_MODEL,
				instructions: 'Test instructions',
				createdBy: userId!,
			})

			const res = await orpcRequest({
				procedure: 'webhooks/getLogs',
				cookie: setCookie,
				workspaceId,
				body: { agentId, webhookId: 'nonexistent_webhook' },
			})

			expect(res.status).toBe(404)
		})
	})

	describe('webhooks.regenerateSecret - Regenerate webhook secret (admin only)', () => {
		it('regenerates webhook secret as admin/owner', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_wh_regen_${Date.now()}`
			const agentId = `agent_wh_regen_${Date.now()}`
			const webhookId = `webhook_regen_${Date.now()}`
			const originalSecret = 'original-secret-12345'

			await createWorkspace({
				id: workspaceId,
				name: 'Webhook Regen Workspace',
				slug: `webhook-regen-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await createAgent({
				id: agentId,
				workspaceId,
				name: 'Agent for webhook',
				model: VALID_MODEL,
				instructions: 'Test instructions',
				createdBy: userId!,
			})

			await createWebhook({
				id: webhookId,
				agentId,
				url: 'https://example.com/webhook',
				secret: originalSecret,
				events: ['message.received'],
			})

			const res = await orpcRequest({
				procedure: 'webhooks/regenerateSecret',
				cookie: setCookie,
				workspaceId,
				body: { agentId, webhookId },
			})

			expect(res.status).toBe(200)
			const json = await parseOrpcResponse<{ secret: string }>(res)
			expect(json.secret).toBeDefined()
			expect(json.secret).not.toBe(originalSecret)
			expect(json.secret.length).toBe(64) // 32 bytes = 64 hex chars
		})

		it('returns 404 for non-existent webhook', async () => {
			const email = generateTestEmail()
			const { setCookie, userId } = await signUpTestUser(email, 'SecurePass123!', 'Test User')
			const workspaceId = `ws_wh_regen_404_${Date.now()}`
			const agentId = `agent_wh_regen_404_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Webhook Regen 404 Workspace',
				slug: `webhook-regen-404-workspace-${Date.now()}`,
				ownerId: userId!,
			})

			await createAgent({
				id: agentId,
				workspaceId,
				name: 'Agent for webhook',
				model: VALID_MODEL,
				instructions: 'Test instructions',
				createdBy: userId!,
			})

			const res = await orpcRequest({
				procedure: 'webhooks/regenerateSecret',
				cookie: setCookie,
				workspaceId,
				body: { agentId, webhookId: 'nonexistent_webhook' },
			})

			expect(res.status).toBe(404)
		})

		it('rejects regenerate from non-admin member', async () => {
			const email1 = generateTestEmail()
			const email2 = generateTestEmail()
			const { userId: ownerId } = await signUpTestUser(email1, 'SecurePass123!', 'Owner')
			const { setCookie: memberCookie, userId: memberId } = await signUpTestUser(
				email2,
				'SecurePass123!',
				'Member',
			)

			const workspaceId = `ws_wh_regen_member_${Date.now()}`
			const agentId = `agent_wh_regen_member_${Date.now()}`
			const webhookId = `webhook_regen_member_${Date.now()}`

			await createWorkspace({
				id: workspaceId,
				name: 'Webhook Regen Member Workspace',
				slug: `webhook-regen-member-workspace-${Date.now()}`,
				ownerId: ownerId!,
			})

			// Add user2 as a member (not admin)
			await addWorkspaceMember({
				id: `member_wh_regen_${Date.now()}`,
				workspaceId,
				userId: memberId!,
				role: 'member',
			})

			await createAgent({
				id: agentId,
				workspaceId,
				name: 'Agent for webhook',
				model: VALID_MODEL,
				instructions: 'Test instructions',
				createdBy: ownerId!,
			})

			await createWebhook({
				id: webhookId,
				agentId,
				url: 'https://example.com/webhook',
				secret: 'test-secret',
				events: ['message.received'],
			})

			// Member should not be able to regenerate secret
			const res = await orpcRequest({
				procedure: 'webhooks/regenerateSecret',
				cookie: memberCookie,
				workspaceId,
				body: { agentId, webhookId },
			})

			expect(res.status).toBe(403)
		})
	})

	describe('Webhook secret generation and validation', () => {
		it('generateWebhookSecret generates 64-character hex string', () => {
			const secret = generateWebhookSecret()
			expect(secret).toBeDefined()
			expect(secret.length).toBe(64)
			expect(/^[0-9a-f]+$/.test(secret)).toBe(true)
		})

		it('generateWebhookSecret generates unique secrets', () => {
			const secrets = new Set<string>()
			for (let i = 0; i < 100; i++) {
				secrets.add(generateWebhookSecret())
			}
			expect(secrets.size).toBe(100)
		})

		it('generateSignature produces consistent signatures', async () => {
			const payload = JSON.stringify({ event: 'test', data: { message: 'hello' } })
			const secret = 'test-secret-key'

			const sig1 = await generateSignature({ payload, secret })
			const sig2 = await generateSignature({ payload, secret })

			expect(sig1).toBe(sig2)
			expect(sig1.length).toBe(64) // SHA-256 = 32 bytes = 64 hex chars
		})

		it('generateSignature produces different signatures for different payloads', async () => {
			const secret = 'test-secret-key'

			const sig1 = await generateSignature({
				payload: JSON.stringify({ message: 'hello' }),
				secret,
			})
			const sig2 = await generateSignature({
				payload: JSON.stringify({ message: 'world' }),
				secret,
			})

			expect(sig1).not.toBe(sig2)
		})

		it('generateSignature produces different signatures for different secrets', async () => {
			const payload = JSON.stringify({ message: 'hello' })

			const sig1 = await generateSignature({ payload, secret: 'secret1' })
			const sig2 = await generateSignature({ payload, secret: 'secret2' })

			expect(sig1).not.toBe(sig2)
		})

		it('verifySignature validates correct signatures', async () => {
			const payload = JSON.stringify({ event: 'test', data: { message: 'hello' } })
			const secret = 'test-secret-key'

			const signature = await generateSignature({ payload, secret })
			const isValid = await verifySignature({ payload, signature, secret })

			expect(isValid).toBe(true)
		})

		it('verifySignature rejects incorrect signatures', async () => {
			const payload = JSON.stringify({ event: 'test', data: { message: 'hello' } })
			const secret = 'test-secret-key'

			const isValid = await verifySignature({
				payload,
				signature: 'invalid-signature',
				secret,
			})

			expect(isValid).toBe(false)
		})

		it('verifySignature rejects tampered payloads', async () => {
			const originalPayload = JSON.stringify({ event: 'test', data: { message: 'hello' } })
			const tamperedPayload = JSON.stringify({ event: 'test', data: { message: 'tampered' } })
			const secret = 'test-secret-key'

			const signature = await generateSignature({ payload: originalPayload, secret })
			const isValid = await verifySignature({
				payload: tamperedPayload,
				signature,
				secret,
			})

			expect(isValid).toBe(false)
		})

		it('verifySignature rejects wrong secret', async () => {
			const payload = JSON.stringify({ event: 'test', data: { message: 'hello' } })

			const signature = await generateSignature({ payload, secret: 'correct-secret' })
			const isValid = await verifySignature({
				payload,
				signature,
				secret: 'wrong-secret',
			})

			expect(isValid).toBe(false)
		})
	})
})
