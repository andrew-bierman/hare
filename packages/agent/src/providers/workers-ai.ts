import type { LanguageModel } from 'ai'
import { createWorkersAI } from 'workers-ai-provider'

/**
 * Workers AI model IDs mapped to user-friendly names.
 */
export const WORKERS_AI_MODELS = {
	// Meta Llama models
	'llama-3.3-70b': '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
	'llama-4-scout-17b': '@cf/meta/llama-4-scout-17b-16e-instruct',
	'llama-3.1-8b': '@cf/meta/llama-3.1-8b-instruct',
	'llama-3.2-3b': '@cf/meta/llama-3.2-3b-instruct',
	'llama-3.2-1b': '@cf/meta/llama-3.2-1b-instruct',

	// Mistral models
	'mistral-7b': '@cf/mistral/mistral-7b-instruct-v0.2',

	// Qwen models
	'qwen-2.5-coder-32b': '@cf/qwen/qwen2.5-coder-32b-instruct',
	'qwen-1.5-14b': '@cf/qwen/qwen1.5-14b-chat-awq',
	'qwen-1.5-7b': '@cf/qwen/qwen1.5-7b-chat-awq',

	// DeepSeek models
	'deepseek-r1-distill-qwen-32b': '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b',

	// GLM models
	'glm-4.7-flash': '@cf/zai-org/glm-4.7-flash',

	// Google Gemma models
	'gemma-7b': '@cf/google/gemma-7b-it-lora',
	'gemma-2b': '@cf/google/gemma-2b-it-lora',
} as const

export type WorkersAIModelId = keyof typeof WORKERS_AI_MODELS

/**
 * Embedding models available in Workers AI.
 */
export const EMBEDDING_MODELS = {
	'bge-base-en': '@cf/baai/bge-base-en-v1.5',
	'bge-small-en': '@cf/baai/bge-small-en-v1.5',
	'bge-large-en': '@cf/baai/bge-large-en-v1.5',
} as const

export type EmbeddingModelId = keyof typeof EMBEDDING_MODELS

/**
 * Get the Workers AI model ID from a user-friendly name.
 * Falls back to the input if it's already a full model ID.
 */
export function getWorkersAIModelId(modelName: string): string {
	if (modelName in WORKERS_AI_MODELS) {
		return WORKERS_AI_MODELS[modelName as WorkersAIModelId]
	}
	// If already a full model ID, return as-is
	if (modelName.startsWith('@cf/')) {
		return modelName
	}
	// Default to llama-3.3-70b
	return WORKERS_AI_MODELS['llama-3.3-70b']
}

/**
 * Input for creating a Workers AI model.
 */
export interface CreateWorkersAIModelInput {
	modelName: string
	ai: Ai
}

/**
 * Create a Workers AI model instance for use with the Vercel AI SDK.
 * Returns a LanguageModel compatible model (supports both v1 and v2).
 *
 * Note: workers-ai-provider v2 returns LanguageModelV2 internally but
 * it's fully compatible with the AI SDK's streamText/generateText functions.
 */
export function createWorkersAIModel(input: CreateWorkersAIModelInput): LanguageModel {
	const { modelName, ai } = input
	const workersai = createWorkersAI({ binding: ai })
	const modelId = getWorkersAIModelId(modelName)
	// Cast to LanguageModel - workers-ai-provider v2 is fully compatible with the AI SDK
	return workersai(modelId as Parameters<typeof workersai>[0]) as unknown as LanguageModel
}

/**
 * Input for generating embeddings.
 */
export interface GenerateEmbeddingsInput {
	ai: Ai
	texts: string[]
	model?: EmbeddingModelId
}

/**
 * Generate embeddings using Workers AI.
 */
export async function generateEmbeddings(input: GenerateEmbeddingsInput): Promise<number[][]> {
	const { ai, texts, model = 'bge-base-en' } = input
	const modelId = EMBEDDING_MODELS[model]

	const response = await ai.run(modelId as Parameters<typeof ai.run>[0], {
		text: texts,
	})

	// Workers AI returns { data: number[][] }
	return (response as { data: number[][] }).data
}

/**
 * Input for generating a single embedding.
 */
export interface GenerateEmbeddingInput {
	ai: Ai
	text: string
	model?: EmbeddingModelId
}

/**
 * Generate a single embedding using Workers AI.
 */
export async function generateEmbedding(input: GenerateEmbeddingInput): Promise<number[]> {
	const { ai, text, model = 'bge-base-en' } = input
	const embeddings = await generateEmbeddings({ ai, texts: [text], model })
	if (!embeddings[0]) {
		throw new Error('Failed to generate embedding')
	}
	return embeddings[0]
}

/**
 * Get all available model names for UI selection.
 */
export function getAvailableModels(): { id: string; name: string; description: string }[] {
	return [
		{
			id: 'llama-3.3-70b',
			name: 'Llama 3.3 70B',
			description: 'Most capable Llama model, great for complex tasks',
		},
		{
			id: 'llama-4-scout-17b',
			name: 'Llama 4 Scout 17B',
			description: 'Newest MoE model, fast inference',
		},
		{
			id: 'qwen-2.5-coder-32b',
			name: 'Qwen 2.5 Coder 32B',
			description: 'Best for code generation tasks',
		},
		{
			id: 'deepseek-r1-distill-qwen-32b',
			name: 'DeepSeek R1 32B',
			description: 'Strong reasoning capabilities',
		},
		{
			id: 'glm-4.7-flash',
			name: 'GLM 4.7 Flash',
			description: 'Fast inference model',
		},
		{
			id: 'llama-3.1-8b',
			name: 'Llama 3.1 8B',
			description: 'Fast and efficient for most use cases',
		},
		{ id: 'mistral-7b', name: 'Mistral 7B', description: 'Strong performance, good for chat' },
	]
}
