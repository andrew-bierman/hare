/**
 * Tests for providers/workers-ai.ts - Workers AI provider
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'

// Mock the workers-ai-provider
vi.mock('workers-ai-provider', () => ({
	createWorkersAI: vi.fn().mockReturnValue((modelId: string) => ({
		specificationVersion: 'v1',
		provider: 'workers-ai',
		modelId,
	})),
}))

import {
	createWorkersAIModel,
	getWorkersAIModelId,
	getAvailableModels,
	generateEmbedding,
	generateEmbeddings,
	WORKERS_AI_MODELS,
	EMBEDDING_MODELS,
} from '../providers/workers-ai'

/**
 * Create a mock Ai binding for testing.
 */
function createMockAi() {
	return {
		run: vi.fn().mockResolvedValue({
			data: [[0.1, 0.2, 0.3, 0.4, 0.5]],
		}),
	} as Ai & { run: ReturnType<typeof vi.fn> }
}

describe('WORKERS_AI_MODELS', () => {
	it('contains expected Llama models', () => {
		expect(WORKERS_AI_MODELS['llama-3.3-70b']).toBe('@cf/meta/llama-3.3-70b-instruct-fp8-fast')
		expect(WORKERS_AI_MODELS['llama-3.1-8b']).toBe('@cf/meta/llama-3.1-8b-instruct')
		expect(WORKERS_AI_MODELS['llama-3.2-3b']).toBe('@cf/meta/llama-3.2-3b-instruct')
		expect(WORKERS_AI_MODELS['llama-3.2-1b']).toBe('@cf/meta/llama-3.2-1b-instruct')
	})

	it('contains expected Mistral models', () => {
		expect(WORKERS_AI_MODELS['mistral-7b']).toBe('@cf/mistral/mistral-7b-instruct-v0.2')
	})

	it('contains expected Qwen models', () => {
		expect(WORKERS_AI_MODELS['qwen-1.5-14b']).toBe('@cf/qwen/qwen1.5-14b-chat-awq')
		expect(WORKERS_AI_MODELS['qwen-1.5-7b']).toBe('@cf/qwen/qwen1.5-7b-chat-awq')
	})

	it('contains expected DeepSeek models', () => {
		expect(WORKERS_AI_MODELS['deepseek-r1-distill-qwen-32b']).toBe(
			'@cf/deepseek-ai/deepseek-r1-distill-qwen-32b',
		)
	})

	it('contains expected Gemma models', () => {
		expect(WORKERS_AI_MODELS['gemma-7b']).toBe('@cf/google/gemma-7b-it-lora')
		expect(WORKERS_AI_MODELS['gemma-2b']).toBe('@cf/google/gemma-2b-it-lora')
	})
})

describe('EMBEDDING_MODELS', () => {
	it('contains expected BGE models', () => {
		expect(EMBEDDING_MODELS['bge-base-en']).toBe('@cf/baai/bge-base-en-v1.5')
		expect(EMBEDDING_MODELS['bge-small-en']).toBe('@cf/baai/bge-small-en-v1.5')
		expect(EMBEDDING_MODELS['bge-large-en']).toBe('@cf/baai/bge-large-en-v1.5')
	})
})

describe('getWorkersAIModelId', () => {
	it('returns full model ID for known short names', () => {
		expect(getWorkersAIModelId('llama-3.3-70b')).toBe('@cf/meta/llama-3.3-70b-instruct-fp8-fast')
		expect(getWorkersAIModelId('mistral-7b')).toBe('@cf/mistral/mistral-7b-instruct-v0.2')
		expect(getWorkersAIModelId('qwen-1.5-14b')).toBe('@cf/qwen/qwen1.5-14b-chat-awq')
	})

	it('returns input as-is for full model IDs starting with @cf/', () => {
		const fullModelId = '@cf/custom/my-model'
		expect(getWorkersAIModelId(fullModelId)).toBe(fullModelId)
	})

	it('returns default model for unknown names', () => {
		expect(getWorkersAIModelId('unknown-model')).toBe('@cf/meta/llama-3.3-70b-instruct-fp8-fast')
	})

	it('returns default model for empty string', () => {
		expect(getWorkersAIModelId('')).toBe('@cf/meta/llama-3.3-70b-instruct-fp8-fast')
	})
})

describe('createWorkersAIModel', () => {
	let mockAi: Ai

	beforeEach(() => {
		mockAi = createMockAi()
		vi.clearAllMocks()
	})

	it('creates a model with short name', () => {
		const model = createWorkersAIModel({
			modelName: 'llama-3.3-70b',
			ai: mockAi,
		}) as unknown as { provider: string; modelId: string }

		expect(model).toBeDefined()
		expect(model.provider).toBe('workers-ai')
		expect(model.modelId).toBe('@cf/meta/llama-3.3-70b-instruct-fp8-fast')
	})

	it('creates a model with full model ID', () => {
		const model = createWorkersAIModel({
			modelName: '@cf/meta/llama-3.1-8b-instruct',
			ai: mockAi,
		}) as unknown as { provider: string; modelId: string }

		expect(model).toBeDefined()
		expect(model.modelId).toBe('@cf/meta/llama-3.1-8b-instruct')
	})

	it('creates a model with default for unknown name', () => {
		const model = createWorkersAIModel({
			modelName: 'unknown',
			ai: mockAi,
		}) as unknown as { provider: string; modelId: string }

		expect(model).toBeDefined()
		expect(model.modelId).toBe('@cf/meta/llama-3.3-70b-instruct-fp8-fast')
	})

	it('calls createWorkersAI with the AI binding', async () => {
		const { createWorkersAI } = await import('workers-ai-provider')

		createWorkersAIModel({
			modelName: 'llama-3.3-70b',
			ai: mockAi,
		})

		expect(createWorkersAI).toHaveBeenCalledWith({ binding: mockAi })
	})
})

