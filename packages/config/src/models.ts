/**
 * AI Models Configuration
 */

// =============================================================================
// AI Models
// =============================================================================

export type ModelProvider = 'anthropic' | 'openai' | 'workers-ai'
export type SpeedTier = 'fast' | 'medium' | 'slow'
export type CostTier = 'free' | 'low' | 'medium' | 'high'

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
	/** Speed tier for UI display */
	speedTier: SpeedTier
	/** Cost tier for UI display */
	costTier: CostTier
}

export const PROVIDER_LABELS: Record<ModelProvider, string> = {
	'anthropic': 'Anthropic',
	'openai': 'OpenAI',
	'workers-ai': 'Cloudflare Workers AI',
}

export const SPEED_TIER_LABELS: Record<SpeedTier, { label: string; color: string }> = {
	fast: { label: 'Fast', color: 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30' },
	medium: { label: 'Medium', color: 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30' },
	slow: { label: 'Slow', color: 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30' },
}

export const COST_TIER_LABELS: Record<CostTier, { label: string; color: string }> = {
	free: { label: 'Free', color: 'text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30' },
	low: { label: 'Low Cost', color: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30' },
	medium: { label: 'Medium Cost', color: 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30' },
	high: { label: 'Premium', color: 'text-violet-600 bg-violet-100 dark:text-violet-400 dark:bg-violet-900/30' },
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
		speedTier: 'medium',
		costTier: 'medium',
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
		speedTier: 'fast',
		costTier: 'low',
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
		speedTier: 'slow',
		costTier: 'high',
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
		speedTier: 'medium',
		costTier: 'medium',
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
		speedTier: 'fast',
		costTier: 'low',
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
		speedTier: 'fast',
		costTier: 'free',
	},
]

export const DEFAULT_MODEL_ID = 'claude-3-5-sonnet-20241022'

export function getModelById(id: string): AIModel | undefined {
	return AI_MODELS.find((m) => m.id === id)
}

export function getModelName(id: string): string {
	return getModelById(id)?.name ?? id
}

/**
 * Get models grouped by provider
 */
export function getModelsByProvider(): Map<ModelProvider, AIModel[]> {
	const grouped = new Map<ModelProvider, AIModel[]>()
	for (const model of AI_MODELS) {
		const existing = grouped.get(model.provider) ?? []
		grouped.set(model.provider, [...existing, model])
	}
	return grouped
}

/**
 * Get provider display label
 */
export function getProviderLabel(provider: ModelProvider): string {
	return PROVIDER_LABELS[provider]
}

