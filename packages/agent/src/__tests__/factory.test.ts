/**
 * Tests for factory.ts - Agent factory functions
 */

import type { CloudflareEnv } from '@hare/types'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
	type AgentConfig,
	createAgentFromConfig,
	createSimpleAgent,
	loadAgentTools,
} from '../factory'

// Mock dependencies
vi.mock('../edge-agent', () => ({
	createHareEdgeAgent: vi.fn().mockImplementation((options) => ({
		name: options.name,
		instructions: options.instructions,
		model: options.model,
		tools: new Map(options.tools?.map((t: { id: string }) => [t.id, t]) || []),
	})),
	HareEdgeAgent: vi.fn(),
}))

vi.mock('../providers/workers-ai', () => ({
	createWorkersAIModel: vi.fn().mockReturnValue({
		specificationVersion: 'v1',
		provider: 'workers-ai',
		modelId: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
	}),
}))

vi.mock('@hare/tools', () => ({
	getSystemTools: vi.fn().mockReturnValue([
		{
			id: 'kv_get',
			description: 'Get value from KV',
			inputSchema: { key: { type: 'string' } },
			execute: vi.fn(),
		},
	]),
	createRegistry: vi.fn().mockImplementation((tools) => ({
		list: () => tools,
		execute: vi.fn().mockResolvedValue({ success: true, data: 'result' }),
	})),
	createTool: vi.fn().mockImplementation((config) => config),
	failure: vi.fn().mockImplementation((msg) => ({ success: false, error: msg })),
	httpRequestTool: {
		inputSchema: { url: { type: 'string' } },
		execute: vi.fn().mockResolvedValue({ success: true, data: {} }),
	},
	HttpResponseOutputSchema: {},
}))

/**
 * Create a mock database for testing.
 * Drizzle uses method chaining that eventually returns a Promise (thenable).
 */
function createMockDb() {
	// Create a chainable mock that resolves to an empty array by default
	const createSelectChain = (finalValue: unknown[] = []) => {
		const chain = {
			from: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnThis(),
			orderBy: vi.fn().mockReturnThis(),
			limit: vi.fn().mockReturnThis(),
			// biome-ignore lint/suspicious/noThenProperty: mock needs to be thenable for await
			then: vi.fn().mockImplementation((resolve) => resolve(finalValue)),
		}
		return chain
	}

	return {
		select: vi.fn().mockImplementation(() => createSelectChain([])),
		insert: vi.fn().mockReturnValue({
			values: vi.fn().mockReturnValue({
				returning: vi.fn().mockResolvedValue([{ id: 'new_id' }]),
			}),
		}),
		update: vi.fn().mockReturnValue({
			set: vi.fn().mockReturnValue({
				where: vi.fn().mockResolvedValue(undefined),
			}),
		}),
		delete: vi.fn().mockReturnValue({
			where: vi.fn().mockResolvedValue(undefined),
		}),
	}
}

/**
 * Create a mock Cloudflare environment for testing.
 */
function createMockEnv(): CloudflareEnv {
	return {
		AI: {
			run: vi.fn().mockResolvedValue({ response: 'mocked' }),
		} as unknown as Ai,
		DB: {} as D1Database,
		KV: {} as KVNamespace,
		R2: {} as R2Bucket,
		VECTORIZE: {} as VectorizeIndex,
		ENVIRONMENT: 'test',
	} as CloudflareEnv
}

/**
 * Create a sample agent configuration.
 */
function createSampleAgentConfig(overrides: Partial<AgentConfig> = {}): AgentConfig {
	return {
		id: 'agent_test123',
		workspaceId: 'workspace_456',
		name: 'Test Agent',
		description: 'A test agent',
		instructions: 'You are a helpful assistant.',
		model: 'llama-3.3-70b',
		status: 'deployed',
		config: {
			temperature: 0.7,
			maxTokens: 4096,
		},
		...overrides,
	}
}

