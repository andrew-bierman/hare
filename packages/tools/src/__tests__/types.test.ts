import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import {
	success,
	failure,
	createTool,
	ToolRegistry,
	createRegistry,
	type ToolContext,
	type ToolResult,
	type Tool,
} from '../types'

describe('success() helper', () => {
	it('creates a successful result with data', () => {
		const result = success({ value: 'test' })

		expect(result.success).toBe(true)
		expect(result.data).toEqual({ value: 'test' })
		expect(result.error).toBeUndefined()
	})

	it('preserves data type', () => {
		const data = { name: 'test', count: 42, nested: { flag: true } }
		const result = success(data)

		expect(result.data).toEqual(data)
		expect(result.data?.name).toBe('test')
		expect(result.data?.count).toBe(42)
		expect(result.data?.nested.flag).toBe(true)
	})

	it('handles null data', () => {
		const result = success(null)

		expect(result.success).toBe(true)
		expect(result.data).toBeNull()
	})

	it('handles undefined data', () => {
		const result = success(undefined)

		expect(result.success).toBe(true)
		expect(result.data).toBeUndefined()
	})

	it('handles primitive types', () => {
		expect(success('string').data).toBe('string')
		expect(success(42).data).toBe(42)
		expect(success(true).data).toBe(true)
		expect(success(false).data).toBe(false)
	})

	it('handles arrays', () => {
		const arr = [1, 2, 3]
		const result = success(arr)

		expect(result.data).toEqual([1, 2, 3])
	})
})

describe('failure() helper', () => {
	it('creates a failed result with error message', () => {
		const result = failure('Something went wrong')

		expect(result.success).toBe(false)
		expect(result.error).toBe('Something went wrong')
		expect(result.data).toBeUndefined()
	})

	it('preserves error message exactly', () => {
		const errorMessage = 'Error: Unable to connect\nDetails: timeout after 30s'
		const result = failure(errorMessage)

		expect(result.error).toBe(errorMessage)
	})

	it('handles empty error message', () => {
		const result = failure('')

		expect(result.success).toBe(false)
		expect(result.error).toBe('')
	})
})

