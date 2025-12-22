import { createWorkersAI } from 'workers-ai-provider'

/**
 * Workers AI model IDs mapped to user-friendly names.
 */
export const WORKERS_AI_MODELS = {
	// Meta Llama models
	'llama-3.3-70b': '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
	'llama-3.1-8b': '@cf/meta/llama-3.1-8b-instruct',
	'llama-3.2-3b': '@cf/meta/llama-3.2-3b-instruct',
	'llama-3.2-1b': '@cf/meta/llama-3.2-1b-instruct',

	// Mistral models
	'mistral-7b': '@cf/mistral/mistral-7b-instruct-v0.2',

	// Qwen models
	'qwen-1.5-14b': '@cf/qwen/qwen1.5-14b-chat-awq',
	'qwen-1.5-7b': '@cf/qwen/qwen1.5-7b-chat-awq',

	// DeepSeek models
	'deepseek-r1-distill-qwen-32b': '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b',

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
 * Create a Workers AI model instance for use with the Vercel AI SDK.
 * Returns a LanguageModelV1 compatible model.
 */
export function createWorkersAIModel(modelName: string, ai: Ai): ReturnType<ReturnType<typeof createWorkersAI>> {
	const workersai = createWorkersAI({ binding: ai })
	const modelId = getWorkersAIModelId(modelName)
	// Cast to the expected type - the model ID is validated by getWorkersAIModelId
	return workersai(modelId as Parameters<typeof workersai>[0])
}

/**
 * Generate embeddings using Workers AI.
 */
export async function generateEmbeddings(ai: Ai, texts: string[], model: EmbeddingModelId = 'bge-base-en'): Promise<number[][]> {
	const modelId = EMBEDDING_MODELS[model]

	const response = await ai.run(modelId as Parameters<typeof ai.run>[0], {
		text: texts,
	})

	// Workers AI returns { data: number[][] }
	return (response as { data: number[][] }).data
}

/**
 * Generate a single embedding using Workers AI.
 */
export async function generateEmbedding(ai: Ai, text: string, model: EmbeddingModelId = 'bge-base-en'): Promise<number[]> {
	const embeddings = await generateEmbeddings(ai, [text], model)
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
		{ id: 'llama-3.3-70b', name: 'Llama 3.3 70B', description: 'Most capable Llama model, great for complex tasks' },
		{ id: 'llama-3.1-8b', name: 'Llama 3.1 8B', description: 'Fast and efficient for most use cases' },
		{ id: 'llama-3.2-3b', name: 'Llama 3.2 3B', description: 'Compact model for simple tasks' },
		{ id: 'mistral-7b', name: 'Mistral 7B', description: 'Strong performance, good for chat' },
		{ id: 'qwen-1.5-14b', name: 'Qwen 1.5 14B', description: 'Excellent multilingual support' },
		{ id: 'deepseek-r1-distill-qwen-32b', name: 'DeepSeek R1 32B', description: 'Strong reasoning capabilities' },
	]
}
