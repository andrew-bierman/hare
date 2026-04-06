/**
 * Audit Logging Utility
 *
 * Provides a reusable function to log audit events from Elysia route handlers.
 * Non-blocking in production, awaited in test environments.
 */

import type { AuditAction } from '@hare/config'
import type { Database } from '@hare/db'
import { auditLogs } from '@hare/db/schema'

export interface LogAuditInput {
	db: Database
	workspaceId: string
	userId: string
	headers: Headers
	action: AuditAction
	resourceType: string
	resourceId?: string
	details?: Record<string, unknown>
}

function getClientIp(headers: Headers): string | null {
	const cfIp = headers.get('cf-connecting-ip')
	if (cfIp) return cfIp

	const forwarded = headers.get('x-forwarded-for')
	if (forwarded) {
		const firstIp = forwarded.split(',')[0]
		if (firstIp) return firstIp.trim()
	}

	return headers.get('x-real-ip')
}

export async function logAudit(input: LogAuditInput): Promise<void> {
	const { db, workspaceId, userId, headers, action, resourceType, resourceId, details } = input

	const ipAddress = getClientIp(headers)
	const userAgent = headers.get('user-agent') ?? null

	if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
		try {
			await db.insert(auditLogs).values({
				workspaceId,
				userId,
				action,
				resourceType,
				resourceId: resourceId ?? null,
				details: details ?? null,
				ipAddress,
				userAgent,
			})
		} catch (error) {
			console.error('Failed to log audit event:', error)
		}
	} else {
		db.insert(auditLogs)
			.values({
				workspaceId,
				userId,
				action,
				resourceType,
				resourceId: resourceId ?? null,
				details: details ?? null,
				ipAddress,
				userAgent,
			})
			.catch((error) => {
				console.error('Failed to log audit event:', error)
			})
	}
}
