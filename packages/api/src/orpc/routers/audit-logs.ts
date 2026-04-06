/**
 * oRPC Audit Logs Router
 *
 * Handles querying audit logs with filtering and pagination.
 * Access restricted to workspace admins and owners.
 */

import { AUDIT_ACTIONS } from '@hare/config'
import { auditLogs } from '@hare/db/schema'
import { and, count, desc, eq, gte, lte } from 'drizzle-orm'
import { z } from 'zod'
import { requireAdmin } from '../base'

// =============================================================================
// Type-Safe Schemas
// =============================================================================

const AuditLogSchema = z.object({
	id: z.string(),
	workspaceId: z.string(),
	userId: z.string(),
	action: z.enum(AUDIT_ACTIONS),
	resourceType: z.string(),
	resourceId: z.string().nullable(),
	details: z.record(z.string(), z.unknown()).nullable(),
	ipAddress: z.string().nullable(),
	userAgent: z.string().nullable(),
	createdAt: z.string(),
})

const AuditLogsQueryInputSchema = z.object({
	action: z.enum(AUDIT_ACTIONS).optional(),
	resourceType: z.string().optional(),
	userId: z.string().optional(),
	dateFrom: z.string().optional(),
	dateTo: z.string().optional(),
	limit: z.coerce.number().min(1).max(100).optional().default(50),
	offset: z.coerce.number().min(0).optional().default(0),
})

const AuditLogsResponseSchema = z.object({
	logs: z.array(AuditLogSchema),
	total: z.number(),
	limit: z.number(),
	offset: z.number(),
})

// =============================================================================
// Procedures
// =============================================================================

/**
 * List audit logs with filtering and pagination
 * Restricted to workspace admins and owners
 */
export const list = requireAdmin
	.route({ method: 'GET', path: '/audit-logs' })
	.input(AuditLogsQueryInputSchema)
	.output(AuditLogsResponseSchema)
	.handler(async ({ input, context }) => {
		const { db, workspaceId } = context
		const { action, resourceType, userId, dateFrom, dateTo, limit, offset } = input

		// Build filter conditions
		const conditions = [eq(auditLogs.workspaceId, workspaceId)]

		if (action) {
			conditions.push(eq(auditLogs.action, action))
		}

		if (resourceType) {
			conditions.push(eq(auditLogs.resourceType, resourceType))
		}

		if (userId) {
			conditions.push(eq(auditLogs.userId, userId))
		}

		if (dateFrom) {
			const fromDate = new Date(dateFrom)
			conditions.push(gte(auditLogs.createdAt, fromDate))
		}

		if (dateTo) {
			const toDate = new Date(dateTo)
			conditions.push(lte(auditLogs.createdAt, toDate))
		}

		const whereClause = and(...conditions)

		// Get total count for pagination
		const [countResult] = await db.select({ total: count() }).from(auditLogs).where(whereClause)

		const total = countResult?.total ?? 0

		// Get paginated logs sorted by creation date descending
		const logs = await db
			.select()
			.from(auditLogs)
			.where(whereClause)
			.orderBy(desc(auditLogs.createdAt))
			.limit(limit)
			.offset(offset)

		return {
			logs: logs.map((log) => ({
				id: log.id,
				workspaceId: log.workspaceId,
				userId: log.userId,
				action: log.action,
				resourceType: log.resourceType,
				resourceId: log.resourceId,
				details: log.details,
				ipAddress: log.ipAddress,
				userAgent: log.userAgent,
				createdAt: log.createdAt.toISOString(),
			})),
			total,
			limit,
			offset,
		}
	})

// =============================================================================
// Router Export
// =============================================================================

export const auditLogsRouter = {
	list,
}
