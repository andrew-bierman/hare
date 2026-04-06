import { getErrorMessage } from '@hare/checks'
import { z } from 'zod'
import { createTool, failure, success, type ToolResult } from '../types'
import { MathOutputSchema } from './schemas'

/**
 * Math Tool - Mathematical calculations.
 */
export const mathTool = createTool({
	id: 'math',
	description:
		'Perform mathematical operations: basic arithmetic, statistics, rounding, random numbers, and more.',
	outputSchema: MathOutputSchema,
	inputSchema: z.object({
		operation: z
			.enum([
				'add',
				'subtract',
				'multiply',
				'divide',
				'modulo',
				'power',
				'sqrt',
				'abs',
				'floor',
				'ceil',
				'round',
				'min',
				'max',
				'sum',
				'average',
				'median',
				'random',
				'randomInt',
				'percentage',
				'clamp',
				'evaluate',
			])
			.describe('Math operation to perform'),
		a: z.number().optional().describe('First number'),
		b: z.number().optional().describe('Second number'),
		numbers: z.array(z.number()).optional().describe('Array of numbers for aggregate operations'),
		min: z.number().optional().describe('Minimum value for random/clamp'),
		max: z.number().optional().describe('Maximum value for random/clamp'),
		decimals: z.number().optional().default(2).describe('Decimal places for rounding'),
		expression: z.string().optional().describe('Safe math expression to evaluate'),
	}),
	execute: async (params, _context): Promise<ToolResult<unknown>> => {
		try {
			const { operation, a, b, numbers, min, max, decimals, expression } = params

			switch (operation) {
				case 'add':
					if (a === undefined || b === undefined) return failure('Two numbers required')
					return success({ result: a + b })

				case 'subtract':
					if (a === undefined || b === undefined) return failure('Two numbers required')
					return success({ result: a - b })

				case 'multiply':
					if (a === undefined || b === undefined) return failure('Two numbers required')
					return success({ result: a * b })

				case 'divide':
					if (a === undefined || b === undefined) return failure('Two numbers required')
					if (b === 0) return failure('Division by zero')
					return success({ result: a / b })

				case 'modulo':
					if (a === undefined || b === undefined) return failure('Two numbers required')
					return success({ result: a % b })

				case 'power':
					if (a === undefined || b === undefined) return failure('Two numbers required')
					return success({ result: a ** b })

				case 'sqrt':
					if (a === undefined) return failure('Number required')
					if (a < 0) return failure('Cannot calculate square root of negative number')
					return success({ result: Math.sqrt(a) })

				case 'abs':
					if (a === undefined) return failure('Number required')
					return success({ result: Math.abs(a) })

				case 'floor':
					if (a === undefined) return failure('Number required')
					return success({ result: Math.floor(a) })

				case 'ceil':
					if (a === undefined) return failure('Number required')
					return success({ result: Math.ceil(a) })

				case 'round': {
					if (a === undefined) return failure('Number required')
					const factor = 10 ** decimals
					return success({ result: Math.round(a * factor) / factor })
				}

				case 'min':
					if (!numbers || numbers.length === 0) return failure('Array of numbers required')
					return success({ result: Math.min(...numbers) })

				case 'max':
					if (!numbers || numbers.length === 0) return failure('Array of numbers required')
					return success({ result: Math.max(...numbers) })

				case 'sum':
					if (!numbers || numbers.length === 0) return failure('Array of numbers required')
					return success({ result: numbers.reduce((acc, n) => acc + n, 0) })

				case 'average':
					if (!numbers || numbers.length === 0) return failure('Array of numbers required')
					return success({ result: numbers.reduce((acc, n) => acc + n, 0) / numbers.length })

				case 'median': {
					if (!numbers || numbers.length === 0) return failure('Array of numbers required')
					const sorted = [...numbers].sort((x, y) => x - y)
					const mid = Math.floor(sorted.length / 2)
					const midVal = sorted[mid] ?? 0
					const midPrevVal = sorted[mid - 1] ?? 0
					const median = sorted.length % 2 !== 0 ? midVal : (midPrevVal + midVal) / 2
					return success({ result: median })
				}

				case 'random': {
					const lo = min ?? 0
					const hi = max ?? 1
					return success({ result: Math.random() * (hi - lo) + lo })
				}

				case 'randomInt': {
					const minInt = min ?? 0
					const maxInt = max ?? 100
					return success({ result: Math.floor(Math.random() * (maxInt - minInt + 1)) + minInt })
				}

				case 'percentage':
					if (a === undefined || b === undefined)
						return failure('Two numbers required (part, whole)')
					if (b === 0) return failure('Whole cannot be zero')
					return success({
						result: (a / b) * 100,
						formatted: `${((a / b) * 100).toFixed(decimals)}%`,
					})

				case 'clamp':
					if (a === undefined || min === undefined || max === undefined) {
						return failure('Value, min, and max required')
					}
					return success({ result: Math.min(Math.max(a, min), max) })

				case 'evaluate': {
					if (!expression) return failure('Expression required')
					// Safe evaluation - only allow numbers and basic operators
					const safeExpression = expression.replace(/[^0-9+\-*/%().^ ]/g, '')
					if (safeExpression !== expression) {
						return failure('Expression contains invalid characters')
					}
					// Replace ^ with ** for power
					const jsExpression = safeExpression.replace(/\^/g, '**')
					const result = Function(`"use strict"; return (${jsExpression})`)()
					return success({ result, expression })
				}

				default:
					return failure(`Unknown operation: ${operation}`)
			}
		} catch (error) {
			return failure(`Math error: ${getErrorMessage(error)}`)
		}
	},
})
