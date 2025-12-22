import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { createTool, failure, success } from '../types'

describe('Tool Result Helpers', () => {
	describe('success', () => {
		it('creates a success result with data', () => {
			const result = success({ value: 'test' })
			expect(result.success).toBe(true)
			expect(result.data).toEqual({ value: 'test' })
		})

		it('creates a success result with null data', () => {
			const result = success(null)
			expect(result.success).toBe(true)
			expect(result.data).toBe(null)
		})

		it('creates a success result with undefined data', () => {
			const result = success(undefined)
			expect(result.success).toBe(true)
			expect(result.data).toBeUndefined()
		})

		it('creates a success result with complex nested data', () => {
			const complexData = {
				users: [
					{ id: 1, name: 'Alice' },
					{ id: 2, name: 'Bob' },
				],
				meta: { count: 2, page: 1 },
			}
			const result = success(complexData)
			expect(result.success).toBe(true)
			expect(result.data).toEqual(complexData)
		})
	})

	describe('failure', () => {
		it('creates a failure result with error message', () => {
			const result = failure('Something went wrong')
			expect(result.success).toBe(false)
			expect(result.error).toBe('Something went wrong')
		})

		it('creates a failure result with empty string', () => {
			const result = failure('')
			expect(result.success).toBe(false)
			expect(result.error).toBe('')
		})

		it('creates a failure result with detailed error message', () => {
			const errorMsg = 'Database connection failed: timeout after 5000ms'
			const result = failure(errorMsg)
			expect(result.success).toBe(false)
			expect(result.error).toBe(errorMsg)
		})
	})

	describe('createTool', () => {
		it('creates a tool with all required properties', () => {
			const mockExecute = async (_params: { input: string }, _context: unknown) =>
				success('executed')
			const tool = createTool({
				id: 'test_tool',
				description: 'A test tool',
				inputSchema: z.object({ input: z.string() }),
				execute: mockExecute,
			})

			expect(tool.id).toBe('test_tool')
			expect(tool.description).toBe('A test tool')
			expect(tool.inputSchema).toBeDefined()
			expect(tool.execute).toBe(mockExecute)
		})

		it('creates a tool with minimal configuration', () => {
			const tool = createTool({
				id: 'minimal_tool',
				description: '',
				inputSchema: z.object({}),
				execute: async (_params, _context) => success(null),
			})

			expect(tool.id).toBe('minimal_tool')
			expect(tool.description).toBe('')
		})

		it('creates a tool with complex input schema', () => {
			const schema = z.object({
				url: z.string().url(),
				method: z.enum(['GET', 'POST', 'PUT', 'DELETE']),
				headers: z.record(z.string(), z.string()),
				timeout: z.number().optional(),
			})

			const tool = createTool({
				id: 'http_tool',
				description: 'HTTP request tool',
				inputSchema: schema,
				execute: async (_params, _context) => success(null),
			})

			expect(tool.id).toBe('http_tool')
			expect(tool.inputSchema).toBe(schema)
		})
	})
})

describe('Tool Result Type Guards', () => {
	it('distinguishes success from failure results', () => {
		const successResult = success('data')
		const failureResult = failure('error')

		expect(successResult.success).toBe(true)
		expect(failureResult.success).toBe(false)

		if (successResult.success) {
			expect(successResult.data).toBe('data')
		}

		if (!failureResult.success) {
			expect(failureResult.error).toBe('error')
		}
	})

	it('success result has data property', () => {
		const result = success({ key: 'value' })
		expect(result).toHaveProperty('success')
		expect(result).toHaveProperty('data')
		expect(result).not.toHaveProperty('error')
	})

	it('failure result has error property', () => {
		const result = failure('error message')
		expect(result).toHaveProperty('success')
		expect(result).toHaveProperty('error')
		expect(result).not.toHaveProperty('data')
	})
})