describe('createTool()', () => {
	const createMockContext = (): ToolContext => ({
		env: {} as ToolContext['env'],
		workspaceId: 'test-workspace',
		userId: 'test-user',
	})

	describe('tool creation', () => {
		it('creates a tool with correct properties', () => {
			const tool = createTool({
				id: 'test_tool',
				description: 'A test tool',
				inputSchema: z.object({ query: z.string() }),
				outputSchema: z.object({ result: z.string() }),
				execute: async () => success({ result: 'done' }),
			})

			expect(tool.id).toBe('test_tool')
			expect(tool.description).toBe('A test tool')
			expect(tool.inputSchema).toBeDefined()
			expect(tool.outputSchema).toBeDefined()
			expect(tool.execute).toBeDefined()
		})

		it('validates input schema correctly', () => {
			const tool = createTool({
				id: 'test_tool',
				description: 'A test tool',
				inputSchema: z.object({
					query: z.string(),
					limit: z.number().optional().default(10),
				}),
				outputSchema: z.object({ result: z.string() }),
				execute: async () => success({ result: 'done' }),
			})

			// Valid input
			expect(tool.inputSchema.safeParse({ query: 'test' }).success).toBe(true)
			expect(tool.inputSchema.safeParse({ query: 'test', limit: 20 }).success).toBe(true)

			// Invalid input
			expect(tool.inputSchema.safeParse({}).success).toBe(false)
			expect(tool.inputSchema.safeParse({ query: 123 }).success).toBe(false)
		})
	})

	describe('execution', () => {
		it('executes tool and returns success result', async () => {
			const tool = createTool({
				id: 'test_tool',
				description: 'A test tool',
				inputSchema: z.object({ query: z.string() }),
				outputSchema: z.object({ result: z.string() }),
				execute: async (params) => success({ result: `got: ${params.query}` }),
			})

			const result = await tool.execute({ query: 'hello' }, createMockContext())

			expect(result.success).toBe(true)
			expect(result.data?.result).toBe('got: hello')
		})

		it('passes context to execute function', async () => {
			const contextSpy = vi.fn()

			const tool = createTool({
				id: 'test_tool',
				description: 'A test tool',
				inputSchema: z.object({ query: z.string() }),
				outputSchema: z.object({ result: z.string() }),
				execute: async (params, context) => {
					contextSpy(context)
					return success({ result: 'done' })
				},
			})

			const context = createMockContext()
			await tool.execute({ query: 'test' }, context)

			expect(contextSpy).toHaveBeenCalledWith(context)
			expect(contextSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					workspaceId: 'test-workspace',
					userId: 'test-user',
				}),
			)
		})

		it('returns failure result when tool fails', async () => {
			const tool = createTool({
				id: 'test_tool',
				description: 'A test tool',
				inputSchema: z.object({ query: z.string() }),
				outputSchema: z.object({ result: z.string() }),
				execute: async () => failure('Operation failed'),
			})

			const result = await tool.execute({ query: 'test' }, createMockContext())

			expect(result.success).toBe(false)
			expect(result.error).toBe('Operation failed')
		})
	})

	describe('output validation', () => {
		it('validates output against schema', async () => {
			const tool = createTool({
				id: 'test_tool',
				description: 'A test tool',
				inputSchema: z.object({ query: z.string() }),
				outputSchema: z.object({ count: z.number() }),
				execute: async () => success({ count: 42 }),
			})

			const result = await tool.execute({ query: 'test' }, createMockContext())

			expect(result.success).toBe(true)
			expect(result.data?.count).toBe(42)
		})

		it('fails when output does not match schema', async () => {
			const tool = createTool({
				id: 'test_tool',
				description: 'A test tool',
				inputSchema: z.object({ query: z.string() }),
				outputSchema: z.object({ count: z.number() }),
				execute: async () =>
					// Intentionally return wrong type
					success({ count: 'not a number' as unknown as number }),
			})

			const result = await tool.execute({ query: 'test' }, createMockContext())

			expect(result.success).toBe(false)
			expect(result.error).toContain('Output validation failed')
		})

		it('skips validation for null data', async () => {
			const tool = createTool({
				id: 'test_tool',
				description: 'A test tool',
				inputSchema: z.object({ query: z.string() }),
				outputSchema: z.object({ result: z.string() }),
				execute: async () => success(null as unknown as { result: string }),
			})

			const result = await tool.execute({ query: 'test' }, createMockContext())

			expect(result.success).toBe(true)
			expect(result.data).toBeNull()
		})

		it('skips validation for undefined data', async () => {
			const tool = createTool({
				id: 'test_tool',
				description: 'A test tool',
				inputSchema: z.object({ query: z.string() }),
				outputSchema: z.object({ result: z.string() }),
				execute: async () => success(undefined as unknown as { result: string }),
			})

			const result = await tool.execute({ query: 'test' }, createMockContext())

			expect(result.success).toBe(true)
			expect(result.data).toBeUndefined()
		})

		it('passes failure results through without validation', async () => {
			const tool = createTool({
				id: 'test_tool',
				description: 'A test tool',
				inputSchema: z.object({ query: z.string() }),
				outputSchema: z.object({ count: z.number() }),
				execute: async () => failure('Expected error'),
			})

			const result = await tool.execute({ query: 'test' }, createMockContext())

			expect(result.success).toBe(false)
			expect(result.error).toBe('Expected error')
		})
	})
})

