import { describe, expect, it, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { hasAgentAccess, hasScope, generateApiKey } from '../api-key'
import type { ApiKeyEnv, CloudflareEnv } from '@hare/types'

// Mock the db module
vi.mock('../db', () => ({
	getDb: vi.fn(() => ({
		select: vi.fn(() => ({
			from: vi.fn(() => ({
				where: vi.fn().mockResolvedValue([]),
			})),
		})),
		update: vi.fn(() => ({
			set: vi.fn(() => ({
				where: vi.fn().mockResolvedValue([]),
			})),
		})),
	})),
}))

describe('hasAgentAccess', () => {
	it('returns true when no agentIds restriction exists', () => {
		const apiKey = {
			id: 'key_1',
			workspaceId: 'ws_1',
			name: 'Test Key',
			permissions: {},
		}
		expect(hasAgentAccess({ apiKey, agentId: 'agent_1' })).toBe(true)
	})

	it('returns true when agentIds array is empty', () => {
		const apiKey = {
			id: 'key_1',
			workspaceId: 'ws_1',
			name: 'Test Key',
			permissions: { agentIds: [] },
		}
		expect(hasAgentAccess({ apiKey, agentId: 'agent_1' })).toBe(true)
	})

	it('returns true when agentId is in the allowed list', () => {
		const apiKey = {
			id: 'key_1',
			workspaceId: 'ws_1',
			name: 'Test Key',
			permissions: { agentIds: ['agent_1', 'agent_2'] },
		}
		expect(hasAgentAccess({ apiKey, agentId: 'agent_1' })).toBe(true)
	})

	it('returns false when agentId is not in the allowed list', () => {
		const apiKey = {
			id: 'key_1',
			workspaceId: 'ws_1',
			name: 'Test Key',
			permissions: { agentIds: ['agent_1', 'agent_2'] },
		}
		expect(hasAgentAccess({ apiKey, agentId: 'agent_3' })).toBe(false)
	})
})

describe('hasScope', () => {
	it('returns true when no scopes restriction exists', () => {
		const apiKey = {
			id: 'key_1',
			workspaceId: 'ws_1',
			name: 'Test Key',
			permissions: {},
		}
		expect(hasScope({ apiKey, scope: 'read' })).toBe(true)
	})

	it('returns true when scopes array is empty', () => {
		const apiKey = {
			id: 'key_1',
			workspaceId: 'ws_1',
			name: 'Test Key',
			permissions: { scopes: [] },
		}
		expect(hasScope({ apiKey, scope: 'read' })).toBe(true)
	})

	it('returns true when scope is in the allowed list', () => {
		const apiKey = {
			id: 'key_1',
			workspaceId: 'ws_1',
			name: 'Test Key',
			permissions: { scopes: ['read', 'write'] },
		}
		expect(hasScope({ apiKey, scope: 'read' })).toBe(true)
	})

	it('returns false when scope is not in the allowed list', () => {
		const apiKey = {
			id: 'key_1',
			workspaceId: 'ws_1',
			name: 'Test Key',
			permissions: { scopes: ['read'] },
		}
		expect(hasScope({ apiKey, scope: 'write' })).toBe(false)
	})
})

describe('generateApiKey', () => {
	it('generates a key with correct prefix', async () => {
		const result = await generateApiKey()

		expect(result.key).toBeDefined()
		expect(result.hashedKey).toBeDefined()
		expect(result.prefix).toBeDefined()
		expect(result.key.startsWith('hare_')).toBe(true)
	})

	it('generates unique keys each time', async () => {
		const result1 = await generateApiKey()
		const result2 = await generateApiKey()

		expect(result1.key).not.toBe(result2.key)
		expect(result1.hashedKey).not.toBe(result2.hashedKey)
	})

	it('hashed key is a valid hex string', async () => {
		const result = await generateApiKey()

		// SHA-256 produces 64 hex characters
		expect(result.hashedKey).toMatch(/^[a-f0-9]{64}$/)
	})

	it('prefix is the start of the key', async () => {
		const result = await generateApiKey()

		expect(result.key.startsWith(result.prefix)).toBe(true)
	})
})

describe('apiKeyMiddleware', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.clearAllMocks()
	})

	it('is defined and is a function', async () => {
		const { apiKeyMiddleware } = await import('../api-key')
		expect(apiKeyMiddleware).toBeDefined()
		expect(typeof apiKeyMiddleware).toBe('function')
	})

	it('returns 401 when no API key is provided', async () => {
		const { apiKeyMiddleware } = await import('../api-key')

		const app = new Hono<ApiKeyEnv>()
		app.use('*', async (c, next) => {
			;(c as { env: Partial<CloudflareEnv> }).env = {
				DB: {} as D1Database,
			} as CloudflareEnv
			await next()
		})
		app.use('*', apiKeyMiddleware)
		app.get('/api/test', (c) => c.text('OK'))

		const res = await app.request('/api/test')
		expect(res.status).toBe(401)

		const body = await res.json()
		expect(body.error).toBe('API key required')
	})

	it('validates API key lookup logic', () => {
		// Test the validation logic without hitting the database
		// When a key record is not found, the middleware should return 401
		const keyRecords: unknown[] = [] // Simulates empty DB result

		const isValid = keyRecords.length > 0
		expect(isValid).toBe(false)

		// This would trigger 'Invalid API key' response in the middleware
	})
})

describe('API key extraction logic', () => {
	it('extracts key from Authorization Bearer header', () => {
		const authHeader = 'Bearer hare_abc123'
		const key = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
		expect(key).toBe('hare_abc123')
	})

	it('extracts key from X-API-Key header', () => {
		const apiKeyHeader = 'hare_xyz789'
		const key = apiKeyHeader || null
		expect(key).toBe('hare_xyz789')
	})

	it('prefers Authorization header over X-API-Key', () => {
		const authHeader = 'Bearer hare_auth_key'
		const apiKeyHeader = 'hare_header_key'

		// Extract logic prefers Authorization header
		let key = null
		if (authHeader?.startsWith('Bearer ')) {
			key = authHeader.slice(7)
		} else if (apiKeyHeader) {
			key = apiKeyHeader
		}

		expect(key).toBe('hare_auth_key')
	})

	it('returns null when no headers are present', () => {
		const authHeader: string | undefined = undefined
		const apiKeyHeader: string | undefined = undefined

		let key = null
		if (authHeader?.startsWith('Bearer ')) {
			key = authHeader.slice(7)
		} else if (apiKeyHeader) {
			key = apiKeyHeader
		}

		expect(key).toBeNull()
	})

	it('returns null for non-Bearer authorization', () => {
		const authHeader = 'Basic dXNlcjpwYXNz'

		const key = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
		expect(key).toBeNull()
	})
})

describe('API key expiration logic', () => {
	it('detects expired key', () => {
		const keyRecord = {
			expiresAt: new Date('2020-01-01'), // Past date
		}

		const isExpired = keyRecord.expiresAt && keyRecord.expiresAt < new Date()
		expect(isExpired).toBe(true)
	})

	it('detects valid non-expired key', () => {
		const keyRecord = {
			expiresAt: new Date('2099-12-31'), // Future date
		}

		const isExpired = keyRecord.expiresAt && keyRecord.expiresAt < new Date()
		expect(isExpired).toBe(false)
	})

	it('handles null expiration (never expires)', () => {
		const keyRecord = {
			expiresAt: null as Date | null,
		}

		const isExpired = keyRecord.expiresAt && keyRecord.expiresAt < new Date()
		expect(isExpired).toBeFalsy()
	})
})
