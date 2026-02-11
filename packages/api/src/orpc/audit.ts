/**
 * Audit Logging Utility for oRPC Routes
 *
 * Provides a reusable function to log audit events from oRPC route handlers.
 * The function is async and non-blocking to avoid slowing down API responses.
 */

import type { AuditAction } from '@hare/config'
import { auditLogs } from '@hare/db/schema'
import type { WorkspaceContext } from './base'

/**
 * Input for logging an audit event from oRPC context.
 */
export interface LogAuditInput {
	/** oRPC workspace context */
	context: WorkspaceContext
	/** The audit action being performed */
	action: AuditAction
	/** The type of resource (e.g., 'agent', 'tool', 'member') */
	resourceType: string
	/** The ID of the resource (optional for some actions) */
	resourceId?: string
	/** Additional details about the action */
	details?: Record<string, unknown>
}

/**
 * Extracts the client IP address from headers.
 * Handles common proxy headers used by Cloudflare and other providers.
 */
function getClientIp(headers: Headers): string | null {
	// Cloudflare's connecting IP header (most reliable when behind CF)
	const cfIp = headers.get('cf-connecting-ip')
	if (cfIp) return cfIp

	// Standard forwarded header
	const forwarded = headers.get('x-forwarded-for')
	if (forwarded) {
		// x-forwarded-for can contain multiple IPs, first one is the client
		const firstIp = forwarded.split(',')[0]
		if (firstIp) return firstIp.trim()
	}

	// Fallback to x-real-ip
	const realIp = headers.get('x-real-ip')
	if (realIp) return realIp

	return null
}

/**
 * Logs an audit event to the database from an oRPC route handler.
 *
 * This function is async and non-blocking. It fires the database insert
 * without awaiting the result, so it doesn't slow down API responses.
 * Errors are logged to console but don't propagate to the caller.
 *
 * @example
 * ```ts
 * // In an oRPC route handler
 * logAudit({
 *   context,
 *   action: 'agent.create',
 *   resourceType: 'agent',
 *   resourceId: agent.id,
 *   details: { name: agent.name }
 * })
 * ```
 */
export async function logAudit(input: LogAuditInput): Promise<void> {
	const { context, action, resourceType, resourceId, details } = input
	const { db, workspaceId, user, headers } = context

	// Extract IP and user agent from headers
	const ipAddress = getClientIp(headers)
	const userAgent = headers.get('user-agent') ?? null

	// Check if we're in test environment - if so, we need to properly await the operation
	// to avoid D1 isolated storage issues during tests
	if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
		// In test mode, await the operation to ensure it completes before test ends
		try {
			await db.insert(auditLogs).values({
				workspaceId,
				userId: user.id,
				action,
				resourceType,
				resourceId: resourceId ?? null,
				details: details ?? null,
				ipAddress,
				userAgent,
			})
		} catch (error) {
			// Log error but don't propagate - audit logging shouldn't break the API
			console.error('Failed to log audit event:', error)
		}
	} else {
		// Fire and forget - don't await to keep it non-blocking
		db.insert(auditLogs)
			.values({
				workspaceId,
				userId: user.id,
				action,
				resourceType,
				resourceId: resourceId ?? null,
				details: details ?? null,
				ipAddress,
				userAgent,
			})
			.then(() => {
				// Successfully logged
			})
			.catch((error) => {
				// Log error but don't propagate - audit logging shouldn't break the API
				console.error('Failed to log audit event:', error)
			})
	}
}
