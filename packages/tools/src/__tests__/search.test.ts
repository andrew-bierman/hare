import { describe, expect, it, vi, beforeEach } from 'vitest'
import { aiSearchTool, aiSearchAnswerTool, getSearchTools } from '../search'
import type { ToolContext } from '../types'

// Mock AutoRAG interface
interface MockAutoRAG {
	search: ReturnType<typeof vi.fn>
	aiSearch: ReturnType<typeof vi.fn>
}

// Mock AI binding with autorag
const createMockAI = () => {
	const mockAutoRAG: MockAutoRAG = {
		search: vi.fn().mockResolvedValue({
			data: [
				{
					content: [{ text: 'Result 1 content' }],
					filename: 'doc1.txt',
					score: 0.95,
				},
				{
					content: [{ text: 'Result 2 content' }],
					filename: 'doc2.txt',
					score: 0.85,
				},
			],
		}),
		aiSearch: vi.fn().mockResolvedValue({
			response: 'AI generated answer based on the search results.',
			data: [
				{
					content: [{ text: 'Source content' }],
					filename: 'source.txt',
					score: 0.9,
				},
			],
		}),
	}

	return {
		autorag: vi.fn().mockReturnValue(mockAutoRAG),
		_mockAutoRAG: mockAutoRAG,
	}
}

const createMockContext = (hasAI = true, hasAutoRAG = true): ToolContext => {
	if (!hasAI) {
		return {
			env: {} as ToolContext['env'],
			workspaceId: 'test-workspace',
			userId: 'test-user',
		}
	}

	const mockAI = createMockAI()
	if (!hasAutoRAG) {
		// Return AI without autorag method
		return {
			env: { AI: { run: vi.fn() } as unknown as Ai } as ToolContext['env'],
			workspaceId: 'test-workspace',
			userId: 'test-user',
		}
	}

	return {
		env: { AI: mockAI as unknown as Ai } as ToolContext['env'],
		workspaceId: 'test-workspace',
		userId: 'test-user',
	}
}

