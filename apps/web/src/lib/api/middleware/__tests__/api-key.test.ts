import { describe, expect, it } from 'vitest'
import { hasAgentAccess, hasScope } from '../api-key'

describe('hasAgentAccess', () => {
	it('returns true when no agentIds restriction exists', () => {
		const apiKey = {
			id: 'key_1',
			workspaceId: 'ws_1',
			name: 'Test Key',
			permissions: {},
		}
		expect(hasAgentAccess(apiKey, 'agent_1')).toBe(true)
	})

	it('returns true when agentIds array is empty', () => {
		const apiKey = {
			id: 'key_1',
			workspaceId: 'ws_1',
			name: 'Test Key',
			permissions: { agentIds: [] },
		}
		expect(hasAgentAccess(apiKey, 'agent_1')).toBe(true)
	})

	it('returns true when agentId is in the allowed list', () => {
		const apiKey = {
			id: 'key_1',
			workspaceId: 'ws_1',
			name: 'Test Key',
			permissions: { agentIds: ['agent_1', 'agent_2'] },
		}
		expect(hasAgentAccess(apiKey, 'agent_1')).toBe(true)
	})

	it('returns false when agentId is not in the allowed list', () => {
		const apiKey = {
			id: 'key_1',
			workspaceId: 'ws_1',
			name: 'Test Key',
			permissions: { agentIds: ['agent_1', 'agent_2'] },
		}
		expect(hasAgentAccess(apiKey, 'agent_3')).toBe(false)
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
		expect(hasScope(apiKey, 'read')).toBe(true)
	})

	it('returns true when scopes array is empty', () => {
		const apiKey = {
			id: 'key_1',
			workspaceId: 'ws_1',
			name: 'Test Key',
			permissions: { scopes: [] },
		}
		expect(hasScope(apiKey, 'read')).toBe(true)
	})

	it('returns true when scope is in the allowed list', () => {
		const apiKey = {
			id: 'key_1',
			workspaceId: 'ws_1',
			name: 'Test Key',
			permissions: { scopes: ['read', 'write'] },
		}
		expect(hasScope(apiKey, 'read')).toBe(true)
	})

	it('returns false when scope is not in the allowed list', () => {
		const apiKey = {
			id: 'key_1',
			workspaceId: 'ws_1',
			name: 'Test Key',
			permissions: { scopes: ['read'] },
		}
		expect(hasScope(apiKey, 'write')).toBe(false)
	})
})