describe('ToolRegistry', () => {
	const createMockContext = (): ToolContext => ({
		env: {} as ToolContext['env'],
		workspaceId: 'test-workspace',
		userId: 'test-user',
	})

	const createTestTool = (id: string): Tool<{ input: string }, { output: string }> =>
		createTool({
			id,
			description: `Tool ${id}`,
			inputSchema: z.object({ input: z.string() }),
			outputSchema: z.object({ output: z.string() }),
			execute: async (params) => success({ output: `processed: ${params.input}` }),
		})

	describe('register()', () => {
		it('registers a tool', () => {
			const registry = new ToolRegistry()
			const tool = createTestTool('test_tool')

			registry.register(tool)

			expect(registry.has('test_tool')).toBe(true)
		})

		it('returns registry for chaining', () => {
			const registry = new ToolRegistry()
			const tool = createTestTool('test_tool')

			const result = registry.register(tool)

			expect(result).toBe(registry)
		})

		it('allows method chaining', () => {
			const registry = new ToolRegistry()
				.register(createTestTool('tool1'))
				.register(createTestTool('tool2'))
				.register(createTestTool('tool3'))

			expect(registry.size).toBe(3)
		})

		it('overwrites existing tool with same id', () => {
			const registry = new ToolRegistry()
			const tool1 = createTestTool('test_tool')
			const tool2 = createTool({
				id: 'test_tool',
				description: 'Updated tool',
				inputSchema: z.object({ input: z.string() }),
				outputSchema: z.object({ output: z.string() }),
				execute: async () => success({ output: 'new' }),
			})

			registry.register(tool1)
			registry.register(tool2)

			expect(registry.size).toBe(1)
			expect(registry.get('test_tool')?.description).toBe('Updated tool')
		})
	})

	describe('registerAll()', () => {
		it('registers multiple tools at once', () => {
			const registry = new ToolRegistry()
			const tools = [createTestTool('tool1'), createTestTool('tool2'), createTestTool('tool3')]

			registry.registerAll(tools)

			expect(registry.size).toBe(3)
			expect(registry.has('tool1')).toBe(true)
			expect(registry.has('tool2')).toBe(true)
			expect(registry.has('tool3')).toBe(true)
		})

		it('returns registry for chaining', () => {
			const registry = new ToolRegistry()
			const tools = [createTestTool('tool1')]

			const result = registry.registerAll(tools)

			expect(result).toBe(registry)
		})

		it('handles empty array', () => {
			const registry = new ToolRegistry()

			registry.registerAll([])

			expect(registry.size).toBe(0)
		})
	})

	describe('get()', () => {
		it('returns tool by id', () => {
			const registry = new ToolRegistry()
			const tool = createTestTool('test_tool')
			registry.register(tool)

			const retrieved = registry.get('test_tool')

			expect(retrieved).toBeDefined()
			expect(retrieved?.id).toBe('test_tool')
		})

		it('returns undefined for non-existent tool', () => {
			const registry = new ToolRegistry()

			const result = registry.get('nonexistent')

			expect(result).toBeUndefined()
		})
	})

	describe('has()', () => {
		it('returns true for registered tool', () => {
			const registry = new ToolRegistry()
			registry.register(createTestTool('test_tool'))

			expect(registry.has('test_tool')).toBe(true)
		})

		it('returns false for non-existent tool', () => {
			const registry = new ToolRegistry()

			expect(registry.has('nonexistent')).toBe(false)
		})
	})

	describe('list()', () => {
		it('returns all registered tools', () => {
			const registry = new ToolRegistry()
				.register(createTestTool('tool1'))
				.register(createTestTool('tool2'))

			const tools = registry.list()

			expect(tools).toHaveLength(2)
			expect(tools.map((t) => t.id)).toContain('tool1')
			expect(tools.map((t) => t.id)).toContain('tool2')
		})

		it('returns empty array when no tools registered', () => {
			const registry = new ToolRegistry()

			const tools = registry.list()

			expect(tools).toEqual([])
		})
	})

	describe('size', () => {
		it('returns number of registered tools', () => {
			const registry = new ToolRegistry()
				.register(createTestTool('tool1'))
				.register(createTestTool('tool2'))
				.register(createTestTool('tool3'))

			expect(registry.size).toBe(3)
		})

		it('returns 0 for empty registry', () => {
			const registry = new ToolRegistry()

			expect(registry.size).toBe(0)
		})
	})

	describe('execute()', () => {
		it('executes registered tool', async () => {
			const registry = new ToolRegistry().register(createTestTool('test_tool'))

			const result = await registry.execute({
				id: 'test_tool',
				params: { input: 'hello' },
				context: createMockContext(),
			})

			expect(result.success).toBe(true)
			expect(result.data).toEqual({ output: 'processed: hello' })
		})

		it('returns failure for non-existent tool', async () => {
			const registry = new ToolRegistry()

			const result = await registry.execute({
				id: 'nonexistent',
				params: {},
				context: createMockContext(),
			})

			expect(result.success).toBe(false)
			expect(result.error).toContain("Tool 'nonexistent' not found")
		})

		it('validates input before execution', async () => {
			const registry = new ToolRegistry().register(createTestTool('test_tool'))

			const result = await registry.execute({
				id: 'test_tool',
				params: { input: 123 }, // Wrong type
				context: createMockContext(),
			})

			expect(result.success).toBe(false)
			expect(result.error).toContain("Invalid input for tool 'test_tool'")
		})

		it('passes validated input to tool', async () => {
			const executeSpy = vi.fn().mockResolvedValue(success({ output: 'done' }))
			const tool = createTool({
				id: 'spy_tool',
				description: 'Spy tool',
				inputSchema: z.object({
					input: z.string(),
					count: z.number().default(10),
				}),
				outputSchema: z.object({ output: z.string() }),
				execute: executeSpy,
			})
			const registry = new ToolRegistry().register(tool)

			await registry.execute({
				id: 'spy_tool',
				params: { input: 'test' }, // count should get default value
				context: createMockContext(),
			})

			expect(executeSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					input: 'test',
					count: 10, // Default value applied
				}),
				expect.any(Object),
			)
		})
	})
})

