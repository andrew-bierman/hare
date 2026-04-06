/**
 * oRPC Feedback Router
 *
 * Handles message feedback (thumbs up/down) for agent quality tracking.
 */

import { messageFeedback } from '@hare/db/schema'
import { and, count, eq, gte, sql } from 'drizzle-orm'
import { z } from 'zod'
import {
	CreateFeedbackSchema,
	FeedbackSchema,
	FeedbackStatsSchema,
	IdParamSchema,
	SuccessSchema,
} from '../../schemas'
import { badRequest, publicProcedure, requireWrite } from '../base'

// =============================================================================
// Procedures
// =============================================================================

/**
 * Submit feedback on a message (works for both authenticated and embed users)
 */
export const create = publicProcedure
	.route({ method: 'POST', path: '/feedback', successStatus: 201 })
	.input(CreateFeedbackSchema)
	.output(FeedbackSchema)
	.handler(async ({ input, context }) => {
		const { db } = context

		// Check for existing feedback on this message
		const [existing] = await db
			.select()
			.from(messageFeedback)
			.where(eq(messageFeedback.messageId, input.messageId))
			.limit(1)

		if (existing) {
			// Update existing feedback
			const [updated] = await db
				.update(messageFeedback)
				.set({ rating: input.rating, comment: input.comment ?? null })
				.where(eq(messageFeedback.id, existing.id))
				.returning()

			if (!updated) badRequest('Failed to update feedback')

			return {
				id: updated.id,
				messageId: updated.messageId,
				conversationId: updated.conversationId,
				agentId: updated.agentId,
				rating: updated.rating,
				comment: updated.comment,
				createdAt: updated.createdAt.toISOString(),
			}
		}

		const [feedback] = await db
			.insert(messageFeedback)
			.values({
				messageId: input.messageId,
				conversationId: input.conversationId,
				agentId: input.agentId,
				workspaceId: '', // Will be resolved from agent
				rating: input.rating,
				comment: input.comment,
			})
			.returning()

		if (!feedback) badRequest('Failed to create feedback')

		return {
			id: feedback.id,
			messageId: feedback.messageId,
			conversationId: feedback.conversationId,
			agentId: feedback.agentId,
			rating: feedback.rating,
			comment: feedback.comment,
			createdAt: feedback.createdAt.toISOString(),
		}
	})

/**
 * Get feedback stats for an agent
 */
export const getStats = requireWrite
	.route({ method: 'GET', path: '/feedback/stats/{id}' })
	.input(
		IdParamSchema.extend({
			startDate: z.string().datetime().optional(),
			endDate: z.string().datetime().optional(),
		}),
	)
	.output(FeedbackStatsSchema)
	.handler(async ({ input, context }) => {
		const { db } = context

		const endDate = input.endDate ? new Date(input.endDate) : new Date()
		const startDate = input.startDate
			? new Date(input.startDate)
			: new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)

		const [stats] = await db
			.select({
				totalFeedback: count(),
				positiveCount: sql<number>`SUM(CASE WHEN ${messageFeedback.rating} = 'positive' THEN 1 ELSE 0 END)`,
				negativeCount: sql<number>`SUM(CASE WHEN ${messageFeedback.rating} = 'negative' THEN 1 ELSE 0 END)`,
			})
			.from(messageFeedback)
			.where(and(eq(messageFeedback.agentId, input.id), gte(messageFeedback.createdAt, startDate)))

		const total = stats?.totalFeedback ?? 0
		const positive = stats?.positiveCount ?? 0
		const satisfactionRate = total > 0 ? Math.round((positive / total) * 10000) / 100 : 100

		return {
			agentId: input.id,
			totalFeedback: total,
			positiveCount: positive,
			negativeCount: stats?.negativeCount ?? 0,
			satisfactionRate,
			period: {
				startDate: startDate.toISOString(),
				endDate: endDate.toISOString(),
			},
		}
	})

/**
 * Delete feedback
 */
export const remove = requireWrite
	.route({ method: 'DELETE', path: '/feedback/{id}' })
	.input(IdParamSchema)
	.output(SuccessSchema)
	.handler(async ({ input, context }) => {
		const { db } = context
		await db.delete(messageFeedback).where(eq(messageFeedback.id, input.id))
		return { success: true }
	})

// =============================================================================
// Router Export
// =============================================================================

export const feedbackRouter = {
	create,
	getStats,
	delete: remove,
}
