/**
 * Elysia Business Analytics Routes
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
import Elysia, { t } from 'elysia'
import { writePlugin } from '../context'

// =============================================================================
// Helpers
// =============================================================================

function serializeOutcome(o: typeof conversationOutcomes.$inferSelect) {
	return {
		id: o.id,
		conversationId: o.conversationId,
		agentId: o.agentId,
		outcome: o.outcome,
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
// Routes
// =============================================================================

export const businessAnalyticsRoutes = new Elysia({
	prefix: '/business-analytics',
	name: 'business-analytics-routes',
})
	.use(writePlugin)

	// Set/update a conversation outcome
	.post(
		'/outcomes',
		async ({ db, workspaceId, body, status }) => {
			// Verify conversation belongs to this workspace
			const [conv] = await db
				.select()
				.from(conversations)
				.where(
					and(
						eq(conversations.id, body.conversationId),
						eq(conversations.workspaceId, workspaceId),
					),
				)
			if (!conv) return status(404, { error: 'Conversation not found' })

			// Verify agentId matches the conversation's agent
			if (conv.agentId !== body.agentId) {
				return status(400, { error: 'Agent ID does not match conversation agent' })
			}

			// Get conversation message stats
			const [msgStats] = await db
				.select({ messageCount: count() })
				.from(messages)
				.where(eq(messages.conversationId, body.conversationId))

			// Check for existing outcome
			const [existing] = await db
				.select()
				.from(conversationOutcomes)
				.where(
					and(
						eq(conversationOutcomes.conversationId, body.conversationId),
						eq(conversationOutcomes.workspaceId, workspaceId),
					),
				)

			if (existing) {
				const [updated] = await db
					.update(conversationOutcomes)
					.set({
						outcome: body.outcome,
						messageCount: msgStats?.messageCount ?? existing.messageCount,
						tags: body.tags ?? existing.tags,
						notes: body.notes ?? existing.notes,
						updatedAt: new Date(),
					})
					.where(eq(conversationOutcomes.id, existing.id))
					.returning()

				if (!updated) return status(500, { error: 'Failed to update outcome' })
				return serializeOutcome(updated)
			}

			const [outcome] = await db
				.insert(conversationOutcomes)
				.values({
					conversationId: body.conversationId,
					agentId: body.agentId,
					workspaceId,
					outcome: body.outcome,
					messageCount: msgStats?.messageCount ?? 0,
					tags: body.tags,
					notes: body.notes,
				})
				.returning()

			if (!outcome) return status(500, { error: 'Failed to create outcome' })
			return serializeOutcome(outcome)
		},
		{
			writeAccess: true,
			body: t.Object({
				conversationId: t.String(),
				agentId: t.String(),
				outcome: t.Union([
					t.Literal('resolved'),
					t.Literal('escalated'),
					t.Literal('abandoned'),
					t.Literal('ongoing'),
				]),
				tags: t.Optional(t.Array(t.String())),
				notes: t.Optional(t.String()),
			}),
		},
	)

	// List outcomes for an agent
	.get(
		'/outcomes',
		async ({ db, workspaceId, query }) => {
			const agentId = query.agentId
			const limit = Number(query.limit ?? 50)
			const offset = Number(query.offset ?? 0)

			const [countResult] = await db
				.select({ total: count() })
				.from(conversationOutcomes)
				.where(
					and(
						eq(conversationOutcomes.agentId, agentId),
						eq(conversationOutcomes.workspaceId, workspaceId),
					),
				)

			const results = await db
				.select()
				.from(conversationOutcomes)
				.where(
					and(
						eq(conversationOutcomes.agentId, agentId),
						eq(conversationOutcomes.workspaceId, workspaceId),
					),
				)
				.orderBy(desc(conversationOutcomes.createdAt))
				.limit(limit)
				.offset(offset)

			return {
				outcomes: results.map(serializeOutcome),
				total: countResult?.total ?? 0,
			}
		},
		{
			writeAccess: true,
			query: t.Object({
				agentId: t.String(),
				limit: t.Optional(t.String()),
				offset: t.Optional(t.String()),
			}),
		},
	)

	// Get comprehensive business metrics
	.get(
		'/metrics',
		async ({ db, workspaceId, query }) => {
			const endDate = query.endDate ? new Date(query.endDate) : new Date()
			const startDate = query.startDate
				? new Date(query.startDate)
				: new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)

			// Base conditions
			const conditions = [
				eq(conversationOutcomes.workspaceId, workspaceId),
				gte(conversationOutcomes.createdAt, startDate),
				lte(conversationOutcomes.createdAt, endDate),
			]
			if (query.agentId) {
				conditions.push(eq(conversationOutcomes.agentId, query.agentId))
			}

			// Get total conversations
			const convConditions = [
				eq(conversations.workspaceId, workspaceId),
				gte(conversations.createdAt, startDate),
				lte(conversations.createdAt, endDate),
			]
			if (query.agentId) {
				convConditions.push(eq(conversations.agentId, query.agentId))
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
			if (query.agentId) {
				feedbackConditions.push(eq(messageFeedback.agentId, query.agentId))
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
				avgResponseTimeMs:
					taggedTotal > 0 ? Math.round(avgResponseTime / taggedTotal) : null,
				satisfactionRate,
				outcomeBreakdown: outcomeStats.map((s) => ({
					outcome: s.outcome,
					count: s.count,
					percentage:
						taggedTotal > 0 ? Math.round((s.count / taggedTotal) * 10000) / 100 : 0,
				})),
				dailyTrends: dailyResults.map((d) => ({
					date: d.date,
					conversations: d.total,
					resolved: d.resolved ?? 0,
					escalated: d.escalated ?? 0,
					abandoned: d.abandoned ?? 0,
					avgResponseTimeMs: d.avgResponseTime
						? Math.round(Number(d.avgResponseTime))
						: null,
				})),
				period: {
					startDate: startDate.toISOString(),
					endDate: endDate.toISOString(),
				},
			}
		},
		{
			writeAccess: true,
			query: t.Object({
				agentId: t.Optional(t.String()),
				startDate: t.Optional(t.String()),
				endDate: t.Optional(t.String()),
			}),
		},
	)

	// Get agent performance comparison
	.get(
		'/agent-performance',
		async ({ db, workspaceId, query }) => {
			const endDate = query.endDate ? new Date(query.endDate) : new Date()
			const startDate = query.startDate
				? new Date(query.startDate)
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

			const results = workspaceAgents.map((agent) => {
				const stats = statsMap.get(agent.id)
				const feedback = feedbackMap.get(agent.id)
				const total = stats?.total ?? 0

				return {
					agentId: agent.id,
					agentName: agent.name,
					totalConversations: total,
					resolutionRate:
						total > 0
							? Math.round(((stats?.resolved ?? 0) / total) * 10000) / 100
							: 0,
					escalationRate:
						total > 0
							? Math.round(((stats?.escalated ?? 0) / total) * 10000) / 100
							: 0,
					avgMessagesPerConversation: Number(stats?.avgMessages) || 0,
					avgResponseTimeMs: stats?.avgResponseTime
						? Math.round(Number(stats.avgResponseTime))
						: null,
					satisfactionRate:
						feedback && feedback.total > 0
							? Math.round(
									((feedback.positive ?? 0) / feedback.total) * 10000,
								) / 100
							: null,
				}
			})

			return { agents: results }
		},
		{
			writeAccess: true,
			query: t.Object({
				startDate: t.Optional(t.String()),
				endDate: t.Optional(t.String()),
			}),
		},
	)
