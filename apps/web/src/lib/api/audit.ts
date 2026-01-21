/**
 * Audit Logging Utility
 *
 * Provides a reusable function to log audit events from API routes.
 * The function is async and non-blocking to avoid slowing down API responses.
 */

import { getDb } from '@hare/api'
import type { AuditAction } from '@hare/config'
import { auditLogs } from '@hare/db'
import type { WorkspaceEnv } from '@hare/types'
import type { Context } from 'hono'

/**
 * Input for logging an audit event.
 */
export interface LogAuditEventInput {
	/** Hono context with workspace and user info */
	context: Context<WorkspaceEnv>
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
 * Extracts the client IP address from the request.
 * Handles common proxy headers used by Cloudflare and other providers.
 */
function getClientIp(c: Context): string | null {
	// Cloudflare's connecting IP header (most reliable when behind CF)
	const cfIp = c.req.header('cf-connecting-ip')
	if (cfIp) return cfIp

	// Standard forwarded header
	const forwarded = c.req.header('x-forwarded-for')
	if (forwarded) {
		// x-forwarded-for can contain multiple IPs, first one is the client
		const firstIp = forwarded.split(',')[0]
		if (firstIp) return firstIp.trim()
	}

	// Fallback to x-real-ip
	const realIp = c.req.header('x-real-ip')
	if (realIp) return realIp

	return null
}

/**
 * Logs an audit event to the database.
 *
 * This function is async and non-blocking. It fires the database insert
 * without awaiting the result, so it doesn't slow down API responses.
 * Errors are logged to console but don't propagate to the caller.
 *
 * @example
 * ```ts
 * // In an API route handler
 * logAuditEvent({
 *   context: c,
 *   action: 'agent.create',
 *   resourceType: 'agent',
 *   resourceId: agent.id,
 *   details: { name: agent.name }
 * })
 * ```
 */
export function logAuditEvent(input: LogAuditEventInput): void {
	const { context, action, resourceType, resourceId, details } = input

	// Extract user and workspace from context
	const user = context.get('user')
	const workspace = context.get('workspace')

	if (!user || !workspace) {
		console.warn('logAuditEvent: Missing user or workspace in context')
		return
	}

	// Extract IP and user agent
	const ipAddress = getClientIp(context)
	const userAgent = context.req.header('user-agent') ?? null

	// Get database instance
	const db = getDb(context)

	// Fire and forget - don't await to keep it non-blocking
	db.insert(auditLogs)
		.values({
			workspaceId: workspace.id,
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
