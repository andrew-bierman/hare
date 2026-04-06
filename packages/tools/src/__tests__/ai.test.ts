import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
	classifyTool,
	embeddingTool,
	getAITools,
	imageGenerateTool,
	nerTool,
	qaTool,
	sentimentTool,
	summarizeTool,
	translateTool,
} from '../ai'
import type { ToolContext } from '../types'

// Mock AI binding
const createMockAI = () => ({
	run: vi.fn().mockResolvedValue([
		{ label: 'POSITIVE', score: 0.95 },
		{ label: 'NEGATIVE', score: 0.05 },
	]),
})

const createMockContext = (hasAI = true): ToolContext => ({
	env: hasAI ? { AI: createMockAI() as unknown as Ai } : ({} as ToolContext['env']),
	workspaceId: 'test-workspace',
	userId: 'test-user',
})

describe('AI Tools', () => {
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

	describe('sentimentTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(sentimentTool.id).toBe('sentiment')
			})

			it('validates basic text', () => {
				const result = sentimentTool.inputSchema.safeParse({
					text: 'I love this product!',
				})
				expect(result.success).toBe(true)
			})

			it('validates with detailed option', () => {
				const result = sentimentTool.inputSchema.safeParse({
					text: 'Great experience',
					detailed: true,
				})
				expect(result.success).toBe(true)
			})

			it('rejects empty text', () => {
				const result = sentimentTool.inputSchema.safeParse({
					text: '',
				})
				expect(result.success).toBe(false)
			})
		})

		describe('execution', () => {
			it('analyzes sentiment', async () => {
				const result = await sentimentTool.execute(
					{ text: 'I love this!', detailed: false },
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.sentiment).toBeDefined()
				expect(result.data?.confidence).toBeDefined()
			})

			it('fails when AI binding is not available', async () => {
				const contextWithoutAI = createMockContext(false)

				const result = await sentimentTool.execute(
					{ text: 'test', detailed: false },
					contextWithoutAI,
				)

				expect(result.success).toBe(false)
				expect(result.error).toContain('AI binding')
			})
		})
	})

	describe('summarizeTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(summarizeTool.id).toBe('summarize')
			})

			it('validates basic summarization', () => {
				const result = summarizeTool.inputSchema.safeParse({
					text: 'This is a long text that needs to be summarized. '.repeat(10),
				})
				expect(result.success).toBe(true)
			})

			it('validates with maxLength', () => {
				const result = summarizeTool.inputSchema.safeParse({
					text: 'Long text here. '.repeat(10),
					maxLength: 100,
				})
				expect(result.success).toBe(true)
			})

			it('validates with style', () => {
				const result = summarizeTool.inputSchema.safeParse({
					text: 'Long text here. '.repeat(10),
					style: 'bullets',
				})
				expect(result.success).toBe(true)
			})

			it('validates all style options', () => {
				const styles = ['brief', 'detailed', 'bullets'] as const
				for (const style of styles) {
					const result = summarizeTool.inputSchema.safeParse({
						text: 'Long text here. '.repeat(10),
						style,
					})
					expect(result.success).toBe(true)
				}
			})
		})

		describe('execution', () => {
			it('summarizes text', async () => {
				mockAI.run.mockResolvedValueOnce({
					response: 'This is a summary.',
				})

				const result = await summarizeTool.execute(
					{
						text: 'This is a very long text that needs summarization. '.repeat(10),
						maxLength: 200,
						style: 'brief',
					},
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.summary).toBeDefined()
			})

			it('fails when AI binding is not available', async () => {
				const contextWithoutAI = createMockContext(false)

				const result = await summarizeTool.execute(
					{ text: 'test '.repeat(20), maxLength: 200, style: 'brief' },
					contextWithoutAI,
				)

				expect(result.success).toBe(false)
				expect(result.error).toContain('AI binding')
			})
		})
	})

	describe('translateTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(translateTool.id).toBe('translate')
			})

			it('validates translation request', () => {
				const result = translateTool.inputSchema.safeParse({
					text: 'Hello, world!',
					targetLanguage: 'es',
				})
				expect(result.success).toBe(true)
			})

			it('validates with source language', () => {
				const result = translateTool.inputSchema.safeParse({
					text: 'Hola mundo',
					targetLanguage: 'en',
					sourceLanguage: 'es',
				})
				expect(result.success).toBe(true)
			})

			it('rejects empty text', () => {
				const result = translateTool.inputSchema.safeParse({
					text: '',
					targetLanguage: 'fr',
				})
				expect(result.success).toBe(false)
			})
		})

		describe('execution', () => {
			it('translates text', async () => {
				mockAI.run.mockResolvedValueOnce({
					translated_text: 'Hola mundo',
				})

				const result = await translateTool.execute(
					{ text: 'Hello, world!', targetLanguage: 'es' },
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.translatedText).toBeDefined()
			})

			it('fails when AI binding is not available', async () => {
				const contextWithoutAI = createMockContext(false)

				const result = await translateTool.execute(
					{ text: 'Hello', targetLanguage: 'fr' },
					contextWithoutAI,
				)

				expect(result.success).toBe(false)
				expect(result.error).toContain('AI binding')
			})
		})
	})

	describe('imageGenerateTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(imageGenerateTool.id).toBe('image_generate')
			})

			it('validates basic image generation', () => {
				const result = imageGenerateTool.inputSchema.safeParse({
					prompt: 'A beautiful sunset over mountains',
				})
				expect(result.success).toBe(true)
			})

			it('validates with all options', () => {
				const result = imageGenerateTool.inputSchema.safeParse({
					prompt: 'A cat wearing a hat',
					negativePrompt: 'blurry, low quality',
					width: 512,
					height: 512,
					steps: 20,
					guidance: 7.5,
				})
				expect(result.success).toBe(true)
			})
		})
	})

	describe('classifyTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(classifyTool.id).toBe('classify')
			})

			it('validates classification request', () => {
				const result = classifyTool.inputSchema.safeParse({
					text: 'I love this product!',
					categories: ['positive', 'negative', 'neutral'],
				})
				expect(result.success).toBe(true)
			})

			it('validates with multi-label', () => {
				const result = classifyTool.inputSchema.safeParse({
					text: 'Great product, fast shipping',
					categories: ['quality', 'shipping', 'price'],
					multiLabel: true,
				})
				expect(result.success).toBe(true)
			})

			it('rejects less than 2 categories', () => {
				const result = classifyTool.inputSchema.safeParse({
					text: 'test',
					categories: ['only-one'],
				})
				expect(result.success).toBe(false)
			})
		})

		describe('execution', () => {
			it('classifies text', async () => {
				mockAI.run.mockResolvedValueOnce({
					response: 'positive',
				})

				const result = await classifyTool.execute(
					{
						text: 'I absolutely love this!',
						categories: ['positive', 'negative', 'neutral'],
						multiLabel: false,
					},
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.categories).toBeDefined()
			})

			it('fails when AI binding is not available', async () => {
				const contextWithoutAI = createMockContext(false)

				const result = await classifyTool.execute(
					{ text: 'test', categories: ['a', 'b'], multiLabel: false },
					contextWithoutAI,
				)

				expect(result.success).toBe(false)
			})
		})
	})

	describe('nerTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(nerTool.id).toBe('ner')
			})

			it('validates basic NER request', () => {
				const result = nerTool.inputSchema.safeParse({
					text: 'John Smith works at Google in New York',
				})
				expect(result.success).toBe(true)
			})

			it('validates with entity types filter', () => {
				const result = nerTool.inputSchema.safeParse({
					text: 'Contact info here',
					entityTypes: ['email', 'phone'],
				})
				expect(result.success).toBe(true)
			})
		})

		describe('execution', () => {
			it('extracts entities from text', async () => {
				const result = await nerTool.execute(
					{ text: 'Contact me at test@example.com or 555-123-4567' },
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.entities).toBeDefined()
			})
		})
	})

	describe('embeddingTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(embeddingTool.id).toBe('embedding')
			})

			it('validates single text', () => {
				const result = embeddingTool.inputSchema.safeParse({
					text: 'Hello world',
				})
				expect(result.success).toBe(true)
			})

			it('validates array of texts', () => {
				const result = embeddingTool.inputSchema.safeParse({
					text: ['Hello', 'World'],
				})
				expect(result.success).toBe(true)
			})

			it('validates with model option', () => {
				const result = embeddingTool.inputSchema.safeParse({
					text: 'test',
					model: 'bge-large-en',
				})
				expect(result.success).toBe(true)
			})
		})

		describe('execution', () => {
			it('generates embeddings', async () => {
				mockAI.run.mockResolvedValueOnce({
					data: [[0.1, 0.2, 0.3, 0.4, 0.5]],
				})

				const result = await embeddingTool.execute(
					{ text: 'Hello world', model: 'bge-base-en' },
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.embeddings).toBeDefined()
				expect(result.data?.dimensions).toBeGreaterThan(0)
			})

			it('fails when AI binding is not available', async () => {
				const contextWithoutAI = createMockContext(false)

				const result = await embeddingTool.execute(
					{ text: 'test', model: 'bge-base-en' },
					contextWithoutAI,
				)

				expect(result.success).toBe(false)
			})
		})
	})

	describe('qaTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(qaTool.id).toBe('question_answer')
			})

			it('validates Q&A request', () => {
				const result = qaTool.inputSchema.safeParse({
					question: 'What is the capital of France?',
					context: 'France is a country in Europe. Its capital is Paris.',
				})
				expect(result.success).toBe(true)
			})

			it('validates with options', () => {
				const result = qaTool.inputSchema.safeParse({
					question: 'What is X?',
					context: 'X is Y.',
					options: { maxLength: 100, includeQuote: true },
				})
				expect(result.success).toBe(true)
			})
		})

		describe('execution', () => {
			it('answers questions', async () => {
				mockAI.run.mockResolvedValueOnce({
					response: 'Paris is the capital of France.',
				})

				const result = await qaTool.execute(
					{
						question: 'What is the capital?',
						context: 'France is a country. Paris is its capital.',
					},
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.answer).toBeDefined()
			})

			it('fails when AI binding is not available', async () => {
				const contextWithoutAI = createMockContext(false)

				const result = await qaTool.execute(
					{ question: 'test', context: 'test context' },
					contextWithoutAI,
				)

				expect(result.success).toBe(false)
			})
		})
	})

	describe('getAITools', () => {
		it('returns all AI tools', () => {
			const tools = getAITools(context)

			expect(tools).toHaveLength(8)
			expect(tools.map((t) => t.id)).toEqual([
				'sentiment',
				'summarize',
				'translate',
				'image_generate',
				'classify',
				'ner',
				'embedding',
				'question_answer',
			])
		})

		it('returns tools with proper structure', () => {
			const tools = getAITools(context)

			for (const tool of tools) {
				expect(tool).toHaveProperty('id')
				expect(tool).toHaveProperty('description')
				expect(tool).toHaveProperty('inputSchema')
				expect(tool).toHaveProperty('execute')
			}
		})
	})
})
