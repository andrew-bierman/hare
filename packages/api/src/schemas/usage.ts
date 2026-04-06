import { USAGE_GROUP_BY_OPTIONS } from '@hare/config'
import { z } from 'zod'

/**
 * Query parameters for usage endpoints.
 */
export const UsageQuerySchema = z.object({
	startDate: z.string().optional(),
	endDate: z.string().optional(),
	agentId: z.string().optional(),
	groupBy: z.enum(USAGE_GROUP_BY_OPTIONS).optional(),
})

/**
 * Usage breakdown by agent.
 */
export const UsageByAgentSchema = z
	.object({
		agentId: z.string(),
		agentName: z.string(),
		messages: z.number(),
		tokensIn: z.number(),
		tokensOut: z.number(),
		cost: z.number(),
	})
	

/**
 * Usage breakdown by day.
 */
export const UsageByDaySchema = z
	.object({
		date: z.string(),
		messages: z.number(),
		tokensIn: z.number(),
		tokensOut: z.number(),
		cost: z.number(),
	})
	

/**
 * Aggregated usage statistics.
 */
export const UsageStatsSchema = z
	.object({
		totalMessages: z.number(),
		totalTokensIn: z.number(),
		totalTokensOut: z.number(),
		totalCost: z.number(),
		averageLatencyMs: z.number().optional(),
		byAgent: z.array(UsageByAgentSchema).optional(),
		byDay: z.array(UsageByDaySchema).optional(),
		byModel: z
			.array(
				z.object({
					model: z.string(),
					messages: z.number(),
					tokensIn: z.number(),
					tokensOut: z.number(),
					cost: z.number(),
				}),
			)
			.optional(),
	})
	

/**
 * Full usage response with period.
 */
export const UsageResponseSchema = z
	.object({
		usage: UsageStatsSchema,
		period: z.object({
			startDate: z.string().datetime(),
			endDate: z.string().datetime(),
		}),
	})
	

/**
 * Agent-specific usage response.
 */
export const AgentUsageResponseSchema = z
	.object({
		agentId: z.string(),
		usage: UsageStatsSchema,
	})
	

/**
 * Health status derived from success rate thresholds.
 */
export const HEALTH_STATUS = ['healthy', 'degraded', 'unhealthy'] as const
export type HealthStatus = (typeof HEALTH_STATUS)[number]

export const HealthStatusSchema = z.enum(HEALTH_STATUS)

/**
 * Agent health metrics calculated from usage data (last 24 hours).
 */
export const AgentHealthMetricsSchema = z
	.object({
		agentId: z.string(),
		agentName: z.string(),
		status: HealthStatusSchema,
		metrics: z.object({
			successRate: z.number(),
			averageLatencyMs: z.number(),
			errorCount: z.number().int(),
			totalRequests: z.number().int(),
		}),
		period: z.object({
			startDate: z.string().datetime(),
			endDate: z.string().datetime(),
		}),
	})
	
