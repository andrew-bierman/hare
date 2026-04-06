import { z } from 'zod'

/**
 * Business analytics schemas - conversation outcomes, satisfaction, and quality metrics.
 */

export const ConversationOutcomeEnum = z.enum(['resolved', 'escalated', 'abandoned', 'ongoing'])

export const ConversationOutcomeSchema = z.object({
	id: z.string(),
	conversationId: z.string(),
	agentId: z.string(),
	outcome: ConversationOutcomeEnum,
	messageCount: z.number().int(),
	durationSeconds: z.number().int().nullable(),
	avgResponseTimeMs: z.number().int().nullable(),
	toolCallCount: z.number().int(),
	tags: z.array(z.string()).nullable(),
	notes: z.string().nullable(),
	createdAt: z.string().datetime(),
})

export const SetOutcomeSchema = z.object({
	conversationId: z.string(),
	agentId: z.string(),
	outcome: ConversationOutcomeEnum,
	tags: z.array(z.string().max(50)).max(10).optional(),
	notes: z.string().max(500).optional(),
})

export const BusinessMetricsSchema = z.object({
	/** Total conversations in period */
	totalConversations: z.number().int(),
	/** Conversations with outcomes tagged */
	taggedConversations: z.number().int(),
	/** Resolution rate as percentage (0-100) */
	resolutionRate: z.number(),
	/** Escalation/handoff rate as percentage (0-100) */
	escalationRate: z.number(),
	/** Abandonment rate as percentage (0-100) */
	abandonmentRate: z.number(),
	/** Average messages per conversation */
	avgMessagesPerConversation: z.number(),
	/** Average conversation duration in seconds */
	avgConversationDurationSeconds: z.number().nullable(),
	/** Average agent response time in milliseconds */
	avgResponseTimeMs: z.number().nullable(),
	/** Satisfaction rate from feedback (if available) */
	satisfactionRate: z.number().nullable(),
	/** Breakdown by outcome */
	outcomeBreakdown: z.array(
		z.object({
			outcome: ConversationOutcomeEnum,
			count: z.number().int(),
			percentage: z.number(),
		}),
	),
	/** Trends over time (daily) */
	dailyTrends: z.array(
		z.object({
			date: z.string(),
			conversations: z.number().int(),
			resolved: z.number().int(),
			escalated: z.number().int(),
			abandoned: z.number().int(),
			avgResponseTimeMs: z.number().nullable(),
		}),
	),
	period: z.object({
		startDate: z.string().datetime(),
		endDate: z.string().datetime(),
	}),
})

export const AgentPerformanceSchema = z.object({
	agentId: z.string(),
	agentName: z.string(),
	totalConversations: z.number().int(),
	resolutionRate: z.number(),
	escalationRate: z.number(),
	avgMessagesPerConversation: z.number(),
	avgResponseTimeMs: z.number().nullable(),
	satisfactionRate: z.number().nullable(),
})
