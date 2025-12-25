import { z } from '@hono/zod-openapi'

/**
 * Query parameters for usage endpoints.
 */
export const UsageQuerySchema = z.object({
	startDate: z.string().optional().openapi({ example: '2024-11-01T00:00:00Z' }),
	endDate: z.string().optional().openapi({ example: '2024-12-01T00:00:00Z' }),
	agentId: z.string().optional().openapi({ example: 'agent_abc123' }),
	groupBy: z.enum(['day', 'week', 'month']).optional().openapi({ example: 'day' }),
})

/**
 * Usage breakdown by agent.
 */
export const UsageByAgentSchema = z
	.object({
		agentId: z.string().openapi({ example: 'agent_abc123' }),
		agentName: z.string().openapi({ example: 'Customer Support Agent' }),
		messages: z.number().openapi({ example: 800 }),
		tokensIn: z.number().openapi({ example: 30000 }),
		tokensOut: z.number().openapi({ example: 45000 }),
		cost: z.number().openapi({ example: 0.75 }),
	})
	.openapi('UsageByAgent')

/**
 * Usage breakdown by day.
 */
export const UsageByDaySchema = z
	.object({
		date: z.string().openapi({ example: '2024-12-01' }),
		messages: z.number().openapi({ example: 100 }),
		tokensIn: z.number().openapi({ example: 4000 }),
		tokensOut: z.number().openapi({ example: 6000 }),
		cost: z.number().openapi({ example: 0.1 }),
	})
	.openapi('UsageByDay')

/**
 * Aggregated usage statistics.
 */
export const UsageStatsSchema = z
	.object({
		totalMessages: z.number().openapi({ example: 1234 }),
		totalTokensIn: z.number().openapi({ example: 50000 }),
		totalTokensOut: z.number().openapi({ example: 75000 }),
		totalCost: z.number().openapi({ example: 1.25 }),
		averageLatencyMs: z.number().optional().openapi({ example: 250 }),
		byAgent: z.array(UsageByAgentSchema).optional(),
		byDay: z.array(UsageByDaySchema).optional(),
		byModel: z
			.array(
				z.object({
					model: z.string().openapi({ example: 'llama-3.3-70b-instruct' }),
					messages: z.number().openapi({ example: 800 }),
					tokensIn: z.number().openapi({ example: 30000 }),
					tokensOut: z.number().openapi({ example: 45000 }),
					cost: z.number().openapi({ example: 0.75 }),
				}),
			)
			.optional(),
	})
	.openapi('UsageStats')

/**
 * Full usage response with period.
 */
export const UsageResponseSchema = z
	.object({
		usage: UsageStatsSchema,
		period: z.object({
			startDate: z.string().datetime().openapi({ example: '2024-11-01T00:00:00Z' }),
			endDate: z.string().datetime().openapi({ example: '2024-12-01T00:00:00Z' }),
		}),
	})
	.openapi('UsageResponse')

/**
 * Agent-specific usage response.
 */
export const AgentUsageResponseSchema = z
	.object({
		agentId: z.string().openapi({ example: 'agent_abc123' }),
		usage: UsageStatsSchema,
	})
	.openapi('AgentUsageResponse')
