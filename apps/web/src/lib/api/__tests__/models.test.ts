import { describe, expect, it } from 'vitest'
import { getWorkersAIModel } from '../models'

describe('getWorkersAIModel', () => {
	describe('Claude models', () => {
		it('maps claude-3-5-sonnet-20241022 to Workers AI model', () => {
			expect(getWorkersAIModel('claude-3-5-sonnet-20241022')).toBe('@cf/anthropic/claude-3-5-sonnet')
		})

		it('maps claude-3-haiku to Workers AI model', () => {
			expect(getWorkersAIModel('claude-3-haiku')).toBe('@cf/anthropic/claude-3-haiku')
		})

		it('maps claude-3-opus to Workers AI model', () => {
			expect(getWorkersAIModel('claude-3-opus')).toBe('@cf/anthropic/claude-3-opus')
		})
	})

	describe('Llama models', () => {
		it('maps llama-3.3-70b-instruct to Workers AI model', () => {
			expect(getWorkersAIModel('llama-3.3-70b-instruct')).toBe('@cf/meta/llama-3.3-70b-instruct-fp8-fast')
		})

		it('maps llama-3.2-11b-vision to Workers AI model', () => {
			expect(getWorkersAIModel('llama-3.2-11b-vision')).toBe('@cf/meta/llama-3.2-11b-vision-instruct')
		})

		it('maps llama-3.1-8b to Workers AI model', () => {
			expect(getWorkersAIModel('llama-3.1-8b')).toBe('@cf/meta/llama-3.1-8b-instruct')
		})
	})

	describe('Mistral models', () => {
		it('maps mistral-7b to Workers AI model', () => {
			expect(getWorkersAIModel('mistral-7b')).toBe('@cf/mistral/mistral-7b-instruct-v0.1')
		})
	})

	describe('Qwen models', () => {
		it('maps qwen-2.5-7b to Workers AI model', () => {
			expect(getWorkersAIModel('qwen-2.5-7b')).toBe('@cf/qwen/qwen2.5-7b-instruct-awq')
		})
	})

	describe('Unmapped models', () => {
		it('returns the model name as-is when not in mapping', () => {
			const customModel = '@cf/custom/model-id'
			expect(getWorkersAIModel(customModel)).toBe(customModel)
		})

		it('returns unknown model names as-is', () => {
			expect(getWorkersAIModel('unknown-model')).toBe('unknown-model')
		})

		it('handles empty string', () => {
			expect(getWorkersAIModel('')).toBe('')
		})
	})
})
