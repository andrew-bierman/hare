/**
 * Feedback Routes
 *
 * Message feedback (thumbs up/down) for agent quality tracking.
 */

import { agents, messageFeedback } from '@hare/db/schema'
import { and, count, eq, gte, lte, sql } from 'drizzle-orm'
import { Elysia, status } from 'elysia'
import type { z } from 'zod'
import { CreateFeedbackSchema, type FeedbackSchema, type FeedbackStatsSchema } from '../../schemas'
import { cfContext, writePlugin } from '../context'

// =============================================================================
// Helpers
// =============================================================================

function serializeFeedback(f: typeof messageFeedback.$inferSelect): z.infer<typeof FeedbackSchema> {
	return {
		id: f.id,
		messageId: f.messageId,
		conversationId: f.conversationId,
		agentId: f.agentId,
		rating: f.rating,
		comment: f.comment,
		createdAt: f.createdAt.toISOString(),
	}
}

// =============================================================================
// Routes
// =============================================================================

export const feedbackRoutes = new Elysia({ prefix: '/feedback', name: 'feedback-routes' })
	.use(cfContext)

	// Submit feedback (public - works for both authenticated and embed users)
	.post(
		'/',
		async ({ db, body }) => {
			// Resolve workspaceId from agent
			const [agent] = await db
				.select({ workspaceId: agents.workspaceId })
				.from(agents)
				.where(eq(agents.id, body.agentId))
				.limit(1)

			if (!agent) return status(400, { error: 'Agent not found' })

			// Upsert: check for existing feedback on this message (per-message, not per-user for embed support)
			const [existing] = await db
				.select()
				.from(messageFeedback)
				.where(eq(messageFeedback.messageId, body.messageId))
				.limit(1)

			if (existing) {
				const [updated] = await db
					.update(messageFeedback)
					.set({ rating: body.rating, comment: body.comment ?? null })
					.where(eq(messageFeedback.id, existing.id))
					.returning()

				if (!updated) return status(400, { error: 'Failed to update feedback' })

				return serializeFeedback(updated)
			}

			const [feedback] = await db
				.insert(messageFeedback)
				.values({
					messageId: body.messageId,
					conversationId: body.conversationId,
					agentId: body.agentId,
					workspaceId: agent.workspaceId,
					rating: body.rating,
					comment: body.comment,
				})
				.returning()

			if (!feedback) return status(400, { error: 'Failed to create feedback' })

			return serializeFeedback(feedback)
		},
		{ body: CreateFeedbackSchema },
	)

	// --- Write-access routes ---
	.use(writePlugin)

	// Get feedback stats for an agent
	.get(
		'/stats/:id',
		async ({ db, workspaceId, params, query }) => {
			const endDate = query?.endDate ? new Date(query.endDate) : new Date()
			const startDate = query?.startDate
				? new Date(query.startDate)
				: new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)

			const [stats] = await db
				.select({
					totalFeedback: count(),
					positiveCount: sql<number>`SUM(CASE WHEN ${messageFeedback.rating} = 'positive' THEN 1 ELSE 0 END)`,
					negativeCount: sql<number>`SUM(CASE WHEN ${messageFeedback.rating} = 'negative' THEN 1 ELSE 0 END)`,
				})
				.from(messageFeedback)
				.where(
					and(
						eq(messageFeedback.agentId, params.id),
						eq(messageFeedback.workspaceId, workspaceId),
						gte(messageFeedback.createdAt, startDate),
						lte(messageFeedback.createdAt, endDate),
					),
				)

			const total = stats?.totalFeedback ?? 0
			const positive = stats?.positiveCount ?? 0
			const satisfactionRate = total > 0 ? Math.round((positive / total) * 10000) / 100 : 100

			return {
				agentId: params.id,
				totalFeedback: total,
				positiveCount: positive,
				negativeCount: stats?.negativeCount ?? 0,
				satisfactionRate,
				period: {
					startDate: startDate.toISOString(),
					endDate: endDate.toISOString(),
				},
			}
		},
		{ writeAccess: true },
	)

	// Delete feedback (scoped by workspace)
	.delete(
		'/:id',
		async ({ db, workspaceId, params }) => {
			const result = await db
				.delete(messageFeedback)
				.where(and(eq(messageFeedback.id, params.id), eq(messageFeedback.workspaceId, workspaceId)))
				.returning()

			if (result.length === 0) return status(404, { error: 'Feedback not found' })

			return { success: true }
		},
		{ writeAccess: true },
	)