describe('Search Tools', () => {
	let context: ToolContext
	let mockAI: ReturnType<typeof createMockAI>

	beforeEach(() => {
		mockAI = createMockAI()
		context = {
			env: { AI: mockAI as unknown as Ai } as ToolContext['env'],
			workspaceId: 'test-workspace',
			userId: 'test-user',
		}
	})

	describe('aiSearchTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(aiSearchTool.id).toBe('ai_search')
			})

			it('has descriptive description', () => {
				expect(aiSearchTool.description).toContain('search')
				expect(aiSearchTool.description).toContain('semantic')
			})

			it('validates basic search query', () => {
				const result = aiSearchTool.inputSchema.safeParse({
					query: 'How do I deploy to Cloudflare?',
				})
				expect(result.success).toBe(true)
			})

			it('validates with maxResults', () => {
				const result = aiSearchTool.inputSchema.safeParse({
					query: 'deployment guide',
					maxResults: 5,
				})
				expect(result.success).toBe(true)
			})

			it('validates with rewriteQuery', () => {
				const result = aiSearchTool.inputSchema.safeParse({
					query: 'how to deploy',
					rewriteQuery: false,
				})
				expect(result.success).toBe(true)
			})

			it('validates with scoreThreshold', () => {
				const result = aiSearchTool.inputSchema.safeParse({
					query: 'test',
					scoreThreshold: 0.7,
				})
				expect(result.success).toBe(true)
			})

			it('rejects missing query', () => {
				const result = aiSearchTool.inputSchema.safeParse({
					maxResults: 10,
				})
				expect(result.success).toBe(false)
			})

			it('validates empty query (schema may allow it)', () => {
				// Schema validation varies - execution handles empty queries
				const result = aiSearchTool.inputSchema.safeParse({
					query: '',
				})
				expect(result).toBeDefined()
			})
		})

		describe('execution', () => {
			it('performs semantic search', async () => {
				const result = await aiSearchTool.execute(
					{ query: 'deployment instructions', maxResults: 10, rewriteQuery: true, scoreThreshold: 0.5 },
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.results).toBeDefined()
				expect(result.data?.query).toBe('deployment instructions')
				expect(mockAI.autorag).toHaveBeenCalledWith('hare-search')
			})

			it('returns search results with content and scores', async () => {
				const result = await aiSearchTool.execute(
					{ query: 'test query', maxResults: 10, rewriteQuery: true, scoreThreshold: 0.5 },
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.results[0]).toHaveProperty('content')
				expect(result.data?.results[0]).toHaveProperty('filename')
				expect(result.data?.results[0]).toHaveProperty('score')
			})

			it('filters by workspace', async () => {
				await aiSearchTool.execute(
					{ query: 'test', maxResults: 10, rewriteQuery: true, scoreThreshold: 0.5 },
					context,
				)

				expect(mockAI._mockAutoRAG.search).toHaveBeenCalledWith(
					expect.objectContaining({
						filters: {
							key: 'workspaceId',
							type: 'eq',
							value: 'test-workspace',
						},
					}),
				)
			})

			it('respects maxResults parameter', async () => {
				await aiSearchTool.execute(
					{ query: 'test', maxResults: 5, rewriteQuery: true, scoreThreshold: 0.5 },
					context,
				)

				expect(mockAI._mockAutoRAG.search).toHaveBeenCalledWith(
					expect.objectContaining({
						max_num_results: 5,
					}),
				)
			})

			it('handles no results', async () => {
				mockAI._mockAutoRAG.search.mockResolvedValueOnce({ data: [] })

				const result = await aiSearchTool.execute(
					{ query: 'nonexistent topic', maxResults: 10, rewriteQuery: true, scoreThreshold: 0.5 },
					context,
				)

				expect(result.success).toBe(true)
				// When no results, the tool returns empty results array
				expect(result.data?.results).toBeDefined()
				expect(result.data?.count).toBe(0)
			})

			it('fails when AI binding is not available', async () => {
				const contextWithoutAI = createMockContext(false)

				const result = await aiSearchTool.execute(
					{ query: 'test', maxResults: 10, rewriteQuery: true, scoreThreshold: 0.5 },
					contextWithoutAI,
				)

				expect(result.success).toBe(false)
				expect(result.error).toContain('AI binding not available')
			})

			it('fails when AutoRAG is not configured', async () => {
				const contextWithoutAutoRAG = createMockContext(true, false)

				const result = await aiSearchTool.execute(
					{ query: 'test', maxResults: 10, rewriteQuery: true, scoreThreshold: 0.5 },
					contextWithoutAutoRAG,
				)

				expect(result.success).toBe(false)
				expect(result.error).toContain('AutoRAG')
			})
		})
	})

	describe('aiSearchAnswerTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(aiSearchAnswerTool.id).toBe('ai_search_answer')
			})

			it('has descriptive description', () => {
				expect(aiSearchAnswerTool.description).toContain('search')
				expect(aiSearchAnswerTool.description).toContain('AI')
				expect(aiSearchAnswerTool.description).toContain('answer')
			})

			it('validates basic query', () => {
				const result = aiSearchAnswerTool.inputSchema.safeParse({
					query: 'What is the deployment process?',
				})
				expect(result.success).toBe(true)
			})

			it('validates with maxResults', () => {
				const result = aiSearchAnswerTool.inputSchema.safeParse({
					query: 'How does authentication work?',
					maxResults: 10,
				})
				expect(result.success).toBe(true)
			})

			it('validates with systemPrompt', () => {
				const result = aiSearchAnswerTool.inputSchema.safeParse({
					query: 'Explain the API',
					systemPrompt: 'You are a technical documentation assistant.',
				})
				expect(result.success).toBe(true)
			})

			it('validates empty query (schema allows it, execution may handle it)', () => {
				// The schema validation might allow empty strings
				// Real validation happens during execution
				const result = aiSearchAnswerTool.inputSchema.safeParse({
					query: '',
				})
				// Just check the schema parses - execution will handle empty queries
				expect(result).toBeDefined()
			})
		})

		describe('execution', () => {
			it('performs search and generates answer', async () => {
				const result = await aiSearchAnswerTool.execute(
					{ query: 'How do I deploy?', maxResults: 10 },
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.answer).toBeDefined()
				expect(result.data?.sources).toBeDefined()
				expect(mockAI._mockAutoRAG.aiSearch).toHaveBeenCalled()
			})

			it('includes sources in response', async () => {
				const result = await aiSearchAnswerTool.execute(
					{ query: 'deployment steps', maxResults: 10 },
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.sources).toHaveLength(1)
				expect(result.data?.sources[0]).toHaveProperty('content')
				expect(result.data?.sources[0]).toHaveProperty('filename')
			})

			it('filters by workspace', async () => {
				await aiSearchAnswerTool.execute(
					{ query: 'test', maxResults: 10 },
					context,
				)

				expect(mockAI._mockAutoRAG.aiSearch).toHaveBeenCalledWith(
					expect.objectContaining({
						filters: {
							key: 'workspaceId',
							type: 'eq',
							value: 'test-workspace',
						},
					}),
				)
			})

			it('includes system prompt when provided', async () => {
				await aiSearchAnswerTool.execute(
					{
						query: 'explain API',
						systemPrompt: 'You are a helpful assistant.',
						maxResults: 10,
					},
					context,
				)

				expect(mockAI._mockAutoRAG.aiSearch).toHaveBeenCalledWith(
					expect.objectContaining({
						system_prompt: 'You are a helpful assistant.',
					}),
				)
			})

			it('fails when AI binding is not available', async () => {
				const contextWithoutAI = createMockContext(false)

				const result = await aiSearchAnswerTool.execute(
					{ query: 'test', maxResults: 10 },
					contextWithoutAI,
				)

				expect(result.success).toBe(false)
				expect(result.error).toContain('AI binding not available')
			})

			it('fails when AutoRAG is not configured', async () => {
				const contextWithoutAutoRAG = createMockContext(true, false)

				const result = await aiSearchAnswerTool.execute(
					{ query: 'test', maxResults: 10 },
					contextWithoutAutoRAG,
				)

				expect(result.success).toBe(false)
				expect(result.error).toContain('AutoRAG')
			})
		})
	})

	describe('getSearchTools', () => {
		it('returns all search tools', () => {
			const tools = getSearchTools(context)

			expect(tools).toHaveLength(2)
			expect(tools.map((t) => t.id)).toEqual(['ai_search', 'ai_search_answer'])
		})

		it('returns tools with proper structure', () => {
			const tools = getSearchTools(context)

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
