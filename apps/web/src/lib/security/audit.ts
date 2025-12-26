/**
 * Audit logging utilities for security-sensitive operations
 * Tracks authentication, authorization, and data access events
 */

export type AuditEventType =
	| 'auth.login'
	| 'auth.logout'
	| 'auth.signup'
	| 'auth.failed_login'
	| 'auth.password_reset'
	| 'auth.session_expired'
	| 'api_key.created'
	| 'api_key.deleted'
	| 'api_key.used'
	| 'workspace.created'
	| 'workspace.deleted'
	| 'workspace.member_added'
	| 'workspace.member_removed'
	| 'agent.created'
	| 'agent.updated'
	| 'agent.deleted'
	| 'agent.deployed'
	| 'data.accessed'
	| 'data.modified'
	| 'data.deleted'
	| 'security.csrf_failed'
	| 'security.rate_limit_exceeded'
	| 'security.suspicious_activity'

export interface AuditEvent {
	type: AuditEventType
	userId?: string
	workspaceId?: string
	resourceId?: string
	resourceType?: string
	action: string
	details?: Record<string, unknown>
	ipAddress?: string
	userAgent?: string
	success: boolean
	error?: string
	timestamp: Date
	requestId?: string
}

/**
 * Log an audit event
 * In production, send to a logging service (e.g., Logflare, Datadog, Cloudflare Logs)
 */
export function logAuditEvent(event: Omit<AuditEvent, 'timestamp'>): void {
	const auditEvent: AuditEvent = {
		...event,
		timestamp: new Date(),
	}

	// In production, send to logging service
	// For now, log to console in structured format
	console.log(
		JSON.stringify({
			type: 'audit_event',
			...auditEvent,
		}),
	)

	// TODO: Implement production logging
	// Examples:
	// - Send to Cloudflare Logpush
	// - Send to external logging service (Datadog, Logflare, etc.)
	// - Store in D1 audit log table
	// - Send to analytics platform
}

/**
 * Log authentication events
 */
export function logAuthEvent(opts: {
	type: Extract<
		AuditEventType,
		| 'auth.login'
		| 'auth.logout'
		| 'auth.signup'
		| 'auth.failed_login'
		| 'auth.password_reset'
		| 'auth.session_expired'
	>
	userId?: string
	email?: string
	success: boolean
	error?: string
	ipAddress?: string
	userAgent?: string
	requestId?: string
}): void {
	logAuditEvent({
		type: opts.type,
		userId: opts.userId,
		action: opts.type.replace('auth.', ''),
		details: {
			email: opts.email,
		},
		success: opts.success,
		error: opts.error,
		ipAddress: opts.ipAddress,
		userAgent: opts.userAgent,
		requestId: opts.requestId,
	})
}

/**
 * Log API key events
 */
export function logApiKeyEvent(opts: {
	type: Extract<AuditEventType, 'api_key.created' | 'api_key.deleted' | 'api_key.used'>
	userId?: string
	workspaceId: string
	apiKeyId: string
	success: boolean
	error?: string
	ipAddress?: string
	requestId?: string
}): void {
	logAuditEvent({
		type: opts.type,
		userId: opts.userId,
		workspaceId: opts.workspaceId,
		resourceId: opts.apiKeyId,
		resourceType: 'api_key',
		action: opts.type.replace('api_key.', ''),
		success: opts.success,
		error: opts.error,
		ipAddress: opts.ipAddress,
		requestId: opts.requestId,
	})
}

/**
 * Log data access events
 */
export function logDataAccessEvent(opts: {
	type: Extract<AuditEventType, 'data.accessed' | 'data.modified' | 'data.deleted'>
	userId?: string
	workspaceId: string
	resourceId: string
	resourceType: string
	success: boolean
	details?: Record<string, unknown>
	error?: string
	requestId?: string
}): void {
	logAuditEvent({
		type: opts.type,
		userId: opts.userId,
		workspaceId: opts.workspaceId,
		resourceId: opts.resourceId,
		resourceType: opts.resourceType,
		action: opts.type.replace('data.', ''),
		details: opts.details,
		success: opts.success,
		error: opts.error,
		requestId: opts.requestId,
	})
}

/**
 * Log security events
 */
export function logSecurityEvent(opts: {
	type: Extract<
		AuditEventType,
		'security.csrf_failed' | 'security.rate_limit_exceeded' | 'security.suspicious_activity'
	>
	userId?: string
	action: string
	details?: Record<string, unknown>
	ipAddress?: string
	userAgent?: string
	requestId?: string
}): void {
	logAuditEvent({
		type: opts.type,
		userId: opts.userId,
		action: opts.action,
		details: opts.details,
		success: false, // Security events are always failures
		ipAddress: opts.ipAddress,
		userAgent: opts.userAgent,
		requestId: opts.requestId,
	})
}

/**
 * Query audit logs (for admin dashboards)
 * This would query the audit log storage
 */
export interface AuditLogQuery {
	userId?: string
	workspaceId?: string
	type?: AuditEventType
	startDate?: Date
	endDate?: Date
	limit?: number
}

/**
 * Get audit logs based on query
 * TODO: Implement based on chosen storage solution
 */
export async function getAuditLogs(_query: AuditLogQuery): Promise<AuditEvent[]> {
	// TODO: Implement audit log retrieval
	// This would query from:
	// - D1 audit log table
	// - Cloudflare Analytics Engine
	// - External logging service API
	return []
}
