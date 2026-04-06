import { z } from 'zod'
import { createTool, success, type ToolResult } from '../types'
import { DelayOutputSchema } from './schemas'

/**
 * Delay Tool - Wait for a specified time.
 */
export const delayTool = createTool({
	id: 'delay',
	description:
		'Wait for a specified amount of time before continuing. Useful for rate limiting or timing.',
	outputSchema: DelayOutputSchema,
	inputSchema: z.object({
		duration: z
			.number()
			.min(0)
			.max(30000)
			.describe('Duration to wait in milliseconds (max 30 seconds)'),
		reason: z.string().optional().describe('Reason for the delay (for logging)'),
	}),
	execute: async (params, _context): Promise<ToolResult<unknown>> => {
		const { duration, reason } = params
		const start = Date.now()
		await new Promise((resolve) => setTimeout(resolve, duration))
		const actual = Date.now() - start

		return success({
			requested: duration,
			actual,
			reason,
		})
	},
})
