/**
 * Maps user-friendly model names to Workers AI model IDs
 */
export function getWorkersAIModel(modelName: string): string {
	const modelMap: Record<string, string> = {
		// Claude models
		'claude-3-5-sonnet-20241022': '@cf/anthropic/claude-3-5-sonnet',
		'claude-3-haiku': '@cf/anthropic/claude-3-haiku',
		'claude-3-opus': '@cf/anthropic/claude-3-opus',

		// Llama models
		'llama-3.3-70b-instruct': '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
		'llama-3.2-11b-vision': '@cf/meta/llama-3.2-11b-vision-instruct',
		'llama-3.1-8b': '@cf/meta/llama-3.1-8b-instruct',

		// Mistral models
		'mistral-7b': '@cf/mistral/mistral-7b-instruct-v0.1',

		// Qwen models
		'qwen-2.5-7b': '@cf/qwen/qwen2.5-7b-instruct-awq',
	}

	// Return mapped model or use the provided name as-is (in case it's already a Workers AI model ID)
	return modelMap[modelName] || modelName
}
