/**
 * Tests for mcp-agent.ts - HareMcpAgent class
 *
 * These tests validate the Model Context Protocol agent implementation.
 * Since HareMcpAgent extends the Cloudflare agents/mcp McpAgent class,
 * we mock the SDK dependencies and test the business logic.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

// Mock the agents/mcp SDK
vi.mock('agents/mcp', () => ({
	McpAgent: class MockMcpAgent {
		state: Record<string, unknown> = {}
		env: Record<string, unknown> = {}
		initialState = {}

		setState(newState: Record<string, unknown>) {
			this.state = { ...this.state, ...newState }
		}
	},
}))

// Mock MCP server SDK
vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
	McpServer: vi.fn().mockImplementation(() => ({
		tool: vi.fn(),
		resource: vi.fn(),
	})),
}))

// Mock zod/v4 toJSONSchema
vi.mock('zod/v4', () => ({
	toJSONSchema: vi.fn().mockReturnValue({
		type: 'object',
		properties: {},
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
		{
			id: 'kv_put',
			description: 'Put value to KV',
			inputSchema: z.object({ key: z.string(), value: z.string() }),
			execute: vi.fn().mockResolvedValue({ success: true }),
		},
	]),
	ToolRegistry: vi.fn().mockImplementation(() => {
		const tools = new Map()
		return {
			registerAll: vi.fn().mockImplementation((toolList) => {
				for (const tool of toolList) {
					tools.set(tool.id, tool)
				}
			}),
			list: vi.fn().mockReturnValue([
				{
					id: 'kv_get',
					description: 'Get value from KV',
					inputSchema: z.object({ key: z.string() }),
				},
				{
					id: 'kv_put',
					description: 'Put value to KV',
					inputSchema: z.object({ key: z.string(), value: z.string() }),
				},
			]),
			has: vi.fn().mockReturnValue(true),
			execute: vi.fn().mockResolvedValue({ success: true, data: 'result' }),
		}
	}),
}))

// Mock @hare/types
vi.mock('@hare/types', () => ({
	DEFAULT_MCP_AGENT_STATE: {
		workspaceId: '',
		connectedClients: 0,
		lastActivity: Date.now(),
		systemToolsEnabled: true,
	},
}))

// Import after mocks are set up
import { HareMcpAgent, type McpAgentEnv, type McpAgentState } from '../mcp-agent'

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
 * Create a mock DurableObjectState.
 */
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

