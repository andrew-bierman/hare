import { describe, expect, it } from 'vitest'
import { getWorkersAIModelId, getAvailableModels, WORKERS_AI_MODELS, EMBEDDING_MODELS } from '../workers-ai'

describe('getWorkersAIModelId', () => {
it('returns the correct model ID for known model names', () => {
expect(getWorkersAIModelId('llama-3.3-70b')).toBe('@cf/meta/llama-3.3-70b-instruct-fp8-fast')
expect(getWorkersAIModelId('llama-3.1-8b')).toBe('@cf/meta/llama-3.1-8b-instruct')
expect(getWorkersAIModelId('mistral-7b')).toBe('@cf/mistral/mistral-7b-instruct-v0.2')
})

it('returns the input if it is already a full model ID', () => {
const fullModelId = '@cf/custom/model-id'
expect(getWorkersAIModelId(fullModelId)).toBe(fullModelId)
})

it('defaults to llama-3.3-70b for unknown model names', () => {
expect(getWorkersAIModelId('unknown-model')).toBe('@cf/meta/llama-3.3-70b-instruct-fp8-fast')
})

it('defaults to llama-3.3-70b for empty string', () => {
expect(getWorkersAIModelId('')).toBe('@cf/meta/llama-3.3-70b-instruct-fp8-fast')
})
})

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
expect(WORKERS_AI_MODELS['deepseek-r1-distill-qwen-32b']).toBe('@cf/deepseek-ai/deepseek-r1-distill-qwen-32b')
})

it('contains expected Gemma models', () => {
expect(WORKERS_AI_MODELS['gemma-7b']).toBe('@cf/google/gemma-7b-it-lora')
expect(WORKERS_AI_MODELS['gemma-2b']).toBe('@cf/google/gemma-2b-it-lora')
})
})

describe('EMBEDDING_MODELS', () => {
it('contains BGE embedding models', () => {
expect(EMBEDDING_MODELS['bge-base-en']).toBe('@cf/baai/bge-base-en-v1.5')
expect(EMBEDDING_MODELS['bge-small-en']).toBe('@cf/baai/bge-small-en-v1.5')
expect(EMBEDDING_MODELS['bge-large-en']).toBe('@cf/baai/bge-large-en-v1.5')
})
})

describe('getAvailableModels', () => {
it('returns an array of model options', () => {
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

it('includes Llama 3.3 70B model', () => {
const models = getAvailableModels()
const llama = models.find((m) => m.id === 'llama-3.3-70b')
expect(llama).toBeDefined()
expect(llama?.name).toBe('Llama 3.3 70B')
})

it('includes Mistral 7B model', () => {
const models = getAvailableModels()
const mistral = models.find((m) => m.id === 'mistral-7b')
expect(mistral).toBeDefined()
expect(mistral?.name).toBe('Mistral 7B')
})

it('includes DeepSeek R1 model', () => {
const models = getAvailableModels()
const deepseek = models.find((m) => m.id === 'deepseek-r1-distill-qwen-32b')
expect(deepseek).toBeDefined()
expect(deepseek?.name).toBe('DeepSeek R1 32B')
})
})