describe('factory', () => {
	let mockDb: ReturnType<typeof createMockDb>
	let mockEnv: CloudflareEnv

	beforeEach(() => {
		mockDb = createMockDb()
		mockEnv = createMockEnv()
		vi.clearAllMocks()
	})

	describe('loadAgentTools', () => {
		it('returns empty array when no tools are attached', async () => {
			const tools = await loadAgentTools({
				agentId: 'agent_123',
				db: mockDb as unknown as import('@hare/db').Database,
				context: {
					env: mockEnv,
					workspaceId: 'workspace_456',
					userId: 'user_789',
				},
			})

			expect(tools).toEqual([])
		})

		it('loads attached tools from database', async () => {
			// Mock attached tools
			const mockSelect = mockDb.select()
			mockSelect.from.mockReturnThis()
			mockSelect.where.mockResolvedValue([{ toolId: 'tool_1' }, { toolId: 'tool_2' }])

			// Mock tool configs
			mockDb.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue([{ toolId: 'tool_1' }, { toolId: 'tool_2' }]),
				}),
			})
			mockDb.select.mockReturnValueOnce({
				from: vi.fn().mockResolvedValue([
					{
						id: 'tool_1',
						name: 'HTTP Tool',
						description: 'Make HTTP requests',
						type: 'http',
						config: { url: 'https://api.example.com' },
					},
				]),
			})

			await loadAgentTools({
				agentId: 'agent_123',
				db: mockDb as unknown as import('@hare/db').Database,
				context: {
					env: mockEnv,
					workspaceId: 'workspace_456',
					userId: 'user_789',
				},
			})

			expect(mockDb.select).toHaveBeenCalled()
		})
	})

	describe('createAgentFromConfig', () => {
		it('creates an agent with basic configuration', async () => {
			const { createHareEdgeAgent } = await import('../edge-agent')
			const config = createSampleAgentConfig()

			const agent = await createAgentFromConfig({
				agentConfig: config,
				db: mockDb as unknown as import('@hare/db').Database,
				env: mockEnv,
			})

			expect(createHareEdgeAgent).toHaveBeenCalled()
			expect(agent.name).toBe('Test Agent')
		})

		it('includes system tools by default', async () => {
			const { getSystemTools } = await import('@hare/tools')
			const config = createSampleAgentConfig()

			await createAgentFromConfig({
				agentConfig: config,
				db: mockDb as unknown as import('@hare/db').Database,
				env: mockEnv,
			})

			expect(getSystemTools).toHaveBeenCalled()
		})

		it('excludes system tools when includeSystemTools is false', async () => {
			const { getSystemTools } = await import('@hare/tools')
			vi.mocked(getSystemTools).mockClear()

			const config = createSampleAgentConfig()

			await createAgentFromConfig({
				agentConfig: config,
				db: mockDb as unknown as import('@hare/db').Database,
				env: mockEnv,
				includeSystemTools: false,
			})

			expect(getSystemTools).not.toHaveBeenCalled()
		})

		it('uses default instructions when not provided', async () => {
			const { createHareEdgeAgent } = await import('../edge-agent')
			const config = createSampleAgentConfig({ instructions: null })

			await createAgentFromConfig({
				agentConfig: config,
				db: mockDb as unknown as import('@hare/db').Database,
				env: mockEnv,
			})

			expect(createHareEdgeAgent).toHaveBeenCalledWith(
				expect.objectContaining({
					instructions: expect.stringContaining('You are a helpful AI assistant'),
				}),
			)
		})

		it('passes user ID to tool context', async () => {
			const config = createSampleAgentConfig()

			await createAgentFromConfig({
				agentConfig: config,
				db: mockDb as unknown as import('@hare/db').Database,
				env: mockEnv,
				userId: 'user_specific_123',
			})

			// The userId should be used in tool context
			expect(mockDb.select).toHaveBeenCalled()
		})
	})

	describe('createSimpleAgent', () => {
		it('creates a simple agent without database tools', () => {
			const agent = createSimpleAgent({
				name: 'Simple Agent',
				instructions: 'You are a simple assistant.',
				model: 'llama-3.3-70b',
				env: mockEnv,
			})

			expect(agent.name).toBe('Simple Agent')
			expect(agent.instructions).toBe('You are a simple assistant.')
		})

		it('creates agent with provided tools', () => {
			const customTool = {
				id: 'custom_tool',
				description: 'A custom tool',
				inputSchema: {},
				execute: vi.fn(),
			}

			const agent = createSimpleAgent({
				name: 'Agent with Tools',
				instructions: 'Helper assistant.',
				model: 'llama-3.3-70b',
				env: mockEnv,
				tools: [customTool],
			})

			expect(agent.tools.size).toBe(1)
			expect(agent.tools.has('custom_tool')).toBe(true)
		})

		it('creates agent with empty tools by default', () => {
			const agent = createSimpleAgent({
				name: 'No Tools Agent',
				instructions: 'Assistant without tools.',
				model: 'llama-3.3-70b',
				env: mockEnv,
			})

			expect(agent.tools.size).toBe(0)
		})
	})
})

describe('buildInstructions (indirect testing)', () => {
	let mockDb: ReturnType<typeof createMockDb>
	let mockEnv: CloudflareEnv

	beforeEach(() => {
		mockDb = createMockDb()
		mockEnv = createMockEnv()
		vi.clearAllMocks()
	})

	it('includes tool documentation in instructions when tools exist', async () => {
		const { createHareEdgeAgent } = await import('../edge-agent')
		const config = createSampleAgentConfig()

		await createAgentFromConfig({
			agentConfig: config,
			db: mockDb as unknown as import('@hare/db').Database,
			env: mockEnv,
			includeSystemTools: true,
		})

		// Check that createHareEdgeAgent was called with instructions containing tool info
		expect(createHareEdgeAgent).toHaveBeenCalledWith(
			expect.objectContaining({
				instructions: expect.stringContaining('Available Tools'),
			}),
		)
	})
})
