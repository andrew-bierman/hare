import { z } from 'zod'

/**
 * Message feedback schemas for thumbs up/down on agent responses.
 */

export const FeedbackRatingSchema = z
	.enum(['positive', 'negative'])
	.describe('Feedback rating: positive (thumbs up) or negative (thumbs down)')

export const CreateFeedbackSchema = z.object({
	messageId: z.string().describe('Message being rated'),
	conversationId: z.string().describe('Conversation containing the message'),
	agentId: z.string().describe('Agent that generated the message'),
	rating: FeedbackRatingSchema,
	comment: z
		.string()
		.max(1000, 'Comment must be at most 1000 characters')
		.optional()
		.describe('Optional feedback comment'),
})

export const FeedbackSchema = z.object({
	id: z.string(),
	messageId: z.string(),
	conversationId: z.string(),
	agentId: z.string(),
	rating: FeedbackRatingSchema,
	comment: z.string().nullable(),
	createdAt: z.string().datetime(),
})

export const FeedbackStatsSchema = z.object({
	agentId: z.string(),
	totalFeedback: z.number().int(),
	positiveCount: z.number().int(),
	negativeCount: z.number().int(),
	satisfactionRate: z
		.number()
		.min(0)
		.max(100)
		.describe('Percentage of positive feedback (0-100)'),
	period: z.object({
		startDate: z.string().datetime(),
		endDate: z.string().datetime(),
	}),
})
