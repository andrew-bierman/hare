/**
 * Tests for @hare/types - Schema validation and export verification
 */

import { describe, expect, it } from 'vitest'
import {
	// Agent schemas
	ScheduledTaskSchema,
	HareAgentStateSchema,
	ChatPayloadSchema,
	ToolExecutePayloadSchema,
	SchedulePayloadSchema,
	ConfigurePayloadSchema,
	ClientMessageSchema,
	ServerMessageSchema,
	McpAgentStateSchema,
	DEFAULT_HARE_AGENT_STATE,
	DEFAULT_MCP_AGENT_STATE,
	// DB schemas
	ToolCallSchema,
	ToolResultSchema,
	TokenUsageSchema,
	MessageMetadataSchema,
	// Tool schemas
	ToolTypeSchema,
	ToolConfigSchema,
	// API schemas
	AuthUserSchema,
	AuthSessionSchema,
	WorkspaceRoleSchema,
	MessageRoleSchema,
	AgentStatusSchema,
	AgentConfigSchema,
	ApiErrorSchema,
	ApiSuccessSchema,
	// Guard functions
	isWorkspaceRole,
	assertWorkspaceRole,
	isMessageRole,
	assertMessageRole,
} from '../index'

describe('@hare/types exports', () => {
	it('exports all agent schemas', () => {
		expect(ScheduledTaskSchema).toBeDefined()
		expect(HareAgentStateSchema).toBeDefined()
		expect(ChatPayloadSchema).toBeDefined()
		expect(ToolExecutePayloadSchema).toBeDefined()
		expect(SchedulePayloadSchema).toBeDefined()
		expect(ConfigurePayloadSchema).toBeDefined()
		expect(ClientMessageSchema).toBeDefined()
		expect(ServerMessageSchema).toBeDefined()
		expect(McpAgentStateSchema).toBeDefined()
	})

	it('exports default states', () => {
		expect(DEFAULT_HARE_AGENT_STATE).toBeDefined()
		expect(DEFAULT_MCP_AGENT_STATE).toBeDefined()
	})

	it('exports DB schemas', () => {
		expect(ToolCallSchema).toBeDefined()
		expect(ToolResultSchema).toBeDefined()
		expect(TokenUsageSchema).toBeDefined()
		expect(MessageMetadataSchema).toBeDefined()
	})

	it('exports tool schemas', () => {
		expect(ToolTypeSchema).toBeDefined()
		expect(ToolConfigSchema).toBeDefined()
	})

	it('exports API schemas', () => {
		expect(AuthUserSchema).toBeDefined()
		expect(AuthSessionSchema).toBeDefined()
		expect(AgentStatusSchema).toBeDefined()
		expect(ApiErrorSchema).toBeDefined()
		expect(ApiSuccessSchema).toBeDefined()
	})
})

