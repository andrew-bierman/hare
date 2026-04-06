import { beforeEach, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { delegateTo, delegateToWithValidation } from '../delegate'
import { createTool, failure, success, type ToolContext } from '../types'

const createMockContext = (): ToolContext => ({
	env: {} as ToolContext['env'],
	workspaceId: 'test-workspace',
	userId: 'test-user',
})

describe('Tool Delegation', () => {
	let context: ToolContext

	// Create test tools for delegation
	const echoTool = createTool({
		id: 'echo',
		description: 'Echoes the input',
		inputSchema: z.object({
			message: z.string(),
			uppercase: z.boolean().optional().default(false),
		}),
		outputSchema: z.object({
			result: z.string(),
		}),
		execute: async (params) => {
			const result = params.uppercase ? params.message.toUpperCase() : params.message
			return success({ result })
		},
	})

	const mathTool = createTool({
		id: 'math',
		description: 'Performs math operations',
		inputSchema: z.object({
			operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
			a: z.number(),
			b: z.number(),
		}),
		outputSchema: z.object({
			result: z.number(),
		}),
		execute: async (params) => {
			switch (params.operation) {
				case 'add':
					return success({ result: params.a + params.b })
				case 'subtract':
					return success({ result: params.a - params.b })
				case 'multiply':
					return success({ result: params.a * params.b })
				case 'divide':
					if (params.b === 0) {
						return failure('Division by zero')
					}
					return success({ result: params.a / params.b })
			}
		},
	})

	const failingTool = createTool({
		id: 'failing',
		description: 'Always fails',
		inputSchema: z.object({
			reason: z.string().optional(),
		}),
		outputSchema: z.object({
			result: z.string(),
		}),
		execute: async (params) => {
			return failure(params.reason || 'Tool execution failed')
		},
	})

	beforeEach(() => {
		context = createMockContext()
	})

	describe('delegateTo', () => {
		it('delegates to another tool with typed parameters', async () => {
			const result = await delegateTo({
				tool: echoTool,
				params: { message: 'Hello, World!', uppercase: false },
				context,
			})

			expect(result.success).toBe(true)
			expect(result.data?.result).toBe('Hello, World!')
		})

		it('respects parameter defaults', async () => {
			const result = await delegateTo({
				tool: echoTool,
				params: { message: 'test', uppercase: true },
				context,
			})

			expect(result.success).toBe(true)
			expect(result.data?.result).toBe('TEST')
		})

		it('delegates math operations correctly', async () => {
			const addResult = await delegateTo({
				tool: mathTool,
				params: { operation: 'add' as const, a: 5, b: 3 },
				context,
			})

			expect(addResult.success).toBe(true)
			expect(addResult.data?.result).toBe(8)

			const multiplyResult = await delegateTo({
				tool: mathTool,
				params: { operation: 'multiply' as const, a: 4, b: 7 },
				context,
			})

			expect(multiplyResult.success).toBe(true)
			expect(multiplyResult.data?.result).toBe(28)
		})

		it('propagates tool failures', async () => {
			const result = await delegateTo({
				tool: failingTool,
				params: { reason: 'Custom error message' },
				context,
			})

			expect(result.success).toBe(false)
			expect(result.error).toBe('Custom error message')
		})

		it('propagates division by zero error', async () => {
			const result = await delegateTo({
				tool: mathTool,
				params: { operation: 'divide' as const, a: 10, b: 0 },
				context,
			})

			expect(result.success).toBe(false)
			expect(result.error).toBe('Division by zero')
		})

		it('passes context to delegated tool', async () => {
			const contextAwareTool = createTool({
				id: 'context_aware',
				description: 'Returns context info',
				inputSchema: z.object({}),
				outputSchema: z.object({
					workspaceId: z.string(),
					userId: z.string().nullable().optional(),
				}),
				execute: async (_params, ctx) => {
					return success({
						workspaceId: ctx.workspaceId,
						userId: ctx.userId,
					})
				},
			})

			const result = await delegateTo({
				tool: contextAwareTool,
				params: {},
				context,
			})

			expect(result.success).toBe(true)
			expect(result.data?.workspaceId).toBe('test-workspace')
			expect(result.data?.userId).toBe('test-user')
		})
	})

	describe('delegateToWithValidation', () => {
		it('validates input and delegates to tool', async () => {
			const result = await delegateToWithValidation({
				tool: echoTool,
				params: { message: 'Hello!' },
				context,
			})

			expect(result.success).toBe(true)
			expect(result.data?.result).toBe('Hello!')
		})

		it('returns failure for invalid input', async () => {
			const result = await delegateToWithValidation({
				tool: echoTool,
				params: { message: 123 }, // Should be string
				context,
			})

			expect(result.success).toBe(false)
			expect(result.error).toContain('Input validation failed')
		})

		it('returns failure for missing required fields', async () => {
			const result = await delegateToWithValidation({
				tool: echoTool,
				params: {}, // Missing required 'message' field
				context,
			})

			expect(result.success).toBe(false)
			expect(result.error).toContain('Input validation failed')
		})

		it('validates math tool input', async () => {
			const validResult = await delegateToWithValidation({
				tool: mathTool,
				params: { operation: 'add', a: 5, b: 3 },
				context,
			})

			expect(validResult.success).toBe(true)
			expect(validResult.data?.result).toBe(8)

			const invalidResult = await delegateToWithValidation({
				tool: mathTool,
				params: { operation: 'invalid', a: 5, b: 3 },
				context,
			})

			expect(invalidResult.success).toBe(false)
			expect(invalidResult.error).toContain('Input validation failed')
		})

		it('handles unknown params type', async () => {
			const result = await delegateToWithValidation({
				tool: echoTool,
				params: 'not an object',
				context,
			})

			expect(result.success).toBe(false)
			expect(result.error).toContain('Input validation failed')
		})

		it('applies default values during validation', async () => {
			const result = await delegateToWithValidation({
				tool: echoTool,
				params: { message: 'test' }, // uppercase has default value
				context,
			})

			expect(result.success).toBe(true)
			expect(result.data?.result).toBe('test') // Should be lowercase (default)
		})

		it('handles tool failures after validation', async () => {
			const result = await delegateToWithValidation({
				tool: failingTool,
				params: { reason: 'Validation passed but tool failed' },
				context,
			})

			expect(result.success).toBe(false)
			expect(result.error).toBe('Validation passed but tool failed')
		})
	})

	describe('use case: tool composition', () => {
		// Example of a higher-order tool that delegates to other tools
		const composedTool = createTool({
			id: 'composed',
			description: 'Computes and formats result',
			inputSchema: z.object({
				expression: z.object({
					operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
					a: z.number(),
					b: z.number(),
				}),
				uppercase: z.boolean().optional().default(false),
			}),
			outputSchema: z.object({
				formatted: z.string(),
			}),
			execute: async (params, ctx) => {
				// Delegate to math tool
				const mathResult = await delegateTo({
					tool: mathTool,
					params: params.expression,
					context: ctx,
				})

				if (!mathResult.success) {
					return failure(`Math error: ${mathResult.error}`)
				}

				// Delegate to echo tool for formatting
				const message = `Result: ${mathResult.data?.result}`
				const echoResult = await delegateTo({
					tool: echoTool,
					params: { message, uppercase: params.uppercase },
					context: ctx,
				})

				if (!echoResult.success) {
					return failure(`Format error: ${echoResult.error}`)
				}

				return success({ formatted: echoResult.data?.result || '' })
			},
		})

		it('composes multiple tool calls', async () => {
			const result = await composedTool.execute(
				{
					expression: { operation: 'multiply', a: 6, b: 7 },
					uppercase: false,
				},
				context,
			)

			expect(result.success).toBe(true)
			expect(result.data?.formatted).toBe('Result: 42')
		})

		it('composes with uppercase formatting', async () => {
			const result = await composedTool.execute(
				{
					expression: { operation: 'add', a: 10, b: 5 },
					uppercase: true,
				},
				context,
			)

			expect(result.success).toBe(true)
			expect(result.data?.formatted).toBe('RESULT: 15')
		})

		it('propagates errors from delegated tools', async () => {
			const result = await composedTool.execute(
				{
					expression: { operation: 'divide', a: 10, b: 0 },
					uppercase: false,
				},
				context,
			)

			expect(result.success).toBe(false)
			expect(result.error).toContain('Math error')
			expect(result.error).toContain('Division by zero')
		})
	})

	describe('type safety', () => {
		it('maintains type safety for input parameters', async () => {
			// This test verifies that TypeScript type inference works correctly
			// The test itself is simple, but it demonstrates the type-safe nature of delegateTo
			type EchoInput = z.infer<typeof echoTool.inputSchema>
			const params: EchoInput = { message: 'typed', uppercase: true }

			const result = await delegateTo({
				tool: echoTool,
				params,
				context,
			})

			expect(result.success).toBe(true)
			expect(result.data?.result).toBe('TYPED')
		})

		it('maintains type safety for output', async () => {
			const result = await delegateTo({
				tool: mathTool,
				params: { operation: 'add' as const, a: 1, b: 2 },
				context,
			})

			if (result.success && result.data) {
				// TypeScript should know that result.data.result is a number
				const numericResult: number = result.data.result
				expect(numericResult).toBe(3)
			}
		})
	})
})
