import { describe, expect, it, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import type { CloudflareEnv } from '@hare/types'
import type { McpAuthEnv } from '../mcp-auth'

// Mock the auth module
const mockGetSession = vi.fn()
vi.mock('@hare/auth/server', () => ({
	createAuth: vi.fn(() => ({
		api: {
			getSession: mockGetSession,
		},
	})),
}))

// Use a single mock DB object that persists per test
let mockDbInstance: {
	selectResults: unknown[][]
	selectCallIndex: number
	updateCalled: boolean
}

vi.mock('../../db', () => ({
	getD1: vi.fn(() => ({})),
	getDb: vi.fn(() => {
		const db = {
			select: () => ({
				from: () => ({
					where: () => {
						const results = mockDbInstance.selectResults[mockDbInstance.selectCallIndex] ?? []
						mockDbInstance.selectCallIndex++
						return Promise.resolve(results)
					},
				}),
			}),
			update: () => ({
				set: () => ({
					where: () => {
						mockDbInstance.updateCalled = true
						return Promise.resolve([])
					},
				}),
			}),
		}
		return db
	}),
}))

// Mock drizzle-orm eq
vi.mock('drizzle-orm', () => ({
	eq: vi.fn((_col, val) => ({ _type: 'eq', value: val })),
}))

// Mock @hare/db schema
vi.mock('@hare/db', () => ({
	apiKeys: { hashedKey: 'hashedKey', id: 'id' },
	workspaces: { id: 'id' },
}))

const { mcpAuthMiddleware } = await import('../mcp-auth')

/**
 * Create a test Hono app with the MCP auth middleware.
 */
const mockEnv = {
	DB: {} as D1Database,
	BETTER_AUTH_SECRET: 'test-secret-must-be-at-least-32-characters-long',
	APP_URL: 'http://localhost:3000',
} as CloudflareEnv

const mockExecutionCtx = {
	waitUntil: vi.fn(),
	passThroughOnException: vi.fn(),
	props: {},
} as ExecutionContext

function createTestApp() {
	const app = new Hono<McpAuthEnv>()
	app.use('*', mcpAuthMiddleware)
	app.get('/mcp/test', (c) => c.json({ ok: true }))
	return app
}

/**
 * Make a request to the test app with proper Workers env and executionCtx.
 */
async function appRequest(
	app: ReturnType<typeof createTestApp>,
	path: string,
	options?: { headers?: Record<string, string> },
) {
	const headers = new Headers(options?.headers)
	const req = new Request(`http://localhost${path}`, { headers })
	return app.fetch(req, mockEnv, mockExecutionCtx)
}

describe('MCP Auth Middleware', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockGetSession.mockResolvedValue(null)
		mockDbInstance = {
			selectResults: [],
			selectCallIndex: 0,
			updateCalled: false,
		}
	})

	it('returns 401 when no auth is provided', async () => {
		const app = createTestApp()
		const res = await appRequest(app, '/mcp/test')

		expect(res.status).toBe(401)
		const body = (await res.json()) as { error: string }
		expect(body.error).toBe('Authentication required')
	})

	it('passes with valid session cookie', async () => {
		mockGetSession.mockResolvedValue({
			user: {
				id: 'user_123',
				email: 'test@example.com',
				name: 'Test User',
				image: null,
			},
			session: {
				id: 'session_456',
				expiresAt: new Date('2030-01-01'),
			},
		})

		const app = createTestApp()
		const res = await appRequest(app, '/mcp/test', {
			headers: {
				Cookie: 'session=valid-session-cookie',
			},
		})

		expect(res.status).toBe(200)
		const body = (await res.json()) as { ok: boolean }
		expect(body.ok).toBe(true)
	})

	it('passes with valid API key via X-API-Key header', async () => {
		mockGetSession.mockResolvedValue(null)

		mockDbInstance.selectResults = [
			// First select: apiKeys lookup
			[{
				id: 'key_1',
				hashedKey: 'hashed',
				workspaceId: 'ws_1',
				name: 'Test API Key',
				expiresAt: null,
			}],
			// Second select: workspace lookup
			[{
				id: 'ws_1',
				ownerId: 'user_owner',
			}],
		]

		const app = createTestApp()
		const res = await appRequest(app, '/mcp/test', {
			headers: {
				'X-API-Key': 'hare_test-api-key-value',
			},
		})

		expect(res.status).toBe(200)
	})

	it('passes with valid API key via Bearer token', async () => {
		mockGetSession.mockResolvedValue(null)

		mockDbInstance.selectResults = [
			[{
				id: 'key_1',
				hashedKey: 'hashed',
				workspaceId: 'ws_1',
				name: 'Bearer Key',
				expiresAt: null,
			}],
			[{
				id: 'ws_1',
				ownerId: 'user_owner',
			}],
		]

		const app = createTestApp()
		const res = await appRequest(app, '/mcp/test', {
			headers: {
				Authorization: 'Bearer hare_test-bearer-key',
			},
		})

		expect(res.status).toBe(200)
	})

	it('returns 401 with invalid API key (no matching record)', async () => {
		mockGetSession.mockResolvedValue(null)

		// No results for any select
		mockDbInstance.selectResults = [[], []]

		const app = createTestApp()
		const res = await appRequest(app, '/mcp/test', {
			headers: {
				'X-API-Key': 'hare_invalid-key',
			},
		})

		expect(res.status).toBe(401)
	})

	it('returns 401 with expired API key', async () => {
		mockGetSession.mockResolvedValue(null)

		mockDbInstance.selectResults = [
			[{
				id: 'key_1',
				hashedKey: 'hashed',
				workspaceId: 'ws_1',
				name: 'Expired Key',
				expiresAt: new Date('2020-01-01'),
			}],
		]

		const app = createTestApp()
		const res = await appRequest(app, '/mcp/test', {
			headers: {
				'X-API-Key': 'hare_expired-key',
			},
		})

		expect(res.status).toBe(401)
		const body = (await res.json()) as { error: string }
		expect(body.error).toBe('API key expired')
	})

	it('falls back to API key when session auth throws', async () => {
		mockGetSession.mockRejectedValue(new Error('Session check failed'))

		mockDbInstance.selectResults = [
			[{
				id: 'key_1',
				hashedKey: 'hashed',
				workspaceId: 'ws_1',
				name: 'Fallback Key',
				expiresAt: null,
			}],
			[{
				id: 'ws_1',
				ownerId: 'user_owner',
			}],
		]

		const app = createTestApp()
		const res = await appRequest(app, '/mcp/test', {
			headers: {
				Authorization: 'Bearer hare_fallback-key',
			},
		})

		expect(res.status).toBe(200)
	})

	it('returns 401 when API key has no matching workspace', async () => {
		mockGetSession.mockResolvedValue(null)

		mockDbInstance.selectResults = [
			[{
				id: 'key_1',
				hashedKey: 'hashed',
				workspaceId: 'ws_orphan',
				name: 'Orphan Key',
				expiresAt: null,
			}],
			[], // workspace not found
		]

		const app = createTestApp()
		const res = await appRequest(app, '/mcp/test', {
			headers: {
				'X-API-Key': 'hare_orphan-key',
			},
		})

		expect(res.status).toBe(401)
	})
})
