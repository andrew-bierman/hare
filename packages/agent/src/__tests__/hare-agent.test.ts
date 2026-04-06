/**
 * Tests for hare-agent.ts - HareAgent class
 *
 * These tests validate the HareAgent Durable Object implementation.
 * Since HareAgent extends the Cloudflare Agents SDK's Agent class,
 * we mock the SDK dependencies and test the business logic.
 */

import type { Connection, ConnectionContext } from 'agents'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

// Mock the agents SDK
vi.mock('agents', () => ({
	Agent: class MockAgent {
		state: Record<string, unknown> = {}
		env: Record<string, unknown> = {}
		initialState = {}

		setState(newState: Record<string, unknown>) {
			this.state = { ...this.state, ...newState }
		}

		schedule = vi.fn().mockResolvedValue({ id: 'schedule_123' })
	},
}))

// Mock AI SDK
vi.mock('ai', () => ({
	streamText: vi.fn().mockResolvedValue({
		textStream: (async function* () {
			yield 'Hello '
			yield 'from '
			yield 'AI!'
		})(),
	}),
}))

// Mock workers-ai provider
vi.mock('../providers/workers-ai', () => ({
	createWorkersAIModel: vi.fn().mockReturnValue({
		specificationVersion: 'v1',
		provider: 'workers-ai',
		modelId: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
	}),
}))

// Mock @hare/tools
vi.mock('@hare/tools', () => ({
	getSystemTools: vi.fn().mockReturnValue([
		{
			id: 'kv_get',
			description: 'Get value from KV',
			inputSchema: z.object({ key: z.string() }),
			execute: vi.fn().mockResolvedValue({ success: true, data: 'value' }),
		},
	]),
	ToolRegistry: vi.fn().mockImplementation(() => ({
		registerAll: vi.fn(),
		list: vi.fn().mockReturnValue([]),
		has: vi.fn().mockReturnValue(false),
		execute: vi.fn().mockResolvedValue({ success: true, data: 'result' }),
	})),
}))

// Mock @hare/types
vi.mock('@hare/types', () => ({
	DEFAULT_HARE_AGENT_STATE: {
		agentId: '',
		workspaceId: '',
		name: 'Hare Agent',
		instructions: 'You are a helpful AI assistant.',
		model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
		messages: [],
		isProcessing: false,
		lastActivity: Date.now(),
		connectedUsers: [],
		scheduledTasks: [],
		status: 'idle',
		systemToolsEnabled: true,
	},
}))

// Import after mocks are set up
import { HareAgent, type HareAgentEnv } from '../hare-agent'

/**
 * Create a mock connection for WebSocket testing.
 */
function createMockConnection() {
	return {
		send: vi.fn(),
		close: vi.fn(),
	}
}

/**
 * Create a mock environment.
 */
function createMockEnv() {
	return {
		AI: {
			run: vi.fn().mockResolvedValue({ response: 'test' }),
		},
		DB: {},
		KV: {},
		R2: {},
		VECTORIZE: {},
	}
}

/**
 * Create a mock connection context.
 */
function createMockConnectionContext(userId = 'user_123') {
	return {
		request: {
			headers: new Headers({
				'x-user-id': userId,
			}),
		},
	}
}

// Mock DurableObjectState for HareAgent constructor
function createMockState() {
	return {
		id: { toString: () => 'test-id' },
		storage: {
			get: vi.fn(),
			put: vi.fn(),
			delete: vi.fn(),
			list: vi.fn().mockResolvedValue(new Map()),
		},
		waitUntil: vi.fn(),
		blockConcurrencyWhile: vi.fn((fn: () => Promise<void>) => fn()),
	}
}

