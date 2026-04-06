/**
 * oRPC Business Analytics Router
 *
 * Provides business-level metrics: resolution rates, satisfaction,
 * conversation quality, and agent performance comparisons.
 */

import {
	agents,
	conversationOutcomes,
	conversations,
	messageFeedback,
	messages,
} from '@hare/db/schema'
import { and, avg, count, desc, eq, gte, lte, sql } from 'drizzle-orm'
import { z } from 'zod'
import {
	AgentPerformanceSchema,
	BusinessMetricsSchema,
	ConversationOutcomeSchema,
	SetOutcomeSchema,
} from '../../schemas'
import { badRequest, notFound, requireWrite, serverError } from '../base'

// =============================================================================
// Helpers
// =============================================================================

function serializeOutcome(
	o: typeof conversationOutcomes.$inferSelect,
): z.infer<typeof ConversationOutcomeSchema> {
	return {
		id: o.id,
		conversationId: o.conversationId,
		agentId: o.agentId,
		outcome: o.outcome as z.infer<typeof ConversationOutcomeSchema>['outcome'],
		messageCount: o.messageCount,
		durationSeconds: o.durationSeconds,
		avgResponseTimeMs: o.avgResponseTimeMs,
		toolCallCount: o.toolCallCount,
		tags: o.tags,
		notes: o.notes,
		createdAt: o.createdAt.toISOString(),
	}
}

// =============================================================================
// Outcome Tracking
// =============================================================================

/**
 * Set/update a conversation outcome
 */
export const setOutcome = requireWrite
	.route({ method: 'POST', path: '/business-analytics/outcomes' })
	.input(SetOutcomeSchema)
	.output(ConversationOutcomeSchema)
	.handler(async ({ input, context }) => {
		const { db, workspaceId } = context

		// Verify conversation belongs to this workspace
		const [conv] = await db
			.select()
			.from(conversations)
			.where(
				and(eq(conversations.id, input.conversationId), eq(conversations.workspaceId, workspaceId)),
			)
		if (!conv) notFound('Conversation not found')

		// Verify agentId matches the conversation's agent
		if (conv.agentId !== input.agentId) badRequest('Agent ID does not match conversation agent')

		// Get conversation message stats
		const [msgStats] = await db
			.select({
				messageCount: count(),
			})
			.from(messages)
			.where(eq(messages.conversationId, input.conversationId))

		// Check for existing outcome
		const [existing] = await db
			.select()
			.from(conversationOutcomes)
			.where(
				and(
					eq(conversationOutcomes.conversationId, input.conversationId),
					eq(conversationOutcomes.workspaceId, workspaceId),
				),
			)

		if (existing) {
			const [updated] = await db
				.update(conversationOutcomes)
				.set({
					outcome: input.outcome,
					messageCount: msgStats?.messageCount ?? existing.messageCount,
					tags: input.tags ?? existing.tags,
					notes: input.notes ?? existing.notes,
					updatedAt: new Date(),
				})
				.where(eq(conversationOutcomes.id, existing.id))
				.returning()

			if (!updated) serverError('Failed to update outcome')
			return serializeOutcome(updated)
		}

		const [outcome] = await db
			.insert(conversationOutcomes)
			.values({
				conversationId: input.conversationId,
				agentId: input.agentId,
				workspaceId,
				outcome: input.outcome,
				messageCount: msgStats?.messageCount ?? 0,
				tags: input.tags,
				notes: input.notes,
			})
			.returning()

		if (!outcome) serverError('Failed to create outcome')
		return serializeOutcome(outcome)
	})

/**
 * List outcomes for an agent
 */
export const listOutcomes = requireWrite
	.route({ method: 'GET', path: '/business-analytics/outcomes' })
	.input(
		z.object({
			agentId: z.string(),
			limit: z.coerce.number().int().min(1).max(100).optional().default(50),
			offset: z.coerce.number().int().min(0).optional().default(0),
		}),
	)
	.output(
		z.object({
			outcomes: z.array(ConversationOutcomeSchema),
			total: z.number().int(),
		}),
	)
	.handler(async ({ input, context }) => {
		const { db, workspaceId } = context

		const [countResult] = await db
			.select({ total: count() })
			.from(conversationOutcomes)
			.where(
				and(
					eq(conversationOutcomes.agentId, input.agentId),
					eq(conversationOutcomes.workspaceId, workspaceId),
				),
			)

		const results = await db
			.select()
			.from(conversationOutcomes)
			.where(
				and(
					eq(conversationOutcomes.agentId, input.agentId),
					eq(conversationOutcomes.workspaceId, workspaceId),
				),
			)
			.orderBy(desc(conversationOutcomes.createdAt))
			.limit(input.limit)
			.offset(input.offset)

		return {
			outcomes: results.map(serializeOutcome),
			total: countResult?.total ?? 0,
		}
	})

// =============================================================================
// Business Metrics
// =============================================================================

/**
 * Get comprehensive business metrics for the workspace or a specific agent
 */
