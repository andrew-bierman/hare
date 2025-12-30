import { describe, expect, it, vi, beforeEach } from 'vitest'
import { recallMemoryTool, storeMemoryTool, getMemoryTools } from '../memory'
import type { ToolContext } from '../types'
import { expectResultData, ResultSchemas } from './test-utils'

// Mock AI binding for embedding generation
const createMockAI = () => ({
	run: vi.fn().mockResolvedValue({
		data: [[0.1, 0.2, 0.3, 0.4, 0.5]], // Mock embedding vector
	}),
})

// Mock Vectorize binding
const createMockVectorize = () => ({
	query: vi.fn().mockResolvedValue({
		matches: [
			{
				id: 'mem_123',
				score: 0.95,
				metadata: {
					content: 'Test memory content',
					type: 'fact',
					agentId: 'test-workspace',
					workspaceId: 'test-workspace',
					createdAt: '2024-01-15T00:00:00Z',
					tags: ['test'],
				},
			},
			{
				id: 'mem_456',
				score: 0.85,
				metadata: {
					content: 'Another memory',
					type: 'context',
					agentId: 'test-workspace',
					workspaceId: 'test-workspace',
					createdAt: '2024-01-14T00:00:00Z',
				},
			},
		],
	}),
	insert: vi.fn().mockResolvedValue(undefined),
})

const createMockContext = (hasAI = true, hasVectorize = true): ToolContext => {
	const env: Record<string, unknown> = {}
	if (hasAI) {
		env.AI = createMockAI() as unknown as Ai
	}
	if (hasVectorize) {
		env.VECTORIZE = createMockVectorize() as unknown as VectorizeIndex
	}

	return {
		env: env as ToolContext['env'],
		workspaceId: 'test-workspace',
		userId: 'test-user',
	}
}