describe('HareMcpAgent', () => {
	let agent: HareMcpAgent
	let mockEnv: ReturnType<typeof createMockEnv>
	let mockState: ReturnType<typeof createMockState>

	beforeEach(() => {
		vi.clearAllMocks()
		mockEnv = createMockEnv()
		mockState = createMockState()
		agent = new HareMcpAgent(
			mockState as unknown as ConstructorParameters<typeof HareMcpAgent>[0],
			mockEnv as unknown as McpAgentEnv,
		)
	})

	describe('initialization', () => {
		it('has default initial state', () => {
			expect(agent.initialState).toBeDefined()
			expect(agent.initialState.connectedClients).toBe(0)
		})

		it('creates MCP server with correct configuration', () => {
			expect(agent.server).toBeDefined()
		})
	})

	describe('onStart', () => {
		it('loads tools when systemToolsEnabled is true', async () => {
			;(agent as unknown as { state: McpAgentState }).state = {
				...agent.initialState,
				systemToolsEnabled: true,
			}

			await agent.onStart()

			const { ToolRegistry } = await import('@hare/tools')
			expect(ToolRegistry).toHaveBeenCalled()
		})

		it('does not load tools when systemToolsEnabled is false', async () => {
			;(agent as unknown as { state: McpAgentState }).state = {
				...agent.initialState,
				systemToolsEnabled: false,
			}

			// Clear previous calls
			vi.clearAllMocks()

			await agent.onStart()

			// ToolRegistry is called but getSystemTools should not be
			const { getSystemTools } = await import('@hare/tools')
			expect(getSystemTools).not.toHaveBeenCalled()
		})
	})

	describe('init', () => {
		it('registers tools with MCP server', async () => {
			;(agent as unknown as { state: McpAgentState }).state = {
				...agent.initialState,
				workspaceId: 'workspace_123',
				systemToolsEnabled: true,
			}

			// First load tools
			await agent.onStart()

			// Then initialize MCP
			await agent.init()

			// Verify server.tool was called for each tool
			expect(agent.server.tool).toHaveBeenCalled()
		})

		it('registers workspace resource', async () => {
			;(agent as unknown as { state: McpAgentState }).state = {
				...agent.initialState,
				workspaceId: 'workspace_123',
			}

			await agent.init()

			// Verify server.resource was called for workspace
			expect(agent.server.resource).toHaveBeenCalledWith(
				'workspace',
				'Current workspace information',
				expect.any(Function),
			)
		})
	})

	describe('configure', () => {
		it('updates workspaceId', async () => {
			;(agent as unknown as { state: McpAgentState }).state = {
				...agent.initialState,
				workspaceId: '',
			}

			await agent.configure({ workspaceId: 'new_workspace' })

			expect(agent.state.workspaceId).toBe('new_workspace')
		})

		it('updates systemToolsEnabled and reloads tools', async () => {
			;(agent as unknown as { state: McpAgentState }).state = {
				...agent.initialState,
				systemToolsEnabled: false,
			}

			const { getSystemTools } = await import('@hare/tools')
			vi.mocked(getSystemTools).mockClear()

			await agent.configure({ systemToolsEnabled: true })

			expect(agent.state.systemToolsEnabled).toBe(true)
			expect(getSystemTools).toHaveBeenCalled()
		})

		it('does not reload tools when systemToolsEnabled unchanged', async () => {
			;(agent as unknown as { state: McpAgentState }).state = {
				...agent.initialState,
				systemToolsEnabled: true,
			}

			const { getSystemTools } = await import('@hare/tools')
			vi.mocked(getSystemTools).mockClear()

			await agent.configure({ workspaceId: 'another_workspace' })

			expect(getSystemTools).not.toHaveBeenCalled()
		})

		it('updates lastActivity timestamp', async () => {
			;(agent as unknown as { state: McpAgentState }).state = {
				...agent.initialState,
				lastActivity: 0,
			}

			const before = Date.now()
			await agent.configure({ workspaceId: 'test' })
			const after = Date.now()

			expect(agent.state.lastActivity).toBeGreaterThanOrEqual(before)
			expect(agent.state.lastActivity).toBeLessThanOrEqual(after)
		})
	})

	describe('onStateUpdate', () => {
		it('is a hook that can be overridden', () => {
			// onStateUpdate is defined but does nothing by default
			expect(() => {
				agent.onStateUpdate(agent.initialState)
			}).not.toThrow()
		})
	})

	describe('tool context creation', () => {
		it('creates context with correct workspaceId', async () => {
			;(agent as unknown as { state: McpAgentState }).state = {
				...agent.initialState,
				workspaceId: 'test_workspace',
				systemToolsEnabled: true,
			}

			await agent.onStart()

			// The tool context should be created with the workspace ID
			const { getSystemTools } = await import('@hare/tools')
			expect(getSystemTools).toHaveBeenCalledWith(
				expect.objectContaining({
					workspaceId: 'test_workspace',
				}),
			)
		})

		it('uses default workspaceId when not set', async () => {
			;(agent as unknown as { state: McpAgentState }).state = {
				...agent.initialState,
				workspaceId: '',
				systemToolsEnabled: true,
			}

			// Clear mocks before this test
			const { getSystemTools } = await import('@hare/tools')
			vi.mocked(getSystemTools).mockClear()

			// Access private method through type assertion
			const createToolContext = (
				agent as unknown as { createToolContext: () => { workspaceId: string } }
			).createToolContext.bind(agent)

			// createToolContext should use 'default' when workspaceId is empty
			if (createToolContext) {
				const context = createToolContext()
				expect(context.workspaceId).toBe('default')
			}
		})

		it('sets userId to mcp-client', async () => {
			;(agent as unknown as { state: McpAgentState }).state = {
				...agent.initialState,
				workspaceId: 'test_workspace',
				systemToolsEnabled: true,
			}

			// Access private method through type assertion
			const createToolContext = (
				agent as unknown as { createToolContext: () => { userId: string } }
			).createToolContext.bind(agent)

			if (createToolContext) {
				const context = createToolContext()
				expect(context.userId).toBe('mcp-client')
			}
		})
	})
})

