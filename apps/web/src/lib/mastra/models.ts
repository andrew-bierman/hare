// Map our model IDs to Cloudflare Workers AI model names
export const WORKERS_AI_MODELS: Record<string, string> = {
  'llama-3.3-70b-instruct': '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  'llama-3.1-8b-instruct': '@cf/meta/llama-3.1-8b-instruct',
  'mistral-7b-instruct': '@cf/mistral/mistral-7b-instruct-v0.2',
  'qwen-1.5-14b': '@cf/qwen/qwen1.5-14b-chat-awq',
}

export function getWorkersAIModel(modelId: string): string {
  return WORKERS_AI_MODELS[modelId] || WORKERS_AI_MODELS['llama-3.3-70b-instruct']
}
