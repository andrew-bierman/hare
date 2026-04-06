import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createToolFromConfig, loadAgentTools, type ToolDatabase } from '../factory'
import type { AnyTool, Tool, ToolConfig, ToolContext } from '../types'
import { createFetchMock } from './test-utils'

const createMockContext = (): ToolContext => ({
	env: {} as ToolContext['env'],
	workspaceId: 'test-workspace',
	userId: 'test-user',
})

// Mock fetch globally for HTTP tools
const originalFetch = globalThis.fetch

describe('Tool Factory', () => {
	let context: ToolContext
	let mockFetch: ReturnType<typeof vi.fn>

	beforeEach(() => {
		context = createMockContext()
		mockFetch = vi.fn()
		globalThis.fetch = createFetchMock(mockFetch)
	})

	afterEach(() => {
		globalThis.fetch = originalFetch
		vi.clearAllMocks()
	})

	describe('createToolFromConfig', () => {
		describe('HTTP tool type', () => {
			it('creates HTTP tool from valid config', () => {
				const config: ToolConfig = {
					id: 'my-http-tool',
					type: 'http',
					name: 'My HTTP Tool',
					description: 'Fetches data from an API',
					config: {
						url: 'https://api.example.com/data',
						method: 'GET',
						headers: { Authorization: 'Bearer token123' },
					},
					inputSchema: null,
					code: null,
				}

				const tool = createToolFromConfig({ config, context })

				expect(tool).not.toBeNull()
				expect(tool?.id).toBe('my-http-tool')
				expect(tool?.description).toBe('Fetches data from an API')
			})

			it('executes HTTP tool with config defaults', async () => {
				const config: ToolConfig = {
					id: 'api-tool',
					type: 'http',
					name: 'API Tool',
					description: 'Fetches API data',
					config: {
						url: 'https://api.example.com/data',
						method: 'GET',
						headers: { 'X-API-Key': 'secret' },
					},
					inputSchema: null,
					code: null,
				}

				mockFetch.mockResolvedValueOnce({
					ok: true,
					status: 200,
					statusText: 'OK',
					headers: new Headers({ 'content-type': 'application/json' }),
					json: async () => ({ result: 'success' }),
				})

				const tool = createToolFromConfig({ config, context })
				// Cast to typed tool for execute call
				const typedTool = tool as Tool<
					{ url: string; method: string; timeout: number },
					unknown
				> | null
				const result = await typedTool?.execute(
					{ url: 'https://api.example.com/data', method: 'GET', timeout: 30000 },
					context,
				)

				expect(result?.success).toBe(true)
				expect(mockFetch).toHaveBeenCalledWith(
					'https://api.example.com/data',
					expect.objectContaining({
						headers: expect.objectContaining({
							'X-API-Key': 'secret',
						}),
					}),
				)
			})

			it('allows runtime params to override config defaults', async () => {
				const config: ToolConfig = {
					id: 'api-tool',
					type: 'http',
					name: 'API Tool',
					description: 'Fetches API data',
					config: {
						url: 'https://api.example.com/default',
						method: 'GET',
					},
					inputSchema: null,
					code: null,
				}

				mockFetch.mockResolvedValueOnce({
					ok: true,
					status: 200,
					statusText: 'OK',
					headers: new Headers({ 'content-type': 'application/json' }),
					json: async () => ({}),
				})

				const tool = createToolFromConfig({ config, context })
				const typedTool = tool as Tool<
					{ url: string; method: string; body?: string; timeout: number },
					unknown
				> | null
				await typedTool?.execute(
					{
						url: 'https://api.example.com/override',
						method: 'POST',
						body: '{"test": true}',
						timeout: 30000,
					},
					context,
				)

				expect(mockFetch).toHaveBeenCalledWith(
					'https://api.example.com/override',
					expect.objectContaining({
						method: 'POST',
						body: '{"test": true}',
					}),
				)
			})

			it('handles null config', () => {
				const config: ToolConfig = {
					id: 'http-tool',
					type: 'http',
					name: 'HTTP Tool',
					description: 'A tool',
					config: null,
					inputSchema: null,
					code: null,
				}

				const tool = createToolFromConfig({ config, context })
				expect(tool).not.toBeNull()
			})

			it('handles empty config object', () => {
				const config: ToolConfig = {
					id: 'http-tool',
					type: 'http',
					name: 'HTTP Tool',
					description: 'A tool',
					config: {},
					inputSchema: null,
					code: null,
				}

				const tool = createToolFromConfig({ config, context })
				expect(tool).not.toBeNull()
			})
		})

		describe('Custom tool type', () => {
			it('creates custom tool from config', () => {
				const config: ToolConfig = {
					id: 'my-custom-tool',
					type: 'custom',
					name: 'My Custom Tool',
					description: 'A custom tool',
					inputSchema: { type: 'object', properties: { query: { type: 'string' } } },
					code: 'return { result: params.query }',
					config: null,
				}

				const tool = createToolFromConfig({ config, context })

				expect(tool).not.toBeNull()
				expect(tool?.id).toBe('my-custom-tool')
				expect(tool?.description).toBe('A custom tool')
			})

			it('returns failure when executing custom tool (requires sandbox)', async () => {
				const config: ToolConfig = {
					id: 'my-custom-tool',
					type: 'custom',
					name: 'My Custom Tool',
					description: 'A custom tool',
					inputSchema: { query: { type: 'string' } },
					code: 'return { result: params.query }',
					config: null,
				}

				const tool = createToolFromConfig({ config, context })
				const typedTool = tool as Tool<{ query: string }, unknown> | null
				const result = await typedTool?.execute({ query: 'test' }, context)

				expect(result?.success).toBe(false)
				expect(result?.error).toContain('not available in this environment')
			})

			it('returns failure when custom tool has no code', async () => {
				const config: ToolConfig = {
					id: 'no-code-tool',
					type: 'custom',
					name: 'No Code Tool',
					description: 'Missing code',
					inputSchema: null,
					code: null,
					config: null,
				}

				const tool = createToolFromConfig({ config, context })
				const typedTool = tool as Tool<Record<string, unknown>, unknown> | null
				const result = await typedTool?.execute({}, context)

				expect(result?.success).toBe(false)
				expect(result?.error).toContain('No code provided')
			})

			it('creates passthrough schema for custom tools without input schema', () => {
				const config: ToolConfig = {
					id: 'no-schema-tool',
					type: 'custom',
					name: 'No Schema Tool',
					description: 'No input schema',
					inputSchema: null,
					code: 'return {}',
					config: null,
				}

				const tool = createToolFromConfig({ config, context })
				expect(tool).not.toBeNull()

				// Should accept any object
				const parseResult = tool?.inputSchema.safeParse({ any: 'value' })
				expect(parseResult?.success).toBe(true)
			})
		})

		describe('Unknown tool type', () => {
			it('returns null for unknown tool type', () => {
				const config: ToolConfig = {
					id: 'unknown-tool',
					type: 'unknown' as ToolConfig['type'],
					name: 'Unknown Tool',
					description: 'Unknown type',
					config: null,
					inputSchema: null,
					code: null,
				}

				const tool = createToolFromConfig({ config, context })
				expect(tool).toBeNull()
			})
		})
	})

	describe('loadAgentTools', () => {
		it('loads tools for agent with attached tools', async () => {
			const mockDb: ToolDatabase = {
				getAgentToolIds: vi.fn().mockResolvedValue(['tool-1', 'tool-2']),
				getToolConfigs: vi.fn().mockResolvedValue([
					{
						id: 'tool-1',
						type: 'http',
						name: 'Tool 1',
						description: 'First tool',
						config: { url: 'https://api1.example.com' },
						inputSchema: null,
						code: null,
					},
					{
						id: 'tool-2',
						type: 'http',
						name: 'Tool 2',
						description: 'Second tool',
						config: { url: 'https://api2.example.com' },
						inputSchema: null,
						code: null,
					},
				]),
			}

			const tools = await loadAgentTools({
				agentId: 'agent-123',
				db: mockDb,
				context,
			})

			expect(tools).toHaveLength(2)
			expect(tools.map((t) => t.id)).toEqual(['tool-1', 'tool-2'])
			expect(mockDb.getAgentToolIds).toHaveBeenCalledWith('agent-123')
			expect(mockDb.getToolConfigs).toHaveBeenCalledWith(['tool-1', 'tool-2'])
		})

		it('returns empty array when agent has no tools', async () => {
			const mockDb: ToolDatabase = {
				getAgentToolIds: vi.fn().mockResolvedValue([]),
				getToolConfigs: vi.fn(),
			}

			const tools = await loadAgentTools({
				agentId: 'agent-no-tools',
				db: mockDb,
				context,
			})

			expect(tools).toHaveLength(0)
			expect(mockDb.getToolConfigs).not.toHaveBeenCalled()
		})

		it('filters out null tools (invalid configs)', async () => {
			const mockDb: ToolDatabase = {
				getAgentToolIds: vi.fn().mockResolvedValue(['tool-1', 'tool-2', 'tool-3']),
				getToolConfigs: vi.fn().mockResolvedValue([
					{
						id: 'tool-1',
						type: 'http',
						name: 'Valid Tool',
						description: 'Valid',
						config: { url: 'https://api.example.com' },
						inputSchema: null,
						code: null,
					},
					{
						id: 'tool-2',
						type: 'unknown' as ToolConfig['type'],
						name: 'Invalid Tool',
						description: 'Unknown type',
						config: null,
						inputSchema: null,
						code: null,
					},
					{
						id: 'tool-3',
						type: 'custom',
						name: 'Custom Tool',
						description: 'Custom',
						inputSchema: null,
						code: 'return {}',
						config: null,
					},
				]),
			}

			const tools = await loadAgentTools({
				agentId: 'agent-123',
				db: mockDb,
				context,
			})

			expect(tools).toHaveLength(2)
			expect(tools.map((t) => t.id)).toEqual(['tool-1', 'tool-3'])
		})
	})

	describe('ToolDatabase interface', () => {
		it('supports custom database implementations', async () => {
			// Simulate a custom database implementation
			const customToolStorage: Map<string, ToolConfig> = new Map([
				[
					'custom-tool-1',
					{
						id: 'custom-tool-1',
						type: 'http',
						name: 'Custom Tool 1',
						description: 'Custom HTTP tool',
						config: { url: 'https://custom.api.com' },
						inputSchema: null,
						code: null,
					},
				],
			])

			const agentToolMap: Map<string, string[]> = new Map([['agent-1', ['custom-tool-1']]])

			const customDb: ToolDatabase = {
				getAgentToolIds: async (agentId) => {
					return agentToolMap.get(agentId) || []
				},
				getToolConfigs: async (toolIds) => {
					return toolIds
						.map((id) => customToolStorage.get(id))
						.filter((t): t is ToolConfig => t !== undefined)
				},
			}

			const tools = await loadAgentTools({
				agentId: 'agent-1',
				db: customDb,
				context,
			})

			expect(tools).toHaveLength(1)
			expect(tools[0]?.id).toBe('custom-tool-1')
		})
	})
})