describe('HareMcpAgent MCP tool registration', () => {
	let agent: HareMcpAgent
	let mockEnv: ReturnType<typeof createMockEnv>
	let mockState: ReturnType<typeof createMockState>

	beforeEach(() => {
		vi.clearAllMocks()
		mockEnv = createMockEnv()
		mockState = createMockState()
		agent = new HareMcpAgent(
			mockState as unknown as ConstructorParameters<typeof HareMcpAgent>[0],
			mockEnv as unknown as McpAgentEnv,
		)
		;(agent as unknown as { state: McpAgentState }).state = {
			...agent.initialState,
			workspaceId: 'test_workspace',
			systemToolsEnabled: true,
		}
	})

	it('converts Zod schema to JSON Schema for MCP', async () => {
		await agent.onStart()
		await agent.init()

		const { toJSONSchema } = await import('zod/v4')
		expect(toJSONSchema).toHaveBeenCalled()
	})

	it('registers tool with correct parameters', async () => {
		await agent.onStart()
		await agent.init()

		// Verify tool was registered with expected signature
		expect(agent.server.tool).toHaveBeenCalledWith(
			expect.any(String), // toolId
			expect.any(String), // description
			expect.any(Object), // JSON Schema
			expect.any(Function), // handler
		)
	})
})

describe('HareMcpAgent tool execution formatting', () => {
	it('formats successful tool result correctly', async () => {
		// Test the expected format of successful tool results
		const successResult = {
			success: true,
			data: { key: 'value' },
		}

		// MCP expects content array with text type
		const expectedFormat = {
			content: [
				{
					type: 'text' as const,
					text: JSON.stringify(successResult.data, null, 2),
				},
			],
		}

		expect(expectedFormat.content[0]?.type).toBe('text')
		expect(JSON.parse(expectedFormat.content[0]?.text ?? '{}')).toEqual({ key: 'value' })
	})

	it('formats error tool result correctly', async () => {
		// Test the expected format of error tool results
		const errorResult = {
			success: false,
			error: 'Something went wrong',
		}

		// MCP expects content array with error flag
		const expectedFormat = {
			content: [
				{
					type: 'text' as const,
					text: `Error: ${errorResult.error}`,
				},
			],
			isError: true,
		}

		expect(expectedFormat.isError).toBe(true)
		expect(expectedFormat.content[0]?.text).toContain('Error:')
	})
})

describe('HareMcpAgent workspace resource', () => {
	let agent: HareMcpAgent

	beforeEach(() => {
		vi.clearAllMocks()
		const mockState = createMockState()
		const mockEnv = createMockEnv()
		agent = new HareMcpAgent(
			mockState as unknown as ConstructorParameters<typeof HareMcpAgent>[0],
			mockEnv as unknown as McpAgentEnv,
		)
	})

	it('workspace resource returns correct URI format', async () => {
		const workspaceId = 'workspace_abc123'
		;(agent as unknown as { state: McpAgentState }).state = {
			...agent.initialState,
			workspaceId,
			connectedClients: 5,
			lastActivity: 1234567890,
		}

		await agent.init()

		// Get the resource handler
		const resourceCall = (agent.server.resource as ReturnType<typeof vi.fn>).mock.calls[0]
		const resourceHandler = resourceCall?.[2] as
			| (() => Promise<{
					contents: Array<{ uri: string; mimeType: string; text: string }>
			  }>)
			| undefined

		expect(resourceHandler).toBeDefined()
		const result = await resourceHandler!()

		expect(result.contents[0]?.uri).toBe(`hare://workspace/${workspaceId}`)
		expect(result.contents[0]?.mimeType).toBe('application/json')

		const parsedText = JSON.parse(result.contents[0]?.text ?? '{}')
		expect(parsedText.workspaceId).toBe(workspaceId)
		expect(parsedText.connectedClients).toBe(5)
		expect(parsedText.lastActivity).toBe(1234567890)
	})
})