describe('generateEmbeddings', () => {
	let mockAi: ReturnType<typeof createMockAi>

	beforeEach(() => {
		mockAi = createMockAi()
		vi.clearAllMocks()
	})

	it('generates embeddings for multiple texts', async () => {
		const texts = ['Hello world', 'How are you']
		mockAi.run.mockResolvedValue({
			data: [
				[0.1, 0.2, 0.3],
				[0.4, 0.5, 0.6],
			],
		})

		const embeddings = await generateEmbeddings({
			ai: mockAi,
			texts,
		})

		expect(embeddings).toHaveLength(2)
		expect(embeddings[0]).toEqual([0.1, 0.2, 0.3])
		expect(embeddings[1]).toEqual([0.4, 0.5, 0.6])
	})

	it('uses default embedding model when not specified', async () => {
		await generateEmbeddings({
			ai: mockAi,
			texts: ['test'],
		})

		expect(mockAi.run).toHaveBeenCalledWith('@cf/baai/bge-base-en-v1.5', expect.any(Object))
	})

	it('uses specified embedding model', async () => {
		await generateEmbeddings({
			ai: mockAi,
			texts: ['test'],
			model: 'bge-large-en',
		})

		expect(mockAi.run).toHaveBeenCalledWith('@cf/baai/bge-large-en-v1.5', expect.any(Object))
	})

	it('passes texts to AI.run', async () => {
		const texts = ['first text', 'second text']

		await generateEmbeddings({
			ai: mockAi,
			texts,
		})

		expect(mockAi.run).toHaveBeenCalledWith(expect.any(String), { text: texts })
	})
})

describe('generateEmbedding', () => {
	let mockAi: ReturnType<typeof createMockAi>

	beforeEach(() => {
		mockAi = createMockAi()
		vi.clearAllMocks()
	})

	it('generates embedding for single text', async () => {
		mockAi.run.mockResolvedValue({
			data: [[0.1, 0.2, 0.3, 0.4, 0.5]],
		})

		const embedding = await generateEmbedding({
			ai: mockAi,
			text: 'Hello world',
		})

		expect(embedding).toEqual([0.1, 0.2, 0.3, 0.4, 0.5])
	})

	it('uses default embedding model when not specified', async () => {
		await generateEmbedding({
			ai: mockAi,
			text: 'test',
		})

		expect(mockAi.run).toHaveBeenCalledWith('@cf/baai/bge-base-en-v1.5', expect.any(Object))
	})

	it('uses specified embedding model', async () => {
		await generateEmbedding({
			ai: mockAi,
			text: 'test',
			model: 'bge-small-en',
		})

		expect(mockAi.run).toHaveBeenCalledWith('@cf/baai/bge-small-en-v1.5', expect.any(Object))
	})

	it('throws error when embedding generation fails', async () => {
		mockAi.run.mockResolvedValue({
			data: [], // Empty data array
		})

		await expect(
			generateEmbedding({
				ai: mockAi,
				text: 'test',
			}),
		).rejects.toThrow('Failed to generate embedding')
	})
})

describe('getAvailableModels', () => {
	it('returns array of model objects', () => {
		const models = getAvailableModels()

		expect(Array.isArray(models)).toBe(true)
		expect(models.length).toBeGreaterThan(0)
	})

	it('each model has required properties', () => {
		const models = getAvailableModels()

		for (const model of models) {
			expect(model).toHaveProperty('id')
			expect(model).toHaveProperty('name')
			expect(model).toHaveProperty('description')
			expect(typeof model.id).toBe('string')
			expect(typeof model.name).toBe('string')
			expect(typeof model.description).toBe('string')
		}
	})

	it('includes expected models', () => {
		const models = getAvailableModels()
		const modelIds = models.map((m) => m.id)

		expect(modelIds).toContain('llama-3.3-70b')
		expect(modelIds).toContain('llama-3.1-8b')
		expect(modelIds).toContain('mistral-7b')
	})

	it('model IDs correspond to WORKERS_AI_MODELS keys', () => {
		const models = getAvailableModels()

		for (const model of models) {
			expect(model.id in WORKERS_AI_MODELS).toBe(true)
		}
	})

	it('returns models with meaningful descriptions', () => {
		const models = getAvailableModels()

		for (const model of models) {
			expect(model.description.length).toBeGreaterThan(10)
		}
	})
})