describe('HareAgent', () => {
	let agent: HareAgent
	let mockEnv: ReturnType<typeof createMockEnv>
	let mockState: ReturnType<typeof createMockState>

	beforeEach(() => {
		vi.clearAllMocks()
		mockEnv = createMockEnv()
		mockState = createMockState()
		agent = new HareAgent(
			mockState as unknown as ConstructorParameters<typeof HareAgent>[0],
			mockEnv as unknown as HareAgentEnv,
		)
	})

	describe('initialization', () => {
		it('has default initial state', () => {
			expect(agent.initialState).toBeDefined()
			expect(agent.initialState.name).toBe('Hare Agent')
			expect(agent.initialState.status).toBe('idle')
		})
	})

	describe('onStart', () => {
		it('loads tools on startup', async () => {
			// Set state with systemToolsEnabled
			;(agent as unknown as { state: typeof agent.initialState }).state = {
				...agent.initialState,
				systemToolsEnabled: true,
			}

			await agent.onStart()

			// Verify tool registry was created
			const { ToolRegistry } = await import('@hare/tools')
			expect(ToolRegistry).toHaveBeenCalled()
		})
	})

	describe('onRequest', () => {
		beforeEach(() => {
			;(agent as unknown as { state: typeof agent.initialState }).state = {
				...agent.initialState,
				agentId: 'test_agent',
			}
		})

		it('handles /health endpoint', async () => {
			const request = new Request('http://localhost/health')
			const response = await agent.onRequest(request)

			expect(response.status).toBe(200)
			const json = (await response.json()) as { status: string; agentId: string }
			expect(json).toEqual({ status: 'ok', agentId: 'test_agent' })
		})

		it('handles /state GET endpoint', async () => {
			const request = new Request('http://localhost/state', { method: 'GET' })
			const response = await agent.onRequest(request)

			expect(response.status).toBe(200)
			const json = (await response.json()) as { agentId: string }
			expect(json.agentId).toBe('test_agent')
		})

		it('handles /configure POST endpoint', async () => {
			const request = new Request('http://localhost/configure', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: 'New Name' }),
			})

			const response = await agent.onRequest(request)

			expect(response.status).toBe(200)
			const json = (await response.json()) as { success: boolean }
			expect(json.success).toBe(true)
		})

		it('handles /schedules GET endpoint', async () => {
			const request = new Request('http://localhost/schedules', { method: 'GET' })
			const response = await agent.onRequest(request)

			expect(response.status).toBe(200)
			const json = (await response.json()) as { schedules: unknown[] }
			expect(json.schedules).toBeDefined()
		})

		it('returns 404 for unknown endpoints', async () => {
			const request = new Request('http://localhost/unknown')
			const response = await agent.onRequest(request)

			expect(response.status).toBe(404)
		})

		it('validates schedule payload', async () => {
			const request = new Request('http://localhost/schedule', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({}), // Missing required fields
			})

			const response = await agent.onRequest(request)

			expect(response.status).toBe(400)
			const json = (await response.json()) as { error: string }
			expect(json.error).toContain('Invalid schedule payload')
		})

		it('validates tool execution payload', async () => {
			const request = new Request('http://localhost/execute-tool', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({}), // Missing required fields
			})

			const response = await agent.onRequest(request)

			expect(response.status).toBe(400)
			const json = (await response.json()) as { error: string }
			expect(json.error).toContain('Invalid tool execution payload')
		})
	})

	describe('onConnect', () => {
		it('adds user to connected users on WebSocket connect', async () => {
			const connection = createMockConnection()
			const ctx = createMockConnectionContext('user_456')

			// Initialize state
			;(agent as unknown as { state: typeof agent.initialState }).state = {
				...agent.initialState,
				connectedUsers: [],
			}

			await agent.onConnect(
				connection as unknown as Connection,
				ctx as unknown as ConnectionContext,
			)

			expect(connection.send).toHaveBeenCalled()
		})

		it('uses anonymous for connections without user ID header', async () => {
			const connection = createMockConnection()
			const ctx = {
				request: {
					headers: new Headers(),
				},
			}

			;(agent as unknown as { state: typeof agent.initialState }).state = {
				...agent.initialState,
				connectedUsers: [],
			}

			await agent.onConnect(
				connection as unknown as Connection,
				ctx as unknown as ConnectionContext,
			)

			expect(connection.send).toHaveBeenCalled()
		})
	})

	describe('onMessage', () => {
		beforeEach(() => {
			;(agent as unknown as { state: typeof agent.initialState }).state = {
				...agent.initialState,
			}
		})

		it('handles get_state message type', async () => {
			const connection = createMockConnection()
			const message = JSON.stringify({ type: 'get_state' })

			await agent.onMessage(connection as unknown as Connection, message)

			expect(connection.send).toHaveBeenCalled()
			const sentData = JSON.parse(connection.send.mock.calls[0]?.[0] ?? '{}')
			expect(sentData.type).toBe('state_update')
		})

		it('handles configure message type', async () => {
			const connection = createMockConnection()
			const message = JSON.stringify({
				type: 'configure',
				payload: { name: 'Updated Name' },
			})

			await agent.onMessage(connection as unknown as Connection, message)

			// Should not send error
			const calls = connection.send.mock.calls
			if (calls.length > 0) {
				const lastCall = JSON.parse(calls[calls.length - 1]?.[0] ?? '{}')
				expect(lastCall.type).not.toBe('error')
			}
		})

		it('validates chat payload', async () => {
			const connection = createMockConnection()
			const message = JSON.stringify({
				type: 'chat',
				payload: { message: '' }, // Empty message should fail
			})

			await agent.onMessage(connection as unknown as Connection, message)

			// Should send error
			expect(connection.send).toHaveBeenCalled()
			const sentData = JSON.parse(connection.send.mock.calls[0]?.[0] ?? '{}')
			expect(sentData.type).toBe('error')
		})

		it('handles unknown message type', async () => {
			const connection = createMockConnection()
			const message = JSON.stringify({
				type: 'unknown_type',
				payload: {},
			})

			await agent.onMessage(connection as unknown as Connection, message)

			expect(connection.send).toHaveBeenCalled()
			const sentData = JSON.parse(connection.send.mock.calls[0]?.[0] ?? '{}')
			expect(sentData.type).toBe('error')
			expect(sentData.data.message).toContain('Unknown message type')
		})

		it('handles malformed JSON gracefully', async () => {
			const connection = createMockConnection()
			const message = 'not valid json'

			await agent.onMessage(connection as unknown as Connection, message)

			expect(connection.send).toHaveBeenCalled()
			const sentData = JSON.parse(connection.send.mock.calls[0]?.[0] ?? '{}')
			expect(sentData.type).toBe('error')
		})
	})

	describe('onClose', () => {
		it('removes user from connected users', async () => {
			const connection = createMockConnection()

			// Setup: First connect the user
			;(agent as unknown as { state: typeof agent.initialState }).state = {
				...agent.initialState,
				connectedUsers: ['user_123'],
			}

			// Create a private map to track connections
			const connectionUserMap = new Map()
			connectionUserMap.set(connection, 'user_123')
			;(agent as unknown as { connectionUserMap: Map<Connection, string> }).connectionUserMap =
				connectionUserMap

			await agent.onClose(connection as unknown as Connection)

			// The user should be processed for removal
			expect(connectionUserMap.has(connection)).toBe(false)
		})
	})

	describe('configure', () => {
		it('updates agent configuration', async () => {
			;(agent as unknown as { state: typeof agent.initialState }).state = {
				...agent.initialState,
			}

			await agent.configure({ name: 'New Agent Name' })

			expect(agent.state.name).toBe('New Agent Name')
		})

		it('reloads tools when systemToolsEnabled changes', async () => {
			;(agent as unknown as { state: typeof agent.initialState }).state = {
				...agent.initialState,
				systemToolsEnabled: false,
			}

			await agent.configure({ systemToolsEnabled: true })

			expect(agent.state.systemToolsEnabled).toBe(true)
		})
	})

	describe('scheduled tasks', () => {
		it('executeScheduledTask routes to sendReminder', async () => {
			const broadcastSpy = vi.spyOn(
				agent as unknown as { broadcastMessage: (...args: unknown[]) => void },
				'broadcastMessage',
			)
			;(agent as unknown as { connectionUserMap: Map<Connection, string> }).connectionUserMap =
				new Map()

			await agent.executeScheduledTask({
				action: 'sendReminder',
				message: 'Test reminder',
				userId: 'user_123',
			})

			expect(broadcastSpy).toHaveBeenCalled()
		})

		it('executeScheduledTask routes to runMaintenance', async () => {
			;(agent as unknown as { state: typeof agent.initialState }).state = {
				...agent.initialState,
				messages: Array(150).fill({ role: 'user', content: 'test' }),
			}

			await agent.executeScheduledTask({ action: 'runMaintenance' })

			// Maintenance should trim messages to 100
			expect(agent.state.messages.length).toBeLessThanOrEqual(100)
		})

		it('handles unknown scheduled action gracefully', async () => {
			const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

			await agent.executeScheduledTask({ action: 'unknownAction' })

			expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown scheduled action'))
			consoleSpy.mockRestore()
		})
	})

	describe('onStateUpdate', () => {
		it('broadcasts state updates to connected clients', () => {
			const connection1 = createMockConnection()
			const connection2 = createMockConnection()

			;(agent as unknown as { connectionUserMap: Map<Connection, string> }).connectionUserMap =
				new Map([
					[connection1, 'user_1'],
					[connection2, 'user_2'],
				])

			agent.onStateUpdate(agent.initialState)

			expect(connection1.send).toHaveBeenCalled()
			expect(connection2.send).toHaveBeenCalled()
		})
	})
})

