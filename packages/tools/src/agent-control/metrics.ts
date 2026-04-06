/**
 * Agent Control Metrics Tools
 *
 * Tools for getting agent metrics and analytics.
 */

import { z } from 'zod'
import { Duration } from '../constants'
import { createTool, failure, success, type ToolContext } from '../types'
import { GetAgentMetricsOutputSchema } from './schemas'
import { hasAgentControlCapabilities } from './types'

/**
 * Get agent metrics and analytics
 */
export const getAgentMetricsTool = createTool({
	id: 'agent_metrics',
	description: 'Get usage metrics and analytics for an agent',
	inputSchema: z.object({
		agentId: z.string().describe('The agent to get metrics for'),
		period: z
			.enum(['hour', 'day', 'week', 'month'])
			.optional()
			.default('day')
			.describe('Time period for metrics'),
	}),
	outputSchema: GetAgentMetricsOutputSchema,
	execute: async (params, context: ToolContext) => {
		try {
			if (!hasAgentControlCapabilities(context)) {
				return failure('Database not available. Agent control tools require DB binding.')
			}

			const db = context.env.DB
			const workspaceId = context.workspaceId

			// Verify agent exists
			const agentResult = await db
				.prepare(
					`
					SELECT id, name FROM agents WHERE id = ? AND workspaceId = ?
				`,
				)
				.bind(params.agentId, workspaceId)
				.first()

			if (!agentResult) {
				return failure(`Agent not found: ${params.agentId}`)
			}

			// Calculate time range
			const now = Date.now()
			let startTime: number
			switch (params.period) {
				case 'hour':
					startTime = now - Duration.HOUR
					break
				case 'day':
					startTime = now - Duration.DAY
					break
				case 'week':
					startTime = now - Duration.WEEK
					break
				case 'month':
					startTime = now - Duration.MONTH
					break
			}

			// Get usage metrics from usage table
			const usageResult = await db
				.prepare(
					`
					SELECT
						COUNT(*) as totalCalls,
						SUM(inputTokens) as inputTokens,
						SUM(outputTokens) as outputTokens,
						SUM(totalTokens) as totalTokens,
						SUM(cost) as totalCost,
						AVG(CASE WHEN metadata IS NOT NULL THEN json_extract(metadata, '$.duration') ELSE NULL END) as avgDuration
					FROM usage
					WHERE agentId = ? AND createdAt >= ?
				`,
				)
				.bind(params.agentId, startTime)
				.first()

			// Get message count
			const messageResult = await db
				.prepare(
					`
					SELECT COUNT(*) as count
					FROM messages m
					INNER JOIN conversations c ON m.conversationId = c.id
					WHERE c.agentId = ? AND m.createdAt >= ?
				`,
				)
				.bind(params.agentId, startTime)
				.first()

			// Get conversation count
			const conversationResult = await db
				.prepare(
					`
					SELECT COUNT(DISTINCT id) as count
					FROM conversations
					WHERE agentId = ? AND createdAt >= ?
				`,
				)
				.bind(params.agentId, startTime)
				.first()

			// Get schedule execution metrics
			const scheduleResult = await db
				.prepare(
					`
					SELECT
						COUNT(*) as total,
						SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
						SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
					FROM schedule_executions
					WHERE agentId = ? AND startedAt >= ?
				`,
				)
				.bind(params.agentId, startTime)
				.first()

			return success({
				agentId: params.agentId,
				agentName: agentResult.name,
				period: params.period,
				timeRange: {
					start: startTime,
					end: now,
				},
				metrics: {
					totalApiCalls: (usageResult?.totalCalls as number) || 0,
					totalMessages: (messageResult?.count as number) || 0,
					totalConversations: (conversationResult?.count as number) || 0,
					averageResponseTime: (usageResult?.avgDuration as number) || 0,
					tokensUsed: {
						input: (usageResult?.inputTokens as number) || 0,
						output: (usageResult?.outputTokens as number) || 0,
						total: (usageResult?.totalTokens as number) || 0,
					},
					estimatedCost: (usageResult?.totalCost as number) || 0,
					scheduleExecutions: {
						total: (scheduleResult?.total as number) || 0,
						completed: (scheduleResult?.completed as number) || 0,
						failed: (scheduleResult?.failed as number) || 0,
					},
				},
				generatedAt: now,
			})
		} catch (error) {
			return failure(error instanceof Error ? error.message : 'Failed to get metrics')
		}
	},
})
