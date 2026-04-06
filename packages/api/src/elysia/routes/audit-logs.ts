/**
 * Audit Log Routes
 *
 * Querying audit logs with filtering and pagination.
 * Restricted to workspace admins and owners.
 */

import type { AuditAction } from '@hare/config'
import { auditLogs } from '@hare/db/schema'
import { and, count, desc, eq, gte, lte } from 'drizzle-orm'
import { Elysia } from 'elysia'
import { adminPlugin } from '../context'

// =============================================================================
// Routes
// =============================================================================

export const auditLogRoutes = new Elysia({ prefix: '/audit-logs', name: 'audit-log-routes' })
	.use(adminPlugin)

	// List audit logs with filtering and pagination
	.get(
		'/',
		async ({ db, workspaceId, query }) => {
			const action = query?.action as string | undefined
			const resourceType = query?.resourceType as string | undefined
			const userId = query?.userId as string | undefined
			const dateFrom = query?.dateFrom as string | undefined
			const dateTo = query?.dateTo as string | undefined
			const limit = Number(query?.limit) || 50
			const offset = Number(query?.offset) || 0

			// Build filter conditions
			const conditions = [eq(auditLogs.workspaceId, workspaceId)]

			if (action) {
				conditions.push(eq(auditLogs.action, action as AuditAction))
			}
			if (resourceType) {
				conditions.push(eq(auditLogs.resourceType, resourceType))
			}
			if (userId) {
				conditions.push(eq(auditLogs.userId, userId))
			}
			if (dateFrom) {
				conditions.push(gte(auditLogs.createdAt, new Date(dateFrom)))
			}
			if (dateTo) {
				conditions.push(lte(auditLogs.createdAt, new Date(dateTo)))
			}

			const whereClause = and(...conditions)

			const [countResult] = await db.select({ total: count() }).from(auditLogs).where(whereClause)
			const total = countResult?.total ?? 0

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
		},
		{ adminAccess: true },
	)
