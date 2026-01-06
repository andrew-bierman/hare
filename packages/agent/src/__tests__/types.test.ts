/**
 * Tests for types.ts - Default state constants
 *
 * While types.ts primarily contains TypeScript interfaces,
 * it also exports default state constants that should be validated.
 */

import { describe, expect, it } from 'vitest'
import { DEFAULT_HARE_AGENT_STATE, DEFAULT_MCP_AGENT_STATE } from '../types'

describe('DEFAULT_HARE_AGENT_STATE', () => {
	it('has correct default values', () => {
		expect(DEFAULT_HARE_AGENT_STATE.agentId).toBe('')
		expect(DEFAULT_HARE_AGENT_STATE.workspaceId).toBe('')
		expect(DEFAULT_HARE_AGENT_STATE.name).toBe('Hare Agent')
		expect(DEFAULT_HARE_AGENT_STATE.instructions).toBe('You are a helpful AI assistant.')
		expect(DEFAULT_HARE_AGENT_STATE.model).toBe('@cf/meta/llama-3.3-70b-instruct-fp8-fast')
		expect(DEFAULT_HARE_AGENT_STATE.messages).toEqual([])
		expect(DEFAULT_HARE_AGENT_STATE.isProcessing).toBe(false)
		expect(DEFAULT_HARE_AGENT_STATE.connectedUsers).toEqual([])
		expect(DEFAULT_HARE_AGENT_STATE.scheduledTasks).toEqual([])
		expect(DEFAULT_HARE_AGENT_STATE.status).toBe('idle')
	})

	it('has lastActivity as a timestamp', () => {
		expect(typeof DEFAULT_HARE_AGENT_STATE.lastActivity).toBe('number')
		expect(DEFAULT_HARE_AGENT_STATE.lastActivity).toBeGreaterThan(0)
	})

	it('has no lastError by default', () => {
		expect(DEFAULT_HARE_AGENT_STATE.lastError).toBeUndefined()
	})

	it('uses correct model ID format', () => {
		expect(DEFAULT_HARE_AGENT_STATE.model).toMatch(/^@cf\//)
	})

	it('has all required fields for HareAgentState', () => {
		const requiredFields = [
			'agentId',
			'workspaceId',
			'name',
			'instructions',
			'model',
			'messages',
			'isProcessing',
			'lastActivity',
			'connectedUsers',
			'scheduledTasks',
			'status',
		]

		for (const field of requiredFields) {
			expect(DEFAULT_HARE_AGENT_STATE).toHaveProperty(field)
		}
	})
})

describe('DEFAULT_MCP_AGENT_STATE', () => {
	it('has correct default values', () => {
		expect(DEFAULT_MCP_AGENT_STATE.workspaceId).toBe('')
		expect(DEFAULT_MCP_AGENT_STATE.connectedClients).toBe(0)
	})

	it('has lastActivity as a timestamp', () => {
		expect(typeof DEFAULT_MCP_AGENT_STATE.lastActivity).toBe('number')
		expect(DEFAULT_MCP_AGENT_STATE.lastActivity).toBeGreaterThan(0)
	})

	it('has all required fields for McpAgentState', () => {
		const requiredFields = ['workspaceId', 'connectedClients', 'lastActivity']

		for (const field of requiredFields) {
			expect(DEFAULT_MCP_AGENT_STATE).toHaveProperty(field)
		}
	})
})

describe('State constants immutability', () => {
	it('DEFAULT_HARE_AGENT_STATE arrays are empty', () => {
		// Verify arrays are empty so they can be safely spread
		expect(DEFAULT_HARE_AGENT_STATE.messages.length).toBe(0)
		expect(DEFAULT_HARE_AGENT_STATE.connectedUsers.length).toBe(0)
		expect(DEFAULT_HARE_AGENT_STATE.scheduledTasks.length).toBe(0)
	})
})
