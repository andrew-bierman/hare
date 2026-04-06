/**
 * Activity Routes
 *
 * Activity events (agent invocations, tool calls, errors) with cursor pagination.
 */

import { ACTIVITY_EVENT_TYPES } from '@hare/config'
import { activityEvents } from '@hare/db/schema'
import { and, count, desc, eq, lt } from 'drizzle-orm'
import { Elysia } from 'elysia'
import { z } from 'zod'
import { workspacePlugin } from '../context'

// =============================================================================
// Schemas
// =============================================================================

const ActivityQueryInputSchema = z.object({
	agentId: z.string().optional(),
	eventType: z.enum(ACTIVITY_EVENT_TYPES).optional(),
	cursor: z.string().optional(),
	limit: z.coerce.number().min(1).max(100).optional().default(50),
})

// =============================================================================
// Routes
// =============================================================================

export const activityRoutes = new Elysia({ prefix: '/activity', name: 'activity-routes' })
	.use(workspacePlugin)

	// List activity events with filtering and cursor pagination
	.post(
		'/',
		async ({ db, workspaceId, body }) => {
			const { agentId, eventType, cursor, limit } = body || { limit: 50 }
			const effectiveLimit = limit || 50

			try {
				// Build filter conditions
				const conditions = [eq(activityEvents.workspaceId, workspaceId)]

				if (agentId) {
					conditions.push(eq(activityEvents.agentId, agentId))
				}
				if (eventType) {
					conditions.push(eq(activityEvents.eventType, eventType))
				}
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

				// Get paginated events
				const events = await db
					.select()
					.from(activityEvents)
					.where(whereClause)
					.orderBy(desc(activityEvents.createdAt))
					.limit(effectiveLimit + 1)

				const hasMore = events.length > effectiveLimit
				const resultEvents = hasMore ? events.slice(0, effectiveLimit) : events
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
			} catch (err) {
				// Table may not exist if migration hasn't been applied
				if (err instanceof Error && err.message.includes('no such table')) {
					return { events: [], nextCursor: null, total: 0 }
				}
				throw err
			}
		},
		{ workspace: true, body: ActivityQueryInputSchema.optional() },
	)