describe('Memory Tools', () => {
	let context: ToolContext

	beforeEach(() => {
		context = createMockContext()
	})

	describe('recallMemoryTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(recallMemoryTool.id).toBe('recall_memory')
			})

			it('has descriptive description', () => {
				expect(recallMemoryTool.description).toContain('memory')
			})

			it('validates basic recall query', () => {
				const result = recallMemoryTool.inputSchema.safeParse({
					query: 'What do I know about the user?',
				})
				expect(result.success).toBe(true)
			})

			it('validates with topK', () => {
				const result = recallMemoryTool.inputSchema.safeParse({
					query: 'user preferences',
					topK: 10,
				})
				expect(result.success).toBe(true)
			})

			it('validates with type filter', () => {
				const result = recallMemoryTool.inputSchema.safeParse({
					query: 'facts',
					type: 'fact',
				})
				expect(result.success).toBe(true)
			})

			it('validates with tags filter', () => {
				const result = recallMemoryTool.inputSchema.safeParse({
					query: 'project info',
					tags: ['project', 'important'],
				})
				expect(result.success).toBe(true)
			})

			it('validates all memory types', () => {
				const types = ['fact', 'context', 'preference', 'conversation', 'custom']
				for (const type of types) {
					const result = recallMemoryTool.inputSchema.safeParse({
						query: 'test',
						type,
					})
					expect(result.success).toBe(true)
				}
			})

			it('rejects missing query', () => {
				const result = recallMemoryTool.inputSchema.safeParse({
					topK: 5,
				})
				expect(result.success).toBe(false)
			})

			it('rejects empty query', () => {
				const result = recallMemoryTool.inputSchema.safeParse({
					query: '',
				})
				expect(result.success).toBe(false)
			})

			it('rejects query over max length', () => {
				const result = recallMemoryTool.inputSchema.safeParse({
					query: 'x'.repeat(1001),
				})
				expect(result.success).toBe(false)
			})

			it('rejects topK over 20', () => {
				const result = recallMemoryTool.inputSchema.safeParse({
					query: 'test',
					topK: 25,
				})
				expect(result.success).toBe(false)
			})
		})

		describe('execution', () => {
			it('recalls memories successfully', async () => {
				const result = await recallMemoryTool.execute(
					{ query: 'What do I know?', topK: 5 },
					context,
				)

				const data = expectResultData(result, ResultSchemas.recallMemory)
				expect(data.found).toBe(true)
				expect(data.memories).toHaveLength(2)
			})

			it('returns formatted memories', async () => {
				const result = await recallMemoryTool.execute(
					{ query: 'test', topK: 5 },
					context,
				)

				const data = expectResultData(result, ResultSchemas.recallMemory)
				const memory = (data.memories as unknown[])?.[0] as Record<string, unknown>
				expect(memory).toHaveProperty('id')
				expect(memory).toHaveProperty('content')
				expect(memory).toHaveProperty('type')
				expect(memory).toHaveProperty('relevance')
			})

			it('generates embedding for query', async () => {
				await recallMemoryTool.execute(
					{ query: 'test query', topK: 5 },
					context,
				)

				expect(context.env.AI?.run).toHaveBeenCalledWith(
					'@cf/baai/bge-base-en-v1.5',
					{ text: ['test query'] },
				)
			})

			it('handles no results', async () => {
				const emptyContext = createMockContext()
				;(emptyContext.env.VECTORIZE as unknown as { query: ReturnType<typeof vi.fn> }).query.mockResolvedValueOnce({ matches: [] })

				const result = await recallMemoryTool.execute(
					{ query: 'nonexistent topic', topK: 5 },
					emptyContext,
				)

				const data = expectResultData(result, ResultSchemas.recallMemory)
				expect(data.found).toBe(false)
				expect(data.memories).toHaveLength(0)
			})

			it('fails when AI binding is not available', async () => {
				const contextWithoutAI = createMockContext(false, true)

				const result = await recallMemoryTool.execute(
					{ query: 'test', topK: 5 },
					contextWithoutAI,
				)

				expect(result.success).toBe(false)
				expect(result.error).toContain('AI')
				expect(result.error).toContain('VECTORIZE')
			})

			it('fails when VECTORIZE binding is not available', async () => {
				const contextWithoutVectorize = createMockContext(true, false)

				const result = await recallMemoryTool.execute(
					{ query: 'test', topK: 5 },
					contextWithoutVectorize,
				)

				expect(result.success).toBe(false)
				expect(result.error).toContain('VECTORIZE')
			})
		})
	})

	describe('storeMemoryTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(storeMemoryTool.id).toBe('store_memory')
			})

			it('has descriptive description', () => {
				expect(storeMemoryTool.description).toContain('memory')
			})

			it('validates basic memory storage', () => {
				const result = storeMemoryTool.inputSchema.safeParse({
					content: 'The user prefers dark mode',
				})
				expect(result.success).toBe(true)
			})

			it('validates with type', () => {
				const result = storeMemoryTool.inputSchema.safeParse({
					content: 'User likes coffee',
					type: 'preference',
				})
				expect(result.success).toBe(true)
			})

			it('validates with tags', () => {
				const result = storeMemoryTool.inputSchema.safeParse({
					content: 'Project deadline is March 15',
					tags: ['project', 'deadline', 'important'],
				})
				expect(result.success).toBe(true)
			})

			it('validates with source', () => {
				const result = storeMemoryTool.inputSchema.safeParse({
					content: 'User mentioned they work at Acme Corp',
					source: 'conversation_123',
				})
				expect(result.success).toBe(true)
			})

			it('validates all memory types', () => {
				const types = ['fact', 'context', 'preference', 'conversation', 'custom']
				for (const type of types) {
					const result = storeMemoryTool.inputSchema.safeParse({
						content: 'test content',
						type,
					})
					expect(result.success).toBe(true)
				}
			})

			it('rejects empty content', () => {
				const result = storeMemoryTool.inputSchema.safeParse({
					content: '',
				})
				expect(result.success).toBe(false)
			})

			it('rejects content over max length', () => {
				const result = storeMemoryTool.inputSchema.safeParse({
					content: 'x'.repeat(5001),
				})
				expect(result.success).toBe(false)
			})

			it('rejects too many tags', () => {
				const result = storeMemoryTool.inputSchema.safeParse({
					content: 'test',
					tags: Array(11).fill('tag'),
				})
				expect(result.success).toBe(false)
			})
		})

		describe('execution', () => {
			it('stores memory successfully', async () => {
				const result = await storeMemoryTool.execute(
					{
						content: 'User prefers TypeScript over JavaScript',
						type: 'preference',
					},
					context,
				)

				const data = expectResultData(result, ResultSchemas.storeMemory)
				expect(data.stored).toBe(true)
				expect(data.memoryId).toBeDefined()
			})

			it('generates embedding for content', async () => {
				await storeMemoryTool.execute(
					{ content: 'Important fact to remember', type: 'fact' },
					context,
				)

				expect(context.env.AI?.run).toHaveBeenCalledWith(
					'@cf/baai/bge-base-en-v1.5',
					{ text: ['Important fact to remember'] },
				)
			})

			it('inserts into Vectorize with metadata', async () => {
				await storeMemoryTool.execute(
					{
						content: 'Test content',
						type: 'fact',
						tags: ['test'],
						source: 'test_source',
					},
					context,
				)

				expect(context.env.VECTORIZE?.insert).toHaveBeenCalledWith([
					expect.objectContaining({
						id: expect.stringMatching(/^mem_/),
						values: expect.any(Array),
						metadata: expect.objectContaining({
							content: 'Test content',
							type: 'fact',
							agentId: 'test-workspace',
							workspaceId: 'test-workspace',
							tags: ['test'],
							source: 'test_source',
						}),
					}),
				])
			})

			it('generates unique memory IDs', async () => {
				const result1 = await storeMemoryTool.execute(
					{ content: 'Memory 1', type: 'custom' },
					context,
				)
				const result2 = await storeMemoryTool.execute(
					{ content: 'Memory 2', type: 'custom' },
					context,
				)

				const data1 = expectResultData(result1, ResultSchemas.storeMemory)
				const data2 = expectResultData(result2, ResultSchemas.storeMemory)
				expect(data1.memoryId).not.toBe(data2.memoryId)
			})

			it('includes timestamp in metadata', async () => {
				await storeMemoryTool.execute(
					{ content: 'Test content', type: 'custom' },
					context,
				)

				expect(context.env.VECTORIZE?.insert).toHaveBeenCalledWith([
					expect.objectContaining({
						metadata: expect.objectContaining({
							createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
						}),
					}),
				])
			})

			it('uses default type when not specified', async () => {
				const result = await storeMemoryTool.execute(
					{ content: 'Content without type', type: 'custom' },
					context,
				)

				const data = expectResultData(result, ResultSchemas.storeMemory)
				expect(data.type).toBe('custom')
			})

			it('fails when AI binding is not available', async () => {
				const contextWithoutAI = createMockContext(false, true)

				const result = await storeMemoryTool.execute(
					{ content: 'test', type: 'custom' },
					contextWithoutAI,
				)

				expect(result.success).toBe(false)
				expect(result.error).toContain('VECTORIZE')
			})

			it('fails when VECTORIZE binding is not available', async () => {
				const contextWithoutVectorize = createMockContext(true, false)

				const result = await storeMemoryTool.execute(
					{ content: 'test', type: 'custom' },
					contextWithoutVectorize,
				)

				expect(result.success).toBe(false)
				expect(result.error).toContain('VECTORIZE')
			})
		})
	})

	describe('getMemoryTools', () => {
		it('returns all memory tools', () => {
			const tools = getMemoryTools(context)

			expect(tools).toHaveLength(2)
			expect(tools.map((t) => t.id)).toEqual(['recall_memory', 'store_memory'])
		})

		it('returns tools with proper structure', () => {
			const tools = getMemoryTools(context)

			for (const tool of tools) {
				expect(tool).toHaveProperty('id')
				expect(tool).toHaveProperty('description')
				expect(tool).toHaveProperty('inputSchema')
				expect(tool).toHaveProperty('execute')
				expect(typeof tool.execute).toBe('function')
			}
		})
	})
})
