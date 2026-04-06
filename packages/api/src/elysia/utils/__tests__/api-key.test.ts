import { describe, expect, it } from 'vitest'
import { extractApiKey, generateApiKey, hasAgentAccess, hashApiKey, hasScope } from '../api-key'

describe('hashApiKey', () => {
	it('returns a 64-character hex string', async () => {
		const hash = await hashApiKey('test-key')
		expect(hash).toMatch(/^[0-9a-f]{64}$/)
	})

	it('is deterministic for the same input', async () => {
		const hash1 = await hashApiKey('same-key')
		const hash2 = await hashApiKey('same-key')
		expect(hash1).toBe(hash2)
	})

	it('produces different hashes for different inputs', async () => {
		const hash1 = await hashApiKey('key-a')
		const hash2 = await hashApiKey('key-b')
		expect(hash1).not.toBe(hash2)
	})
})

describe('generateApiKey', () => {
	it('returns key, hashedKey, and prefix', async () => {
		const result = await generateApiKey()
		expect(result).toHaveProperty('key')
		expect(result).toHaveProperty('hashedKey')
		expect(result).toHaveProperty('prefix')
	})

	it('key starts with the expected prefix', async () => {
		const { key } = await generateApiKey()
		expect(key).toMatch(/^hare_/)
	})

	it('hashedKey is a valid SHA-256 hex string', async () => {
		const { hashedKey } = await generateApiKey()
		expect(hashedKey).toMatch(/^[0-9a-f]{64}$/)
	})

	it('hashedKey matches hashing the key directly', async () => {
		const { key, hashedKey } = await generateApiKey()
		const expectedHash = await hashApiKey(key)
		expect(hashedKey).toBe(expectedHash)
	})

	it('generates unique keys on each call', async () => {
		const { key: key1 } = await generateApiKey()
		const { key: key2 } = await generateApiKey()
		expect(key1).not.toBe(key2)
	})

	it('prefix is the first few characters of the key', async () => {
		const { key, prefix } = await generateApiKey()
		expect(key.startsWith(prefix)).toBe(true)
	})
})

describe('extractApiKey', () => {
	it('extracts key from Authorization: Bearer header', () => {
		const headers = new Headers({ Authorization: 'Bearer my-api-key' })
		expect(extractApiKey(headers)).toBe('my-api-key')
	})

	it('extracts key from X-API-Key header', () => {
		const headers = new Headers({ 'X-API-Key': 'my-api-key' })
		expect(extractApiKey(headers)).toBe('my-api-key')
	})

	it('is case-insensitive for Bearer scheme', () => {
		const headers = new Headers({ Authorization: 'bearer my-api-key' })
		expect(extractApiKey(headers)).toBe('my-api-key')
	})

	it('is case-insensitive for BEARER scheme', () => {
		const headers = new Headers({ Authorization: 'BEARER my-api-key' })
		expect(extractApiKey(headers)).toBe('my-api-key')
	})

	it('returns null when no auth headers present', () => {
		const headers = new Headers()
		expect(extractApiKey(headers)).toBeNull()
	})

	it('returns null for non-Bearer Authorization', () => {
		const headers = new Headers({ Authorization: 'Basic dXNlcjpwYXNz' })
		expect(extractApiKey(headers)).toBeNull()
	})

	it('prefers Authorization over X-API-Key', () => {
		const headers = new Headers({
			Authorization: 'Bearer auth-key',
			'X-API-Key': 'xapi-key',
		})
		expect(extractApiKey(headers)).toBe('auth-key')
	})
})

const baseApiKey = { id: '1', workspaceId: 'ws1', name: 'Test Key' }

describe('hasAgentAccess', () => {
	it('allows access when no agentIds restriction', () => {
		const apiKey = { ...baseApiKey, permissions: {} }
		expect(hasAgentAccess({ apiKey, agentId: 'agent1' })).toBe(true)
	})

	it('allows access when agentIds is empty array', () => {
		const apiKey = { ...baseApiKey, permissions: { agentIds: [] } }
		expect(hasAgentAccess({ apiKey, agentId: 'agent1' })).toBe(true)
	})

	it('allows access for listed agentId', () => {
		const apiKey = { ...baseApiKey, permissions: { agentIds: ['agent1', 'agent2'] } }
		expect(hasAgentAccess({ apiKey, agentId: 'agent1' })).toBe(true)
	})

	it('denies access for unlisted agentId', () => {
		const apiKey = { ...baseApiKey, permissions: { agentIds: ['agent1'] } }
		expect(hasAgentAccess({ apiKey, agentId: 'agent2' })).toBe(false)
	})
})

describe('hasScope', () => {
	it('allows all scopes when no restriction', () => {
		const apiKey = { ...baseApiKey, permissions: {} }
		expect(hasScope({ apiKey, scope: 'chat' })).toBe(true)
	})

	it('allows scope when scopes is empty array', () => {
		const apiKey = { ...baseApiKey, permissions: { scopes: [] } }
		expect(hasScope({ apiKey, scope: 'chat' })).toBe(true)
	})

	it('allows listed scope', () => {
		const apiKey = { ...baseApiKey, permissions: { scopes: ['chat', 'read'] } }
		expect(hasScope({ apiKey, scope: 'chat' })).toBe(true)
	})

	it('denies unlisted scope', () => {
		const apiKey = { ...baseApiKey, permissions: { scopes: ['read'] } }
		expect(hasScope({ apiKey, scope: 'write' })).toBe(false)
	})
})