describe('Zod schema validation', () => {
	describe('ChatPayloadSchema', () => {
		it('validates a correct payload', () => {
			const result = ChatPayloadSchema.safeParse({
				message: 'Hello',
				userId: 'user-1',
			})
			expect(result.success).toBe(true)
		})

		it('validates with optional fields', () => {
			const result = ChatPayloadSchema.safeParse({
				message: 'Hello',
				userId: 'user-1',
				sessionId: 'session-1',
				metadata: { key: 'value' },
			})
			expect(result.success).toBe(true)
		})

		it('rejects missing required fields', () => {
			const result = ChatPayloadSchema.safeParse({
				message: 'Hello',
			})
			expect(result.success).toBe(false)
		})
	})

	describe('ToolCallSchema', () => {
		it('validates a correct tool call', () => {
			const result = ToolCallSchema.safeParse({
				id: 'call-1',
				name: 'http_request',
				input: { url: 'https://example.com' },
			})
			expect(result.success).toBe(true)
		})

		it('rejects missing fields', () => {
			const result = ToolCallSchema.safeParse({ id: 'call-1' })
			expect(result.success).toBe(false)
		})
	})

	describe('ToolResultSchema', () => {
		it('validates a correct tool result', () => {
			const result = ToolResultSchema.safeParse({
				toolCallId: 'call-1',
				output: { data: 'response' },
			})
			expect(result.success).toBe(true)
		})

		it('validates with optional isError', () => {
			const result = ToolResultSchema.safeParse({
				toolCallId: 'call-1',
				output: null,
				isError: true,
			})
			expect(result.success).toBe(true)
		})
	})

	describe('TokenUsageSchema', () => {
		it('validates with all fields', () => {
			const result = TokenUsageSchema.safeParse({
				inputTokens: 100,
				outputTokens: 50,
			})
			expect(result.success).toBe(true)
		})

		it('validates with no fields (all optional)', () => {
			const result = TokenUsageSchema.safeParse({})
			expect(result.success).toBe(true)
		})
	})

	describe('ToolTypeSchema', () => {
		it('validates known tool types', () => {
			expect(ToolTypeSchema.safeParse('http').success).toBe(true)
			expect(ToolTypeSchema.safeParse('sql').success).toBe(true)
			expect(ToolTypeSchema.safeParse('kv').success).toBe(true)
			expect(ToolTypeSchema.safeParse('custom').success).toBe(true)
		})

		it('rejects unknown tool types', () => {
			expect(ToolTypeSchema.safeParse('nonexistent').success).toBe(false)
		})
	})

	describe('ToolConfigSchema', () => {
		it('validates a complete tool config', () => {
			const result = ToolConfigSchema.safeParse({
				id: 'tool-1',
				name: 'My Tool',
				description: 'A test tool',
				type: 'http',
			})
			expect(result.success).toBe(true)
		})

		it('validates with nullable fields', () => {
			const result = ToolConfigSchema.safeParse({
				id: 'tool-1',
				name: 'My Tool',
				description: null,
				type: 'custom',
				inputSchema: null,
				config: null,
				code: null,
			})
			expect(result.success).toBe(true)
		})
	})

	describe('ClientMessageSchema', () => {
		it('validates chat message type', () => {
			const result = ClientMessageSchema.safeParse({
				type: 'chat',
				payload: { message: 'Hello', userId: 'user-1' },
			})
			expect(result.success).toBe(true)
		})

		it('validates all message types', () => {
			const types = ['chat', 'configure', 'execute_tool', 'get_state', 'schedule']
			for (const type of types) {
				const result = ClientMessageSchema.safeParse({ type, payload: {} })
				expect(result.success, `type '${type}' should be valid`).toBe(true)
			}
		})

		it('rejects invalid message type', () => {
			const result = ClientMessageSchema.safeParse({
				type: 'invalid',
				payload: {},
			})
			expect(result.success).toBe(false)
		})
	})

	describe('ServerMessageSchema', () => {
		it('validates a server message', () => {
			const result = ServerMessageSchema.safeParse({
				type: 'text',
				data: 'Hello world',
				timestamp: Date.now(),
			})
			expect(result.success).toBe(true)
		})

		it('validates all server message types', () => {
			const types = ['text', 'tool_call', 'tool_result', 'state_update', 'error', 'done']
			for (const type of types) {
				const result = ServerMessageSchema.safeParse({
					type,
					data: {},
					timestamp: Date.now(),
				})
				expect(result.success, `type '${type}' should be valid`).toBe(true)
			}
		})
	})

	describe('AuthUserSchema', () => {
		it('validates a correct auth user', () => {
			const result = AuthUserSchema.safeParse({
				id: 'user-1',
				email: 'test@example.com',
				name: 'Test User',
				image: null,
			})
			expect(result.success).toBe(true)
		})

		it('rejects invalid email', () => {
			const result = AuthUserSchema.safeParse({
				id: 'user-1',
				email: 'not-an-email',
				name: null,
				image: null,
			})
			expect(result.success).toBe(false)
		})
	})
})

describe('default state objects', () => {
	it('DEFAULT_HARE_AGENT_STATE has correct structure', () => {
		const state = DEFAULT_HARE_AGENT_STATE
		expect(state.name).toBe('Hare Agent')
		expect(state.instructions).toBeTruthy()
		expect(state.model).toBeTruthy()
		expect(state.systemToolsEnabled).toBe(true)
		expect(Array.isArray(state.messages)).toBe(true)
		expect(state.isProcessing).toBe(false)
		expect(state.status).toBe('idle')
		expect(Array.isArray(state.connectedUsers)).toBe(true)
		expect(Array.isArray(state.scheduledTasks)).toBe(true)
	})

	it('DEFAULT_MCP_AGENT_STATE has correct structure', () => {
		const state = DEFAULT_MCP_AGENT_STATE
		expect(state.systemToolsEnabled).toBe(true)
		expect(state.connectedClients).toBe(0)
		expect(typeof state.lastActivity).toBe('number')
	})
})

describe('type guard functions', () => {
	describe('isWorkspaceRole', () => {
		it('returns true for valid roles', () => {
			expect(isWorkspaceRole('owner')).toBe(true)
			expect(isWorkspaceRole('admin')).toBe(true)
			expect(isWorkspaceRole('member')).toBe(true)
			expect(isWorkspaceRole('viewer')).toBe(true)
		})

		it('returns false for invalid roles', () => {
			expect(isWorkspaceRole('superadmin')).toBe(false)
			expect(isWorkspaceRole('')).toBe(false)
		})
	})

	describe('assertWorkspaceRole', () => {
		it('does not throw for valid roles', () => {
			expect(() => assertWorkspaceRole('owner')).not.toThrow()
			expect(() => assertWorkspaceRole('member')).not.toThrow()
		})

		it('throws for invalid roles', () => {
			expect(() => assertWorkspaceRole('invalid')).toThrow()
		})
	})

	describe('isMessageRole', () => {
		it('returns true for valid roles', () => {
			expect(isMessageRole('user')).toBe(true)
			expect(isMessageRole('assistant')).toBe(true)
			expect(isMessageRole('system')).toBe(true)
			expect(isMessageRole('tool')).toBe(true)
		})

		it('returns false for invalid roles', () => {
			expect(isMessageRole('bot')).toBe(false)
		})
	})

	describe('assertMessageRole', () => {
		it('does not throw for valid roles', () => {
			expect(() => assertMessageRole('user')).not.toThrow()
		})

		it('throws for invalid roles', () => {
			expect(() => assertMessageRole('invalid')).toThrow()
		})
	})
})
