/**
 * AI Models Configuration
 */

// =============================================================================
// AI Models
// =============================================================================

export type ModelProvider = 'anthropic' | 'openai' | 'workers-ai'

export interface AIModel {
	id: string
	name: string
	description: string
	provider: ModelProvider
	contextWindow: number
	maxOutputTokens: number
	supportsStreaming: boolean
	supportsTools: boolean
	/** Cost per 1M input tokens in USD */
	inputCostPer1M: number
	/** Cost per 1M output tokens in USD */
	outputCostPer1M: number
}

export const AI_MODELS: AIModel[] = [
	{
		id: 'claude-3-5-sonnet-20241022',
		name: 'Claude 3.5 Sonnet',
		description: 'Best balance of speed and capability',
		provider: 'anthropic',
		contextWindow: 200000,
		maxOutputTokens: 8192,
		supportsStreaming: true,
		supportsTools: true,
		inputCostPer1M: 3.0,
		outputCostPer1M: 15.0,
	},
	{
		id: 'claude-3-5-haiku-20241022',
		name: 'Claude 3.5 Haiku',
		description: 'Fast and efficient',
		provider: 'anthropic',
		contextWindow: 200000,
		maxOutputTokens: 8192,
		supportsStreaming: true,
		supportsTools: true,
		inputCostPer1M: 0.8,
		outputCostPer1M: 4.0,
	},
	{
		id: 'claude-3-opus-20240229',
		name: 'Claude 3 Opus',
		description: 'Most capable reasoning',
		provider: 'anthropic',
		contextWindow: 200000,
		maxOutputTokens: 4096,
		supportsStreaming: true,
		supportsTools: true,
		inputCostPer1M: 15.0,
		outputCostPer1M: 75.0,
	},
	{
		id: 'gpt-4o',
		name: 'GPT-4o',
		description: 'Multimodal flagship model',
		provider: 'openai',
		contextWindow: 128000,
		maxOutputTokens: 16384,
		supportsStreaming: true,
		supportsTools: true,
		inputCostPer1M: 2.5,
		outputCostPer1M: 10.0,
	},
	{
		id: 'gpt-4o-mini',
		name: 'GPT-4o Mini',
		description: 'Fast and cost-effective',
		provider: 'openai',
		contextWindow: 128000,
		maxOutputTokens: 16384,
		supportsStreaming: true,
		supportsTools: true,
		inputCostPer1M: 0.15,
		outputCostPer1M: 0.6,
	},
	{
		id: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
		name: 'Llama 3.3 70B',
		description: 'Most capable open model',
		provider: 'workers-ai',
		contextWindow: 8192,
		maxOutputTokens: 2048,
		supportsStreaming: true,
		supportsTools: false,
		inputCostPer1M: 0,
		outputCostPer1M: 0,
	},
] as const

export const DEFAULT_MODEL_ID = 'claude-3-5-sonnet-20241022'

export function getModelById(id: string): AIModel | undefined {
	return AI_MODELS.find((m) => m.id === id)
}

export function getModelName(id: string): string {
	return getModelById(id)?.name ?? id
}

// Alias for backwards compatibility
export const AVAILABLE_MODELS = AI_MODELS