describe('HareAgent HTTP tool execution', () => {
	let agent: HareAgent
	let mockEnv: ReturnType<typeof createMockEnv>
	let mockState: ReturnType<typeof createMockState>

	beforeEach(() => {
		vi.clearAllMocks()
		mockEnv = createMockEnv()
		mockState = createMockState()
		agent = new HareAgent(
			mockState as unknown as ConstructorParameters<typeof HareAgent>[0],
			mockEnv as unknown as HareAgentEnv,
		)
		;(agent as unknown as { state: typeof agent.initialState }).state = {
			...agent.initialState,
		}
	})

	it('returns 404 for non-existent tool', async () => {
		const request = new Request('http://localhost/execute-tool', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				toolId: 'nonexistent_tool',
				params: {},
			}),
		})

		const response = await agent.onRequest(request)

		expect(response.status).toBe(404)
		const json = (await response.json()) as { error: string }
		expect(json.error).toContain('Tool not found')
	})
})

describe('HareAgent Zod schema validation', () => {
	it('ChatPayloadSchema validates correctly', () => {
		const ChatPayloadSchema = z.object({
			message: z.string().min(1, 'Message cannot be empty'),
			userId: z.string().min(1),
			sessionId: z.string().optional(),
			metadata: z.record(z.string(), z.unknown()).optional(),
		})

		expect(
			ChatPayloadSchema.safeParse({
				message: 'Hello',
				userId: 'user_123',
			}).success,
		).toBe(true)

		expect(
			ChatPayloadSchema.safeParse({
				message: '',
				userId: 'user_123',
			}).success,
		).toBe(false)

		expect(
			ChatPayloadSchema.safeParse({
				message: 'Hello',
				userId: '',
			}).success,
		).toBe(false)
	})

	it('ToolExecutePayloadSchema validates correctly', () => {
		const ToolExecutePayloadSchema = z.object({
			toolId: z.string().min(1, 'Tool ID is required'),
			params: z.record(z.string(), z.unknown()),
		})

		expect(
			ToolExecutePayloadSchema.safeParse({
				toolId: 'kv_get',
				params: { key: 'test' },
			}).success,
		).toBe(true)

		expect(
			ToolExecutePayloadSchema.safeParse({
				toolId: '',
				params: {},
			}).success,
		).toBe(false)
	})

	it('SchedulePayloadSchema validates correctly', () => {
		const SchedulePayloadSchema = z.object({
			action: z.string().min(1, 'Action is required'),
			executeAt: z.number().positive().optional(),
			cron: z.string().optional(),
			payload: z.record(z.string(), z.unknown()).optional(),
		})

		expect(
			SchedulePayloadSchema.safeParse({
				action: 'sendReminder',
				executeAt: Date.now() + 60000,
			}).success,
		).toBe(true)

		expect(
			SchedulePayloadSchema.safeParse({
				action: 'runTask',
				cron: '0 * * * *',
			}).success,
		).toBe(true)

		expect(
			SchedulePayloadSchema.safeParse({
				action: '',
			}).success,
		).toBe(false)
	})
})