export const getMetrics = requireWrite
	.route({ method: 'GET', path: '/business-analytics/metrics' })
	.input(
		z.object({
			agentId: z.string().optional(),
			startDate: z.string().datetime().optional(),
			endDate: z.string().datetime().optional(),
		}),
	)
	.output(BusinessMetricsSchema)
	.handler(async ({ input, context }) => {
		const { db, workspaceId } = context

		const endDate = input.endDate ? new Date(input.endDate) : new Date()
		const startDate = input.startDate
			? new Date(input.startDate)
			: new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)

		// Base conditions
		const conditions = [
			eq(conversationOutcomes.workspaceId, workspaceId),
			gte(conversationOutcomes.createdAt, startDate),
			lte(conversationOutcomes.createdAt, endDate),
		]
		if (input.agentId) {
			conditions.push(eq(conversationOutcomes.agentId, input.agentId))
		}

		// Get total conversations (from conversations table)
		const convConditions = [
			eq(conversations.workspaceId, workspaceId),
			gte(conversations.createdAt, startDate),
			lte(conversations.createdAt, endDate),
		]
		if (input.agentId) {
			convConditions.push(eq(conversations.agentId, input.agentId))
		}

		const [convCount] = await db
			.select({ total: count() })
			.from(conversations)
			.where(and(...convConditions))

		// Outcome breakdown
		const outcomeStats = await db
			.select({
				outcome: conversationOutcomes.outcome,
				count: count(),
				avgMessages: avg(conversationOutcomes.messageCount),
				avgDuration: avg(conversationOutcomes.durationSeconds),
				avgResponseTime: avg(conversationOutcomes.avgResponseTimeMs),
			})
			.from(conversationOutcomes)
			.where(and(...conditions))
			.groupBy(conversationOutcomes.outcome)

		const taggedTotal = outcomeStats.reduce((sum, s) => sum + s.count, 0)
		const totalConversations = convCount?.total ?? 0

		const getOutcomeCount = (outcome: string) =>
			outcomeStats.find((s) => s.outcome === outcome)?.count ?? 0

		const resolvedCount = getOutcomeCount('resolved')
		const escalatedCount = getOutcomeCount('escalated')
		const abandonedCount = getOutcomeCount('abandoned')

		const resolutionRate =
			taggedTotal > 0 ? Math.round((resolvedCount / taggedTotal) * 10000) / 100 : 0
		const escalationRate =
			taggedTotal > 0 ? Math.round((escalatedCount / taggedTotal) * 10000) / 100 : 0
		const abandonmentRate =
			taggedTotal > 0 ? Math.round((abandonedCount / taggedTotal) * 10000) / 100 : 0

		// Average metrics
		const avgMessages = outcomeStats.reduce(
			(sum, s) => sum + (Number(s.avgMessages) || 0) * s.count,
			0,
		)
		const avgDuration = outcomeStats.reduce(
			(sum, s) => sum + (Number(s.avgDuration) || 0) * s.count,
			0,
		)
		const avgResponseTime = outcomeStats.reduce(
			(sum, s) => sum + (Number(s.avgResponseTime) || 0) * s.count,
			0,
		)

		// Satisfaction from feedback
		let satisfactionRate: number | null = null
		const feedbackConditions = [
			eq(messageFeedback.workspaceId, workspaceId),
			gte(messageFeedback.createdAt, startDate),
			lte(messageFeedback.createdAt, endDate),
		]
		if (input.agentId) {
			feedbackConditions.push(eq(messageFeedback.agentId, input.agentId))
		}

		const [feedbackStats] = await db
			.select({
				total: count(),
				positive: sql<number>`SUM(CASE WHEN ${messageFeedback.rating} = 'positive' THEN 1 ELSE 0 END)`,
			})
			.from(messageFeedback)
			.where(and(...feedbackConditions))

		if (feedbackStats && feedbackStats.total > 0) {
			satisfactionRate =
				Math.round(((feedbackStats.positive ?? 0) / feedbackStats.total) * 10000) / 100
		}

		// Daily trends
		const dailyResults = await db
			.select({
				date: sql<string>`date(${conversationOutcomes.createdAt}, 'unixepoch')`,
				total: count(),
				resolved: sql<number>`SUM(CASE WHEN ${conversationOutcomes.outcome} = 'resolved' THEN 1 ELSE 0 END)`,
				escalated: sql<number>`SUM(CASE WHEN ${conversationOutcomes.outcome} = 'escalated' THEN 1 ELSE 0 END)`,
				abandoned: sql<number>`SUM(CASE WHEN ${conversationOutcomes.outcome} = 'abandoned' THEN 1 ELSE 0 END)`,
				avgResponseTime: avg(conversationOutcomes.avgResponseTimeMs),
			})
			.from(conversationOutcomes)
			.where(and(...conditions))
			.groupBy(sql`date(${conversationOutcomes.createdAt}, 'unixepoch')`)
			.orderBy(sql`date(${conversationOutcomes.createdAt}, 'unixepoch')`)

		return {
			totalConversations,
			taggedConversations: taggedTotal,
			resolutionRate,
			escalationRate,
			abandonmentRate,
			avgMessagesPerConversation:
				taggedTotal > 0 ? Math.round((avgMessages / taggedTotal) * 10) / 10 : 0,
			avgConversationDurationSeconds:
				taggedTotal > 0 ? Math.round(avgDuration / taggedTotal) : null,
			avgResponseTimeMs: taggedTotal > 0 ? Math.round(avgResponseTime / taggedTotal) : null,
			satisfactionRate,
			outcomeBreakdown: outcomeStats.map((s) => ({
				outcome: s.outcome as z.infer<typeof ConversationOutcomeSchema>['outcome'],
				count: s.count,
				percentage: taggedTotal > 0 ? Math.round((s.count / taggedTotal) * 10000) / 100 : 0,
			})),
			dailyTrends: dailyResults.map((d) => ({
				date: d.date,
				conversations: d.total,
				resolved: d.resolved ?? 0,
				escalated: d.escalated ?? 0,
				abandoned: d.abandoned ?? 0,
				avgResponseTimeMs: d.avgResponseTime ? Math.round(Number(d.avgResponseTime)) : null,
			})),
			period: {
				startDate: startDate.toISOString(),
				endDate: endDate.toISOString(),
			},
		}
	})