describe('createRegistry()', () => {
	const createTestTool = (id: string) =>
		createTool({
			id,
			description: `Tool ${id}`,
			inputSchema: z.object({ input: z.string() }),
			outputSchema: z.object({ output: z.string() }),
			execute: async () => success({ output: 'done' }),
		})

	it('creates empty registry when no tools provided', () => {
		const registry = createRegistry()

		expect(registry.size).toBe(0)
	})

	it('creates registry with provided tools', () => {
		const tools = [createTestTool('tool1'), createTestTool('tool2')]
		const registry = createRegistry(tools)

		expect(registry.size).toBe(2)
		expect(registry.has('tool1')).toBe(true)
		expect(registry.has('tool2')).toBe(true)
	})

	it('returns ToolRegistry instance', () => {
		const registry = createRegistry()

		expect(registry).toBeInstanceOf(ToolRegistry)
	})
})

describe('ToolContext injection', () => {
	it('provides workspaceId to tool execution', async () => {
		let capturedWorkspaceId: string | undefined

		const tool = createTool({
			id: 'context_tool',
			description: 'Context test tool',
			inputSchema: z.object({}),
			outputSchema: z.object({ workspaceId: z.string() }),
			execute: async (_, context) => {
				capturedWorkspaceId = context.workspaceId
				return success({ workspaceId: context.workspaceId })
			},
		})

		const context: ToolContext = {
			env: {} as ToolContext['env'],
			workspaceId: 'ws-12345',
			userId: 'user-789',
		}

		await tool.execute({}, context)

		expect(capturedWorkspaceId).toBe('ws-12345')
	})

	it('provides userId to tool execution', async () => {
		let capturedUserId: string | undefined | null

		const tool = createTool({
			id: 'context_tool',
			description: 'Context test tool',
			inputSchema: z.object({}),
			outputSchema: z.object({ userId: z.string().nullable() }),
			execute: async (_, context) => {
				capturedUserId = context.userId
				return success({ userId: context.userId ?? null })
			},
		})

		const context: ToolContext = {
			env: {} as ToolContext['env'],
			workspaceId: 'ws-12345',
			userId: 'user-789',
		}

		await tool.execute({}, context)

		expect(capturedUserId).toBe('user-789')
	})

	it('handles optional userId being undefined', async () => {
		let capturedUserId: string | undefined | null

		const tool = createTool({
			id: 'context_tool',
			description: 'Context test tool',
			inputSchema: z.object({}),
			outputSchema: z.object({ hasUser: z.boolean() }),
			execute: async (_, context) => {
				capturedUserId = context.userId
				return success({ hasUser: !!context.userId })
			},
		})

		const context: ToolContext = {
			env: {} as ToolContext['env'],
			workspaceId: 'ws-12345',
			// userId not provided
		}

		const result = await tool.execute({}, context)

		expect(capturedUserId).toBeUndefined()
		expect(result.data?.hasUser).toBe(false)
	})

	it('handles userId being null', async () => {
		let capturedUserId: string | undefined | null

		const tool = createTool({
			id: 'context_tool',
			description: 'Context test tool',
			inputSchema: z.object({}),
			outputSchema: z.object({ hasUser: z.boolean() }),
			execute: async (_, context) => {
				capturedUserId = context.userId
				return success({ hasUser: !!context.userId })
			},
		})

		const context: ToolContext = {
			env: {} as ToolContext['env'],
			workspaceId: 'ws-12345',
			userId: null,
		}

		const result = await tool.execute({}, context)

		expect(capturedUserId).toBeNull()
		expect(result.data?.hasUser).toBe(false)
	})

	it('provides env bindings to tool execution', async () => {
		let capturedEnv: unknown

		const tool = createTool({
			id: 'env_tool',
			description: 'Env test tool',
			inputSchema: z.object({}),
			outputSchema: z.object({ hasKV: z.boolean() }),
			execute: async (_, context) => {
				capturedEnv = context.env
				return success({ hasKV: !!context.env.KV })
			},
		})

		const mockKV = { get: vi.fn(), put: vi.fn() }
		const context: ToolContext = {
			env: { KV: mockKV as unknown as KVNamespace } as ToolContext['env'],
			workspaceId: 'ws-12345',
		}

		const result = await tool.execute({}, context)

		expect(capturedEnv).toBe(context.env)
		expect(result.data?.hasKV).toBe(true)
	})
})

describe('ToolResult type', () => {
	it('success result has correct shape', () => {
		const result: ToolResult<{ value: number }> = {
			success: true,
			data: { value: 42 },
		}

		expect(result.success).toBe(true)
		expect(result.data?.value).toBe(42)
		expect(result.error).toBeUndefined()
	})

	it('failure result has correct shape', () => {
		const result: ToolResult<{ value: number }> = {
			success: false,
			error: 'Something went wrong',
		}

		expect(result.success).toBe(false)
		expect(result.error).toBe('Something went wrong')
		expect(result.data).toBeUndefined()
	})
})
