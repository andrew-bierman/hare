import { z } from '@hono/zod-openapi'

/**
 * Message feedback schemas for thumbs up/down on agent responses.
 */

export const FeedbackRatingSchema = z.enum(['positive', 'negative']).openapi({
	example: 'positive',
	description: 'Feedback rating: positive (thumbs up) or negative (thumbs down)',
})

export const CreateFeedbackSchema = z
	.object({
		messageId: z.string().openapi({ example: 'msg_abc123', description: 'Message being rated' }),
		conversationId: z
			.string()
			.openapi({ example: 'conv_xyz789', description: 'Conversation containing the message' }),
		agentId: z
			.string()
			.openapi({ example: 'agent_abc123', description: 'Agent that generated the message' }),
		rating: FeedbackRatingSchema,
		comment: z
			.string()
			.max(1000, 'Comment must be at most 1000 characters')
			.optional()
			.openapi({ description: 'Optional feedback comment' }),
	})
	.openapi('CreateFeedback')

export const FeedbackSchema = z
	.object({
		id: z.string().openapi({ example: 'fb_abc123' }),
		messageId: z.string(),
		conversationId: z.string(),
		agentId: z.string(),
		rating: FeedbackRatingSchema,
		comment: z.string().nullable(),
		createdAt: z.string().datetime(),
	})
	.openapi('Feedback')

export const FeedbackStatsSchema = z
	.object({
		agentId: z.string(),
		totalFeedback: z.number().int(),
		positiveCount: z.number().int(),
		negativeCount: z.number().int(),
		satisfactionRate: z.number().min(0).max(100).openapi({
			description: 'Percentage of positive feedback (0-100)',
		}),
		period: z.object({
			startDate: z.string().datetime(),
			endDate: z.string().datetime(),
		}),
	})
	.openapi('FeedbackStats')