/**
 * Get agent performance comparison across all agents
 */
export const getAgentPerformance = requireWrite
	.route({ method: 'GET', path: '/business-analytics/agent-performance' })
	.input(
		z.object({
			startDate: z.string().datetime().optional(),
			endDate: z.string().datetime().optional(),
		}),
	)
	.output(z.object({ agents: z.array(AgentPerformanceSchema) }))
	.handler(async ({ input, context }) => {
		const { db, workspaceId } = context

		const endDate = input.endDate ? new Date(input.endDate) : new Date()
		const startDate = input.startDate
			? new Date(input.startDate)
			: new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)

		// Get all agents in workspace
		const workspaceAgents = await db
			.select({ id: agents.id, name: agents.name })
			.from(agents)
			.where(eq(agents.workspaceId, workspaceId))

		// Batch query: outcome stats grouped by agent
		const statsByAgent = await db
			.select({
				agentId: conversationOutcomes.agentId,
				total: count(),
				resolved: sql<number>`SUM(CASE WHEN ${conversationOutcomes.outcome} = 'resolved' THEN 1 ELSE 0 END)`,
				escalated: sql<number>`SUM(CASE WHEN ${conversationOutcomes.outcome} = 'escalated' THEN 1 ELSE 0 END)`,
				avgMessages: avg(conversationOutcomes.messageCount),
				avgResponseTime: avg(conversationOutcomes.avgResponseTimeMs),
			})
			.from(conversationOutcomes)
			.where(
				and(
					eq(conversationOutcomes.workspaceId, workspaceId),
					gte(conversationOutcomes.createdAt, startDate),
					lte(conversationOutcomes.createdAt, endDate),
				),
			)
			.groupBy(conversationOutcomes.agentId)

		const statsMap = new Map(statsByAgent.map((s) => [s.agentId, s]))

		// Batch query: feedback stats grouped by agent
		const feedbackByAgent = await db
			.select({
				agentId: messageFeedback.agentId,
				total: count(),
				positive: sql<number>`SUM(CASE WHEN ${messageFeedback.rating} = 'positive' THEN 1 ELSE 0 END)`,
			})
			.from(messageFeedback)
			.where(
				and(
					eq(messageFeedback.workspaceId, workspaceId),
					gte(messageFeedback.createdAt, startDate),
					lte(messageFeedback.createdAt, endDate),
				),
			)
			.groupBy(messageFeedback.agentId)

		const feedbackMap = new Map(feedbackByAgent.map((f) => [f.agentId, f]))

		const results: z.infer<typeof AgentPerformanceSchema>[] = workspaceAgents.map((agent) => {
			const stats = statsMap.get(agent.id)
			const feedback = feedbackMap.get(agent.id)
			const total = stats?.total ?? 0

			return {
				agentId: agent.id,
				agentName: agent.name,
				totalConversations: total,
				resolutionRate: total > 0 ? Math.round(((stats?.resolved ?? 0) / total) * 10000) / 100 : 0,
				escalationRate: total > 0 ? Math.round(((stats?.escalated ?? 0) / total) * 10000) / 100 : 0,
				avgMessagesPerConversation: Number(stats?.avgMessages) || 0,
				avgResponseTimeMs: stats?.avgResponseTime
					? Math.round(Number(stats.avgResponseTime))
					: null,
				satisfactionRate:
					feedback && feedback.total > 0
						? Math.round(((feedback.positive ?? 0) / feedback.total) * 10000) / 100
						: null,
			}
		})

		return { agents: results }
	})

// =============================================================================
// Router Export
// =============================================================================

export const businessAnalyticsRouter = {
	setOutcome,
	listOutcomes,
	getMetrics,
	getAgentPerformance,
}
