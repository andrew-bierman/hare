/**
 * oRPC Activity Router
 *
 * Handles querying activity events (agent invocations, tool calls, errors) with filtering and cursor pagination.
 */

import { ACTIVITY_EVENT_TYPES } from '@hare/config'
import { activityEvents } from '@hare/db/schema'
import { and, count, desc, eq, lt } from 'drizzle-orm'
import { z } from 'zod'
import { requireViewer } from '../base'

// =============================================================================
// Type-Safe Schemas
// =============================================================================

const ActivityEventSchema = z.object({
	id: z.string(),
	workspaceId: z.string(),
	agentId: z.string().nullable(),
	eventType: z.enum(ACTIVITY_EVENT_TYPES),
	agentName: z.string().nullable(),
	summary: z.string(),
	details: z.record(z.string(), z.unknown()).nullable(),
	createdAt: z.string(),
})

const ActivityQueryInputSchema = z.object({
	agentId: z.string().optional(),
	eventType: z.enum(ACTIVITY_EVENT_TYPES).optional(),
	cursor: z.string().optional(),
	limit: z.coerce.number().min(1).max(100).optional().default(50),
})

const ActivityResponseSchema = z.object({
	events: z.array(ActivityEventSchema),
	nextCursor: z.string().nullable(),
	total: z.number(),
})

// =============================================================================
// Procedures
// =============================================================================

/**
 * List activity events with filtering and cursor pagination
 * Returns recent agent invocations, tool calls, and errors
 */
export const list = requireViewer
	.route({ method: 'POST', path: '/activity' })
	.input(ActivityQueryInputSchema.optional().default({}))
	.output(ActivityResponseSchema)
	.handler(async ({ input, context }) => {
		const { db, workspaceId } = context
		const { agentId, eventType, cursor, limit } = input

		try {
			// Build filter conditions
			const conditions = [eq(activityEvents.workspaceId, workspaceId)]

			if (agentId) {
				conditions.push(eq(activityEvents.agentId, agentId))
			}

			if (eventType) {
				conditions.push(eq(activityEvents.eventType, eventType))
			}

			// Add cursor condition for pagination
			if (cursor) {
				const cursorDate = new Date(cursor)
				conditions.push(lt(activityEvents.createdAt, cursorDate))
			}

			const whereClause = and(...conditions)

			// Get total count (without cursor for accurate total)
			const countConditions = [eq(activityEvents.workspaceId, workspaceId)]
			if (agentId) {
				countConditions.push(eq(activityEvents.agentId, agentId))
			}
			if (eventType) {
				countConditions.push(eq(activityEvents.eventType, eventType))
			}

			const [countResult] = await db
				.select({ total: count() })
				.from(activityEvents)
				.where(and(...countConditions))

			const total = countResult?.total ?? 0

			// Get paginated events sorted by creation date descending
			const events = await db
				.select()
				.from(activityEvents)
				.where(whereClause)
				.orderBy(desc(activityEvents.createdAt))
				.limit(limit + 1) // Fetch one extra to determine if there are more

			// Determine if there are more results
			const hasMore = events.length > limit
			const resultEvents = hasMore ? events.slice(0, limit) : events
			const lastEvent = resultEvents[resultEvents.length - 1]
			const nextCursor = hasMore && lastEvent ? lastEvent.createdAt.toISOString() : null

			return {
				events: resultEvents.map((event) => ({
					id: event.id,
					workspaceId: event.workspaceId,
					agentId: event.agentId,
					eventType: event.eventType,
					agentName: event.agentName,
					summary: event.summary,
					details: event.details,
					createdAt: event.createdAt.toISOString(),
				})),
				nextCursor,
				total,
			}
		} catch (error) {
			// Table may not exist in production if migration hasn't been applied
			if (error instanceof Error && error.message.includes('no such table')) {
				return { events: [], nextCursor: null, total: 0 }
			}
			throw error
		}
	})

// =============================================================================
// Router Export
// =============================================================================

export const activityRouter = {
	list,
}
