/**
 * Security Audit Logging
 * Provides structured logging for security-relevant events
 */

import { logger } from '@hare/config'

export type AuditEventType =
	// Authentication events
	| 'auth.login'
	| 'auth.logout'
	| 'auth.login_failed'
	| 'auth.password_reset'
	| 'auth.password_changed'
	| 'auth.session_expired'
	| 'auth.session_revoked'
	// API key events
	| 'api_key.created'
	| 'api_key.used'
	| 'api_key.revoked'
	| 'api_key.expired'
	// Security events
	| 'security.csrf_failed'
	| 'security.rate_limit_exceeded'
	| 'security.invalid_input'
	| 'security.unauthorized_access'
	| 'security.suspicious_activity'
	// Data access events
	| 'data.read'
	| 'data.write'
	| 'data.delete'
	// Workspace events
	| 'workspace.created'
	| 'workspace.deleted'
	| 'workspace.member_added'
	| 'workspace.member_removed'
	// Agent events
	| 'agent.created'
	| 'agent.deployed'
	| 'agent.deleted'

export interface AuditLogEntry {
	timestamp: string
	type: AuditEventType
	userId?: string
	workspaceId?: string
	ipAddress?: string
	userAgent?: string
	requestId?: string
	success: boolean
	details?: Record<string, unknown>
}

export interface AuthEventParams {
	type: Extract<AuditEventType, `auth.${string}`>
	userId?: string
	email?: string
	success: boolean
	ipAddress?: string
	userAgent?: string
	requestId?: string
	reason?: string
}

export interface ApiKeyEventParams {
	type: Extract<AuditEventType, `api_key.${string}`>
	apiKeyId: string
	userId?: string
	workspaceId?: string
	ipAddress?: string
	requestId?: string
	endpoint?: string
}

export interface SecurityEventParams {
	type: Extract<AuditEventType, `security.${string}`>
	action: string
	ipAddress?: string
	userAgent?: string
	requestId?: string
	userId?: string
	details?: Record<string, unknown>
}

export interface DataEventParams {
	type: Extract<AuditEventType, `data.${string}`>
	userId: string
	workspaceId?: string
	resource: string
	resourceId?: string
	requestId?: string
	details?: Record<string, unknown>
}

/**
 * Format audit log entry as structured JSON
 */
function formatAuditLog(entry: AuditLogEntry): string {
	return JSON.stringify({
		...entry,
		_type: 'audit_log',
		_version: '1.0',
	})
}

/**
 * Log authentication event
 */
export function logAuthEvent(params: AuthEventParams): void {
	const entry: AuditLogEntry = {
		timestamp: new Date().toISOString(),
		type: params.type,
		userId: params.userId,
		ipAddress: params.ipAddress,
		userAgent: params.userAgent,
		requestId: params.requestId,
		success: params.success,
		details: {
			email: params.email,
			reason: params.reason,
		},
	}

	// In production, send to logging service (e.g., Cloudflare Logpush, DataDog)
	// For now, log in structured format
	logger.info(formatAuditLog(entry))
}

/**
 * Log API key event
 */
export function logApiKeyEvent(params: ApiKeyEventParams): void {
	const entry: AuditLogEntry = {
		timestamp: new Date().toISOString(),
		type: params.type,
		userId: params.userId,
		workspaceId: params.workspaceId,
		ipAddress: params.ipAddress,
		requestId: params.requestId,
		success: true,
		details: {
			apiKeyId: params.apiKeyId,
			endpoint: params.endpoint,
		},
	}

	logger.info(formatAuditLog(entry))
}

/**
 * Log security event
 */
export function logSecurityEvent(params: SecurityEventParams): void {
	const entry: AuditLogEntry = {
		timestamp: new Date().toISOString(),
		type: params.type,
		userId: params.userId,
		ipAddress: params.ipAddress,
		userAgent: params.userAgent,
		requestId: params.requestId,
		success: false, // Security events are typically failures
		details: {
			action: params.action,
			...params.details,
		},
	}

	// Security events should be logged at warn/error level
	logger.warn(formatAuditLog(entry))
}

/**
 * Log data access event
 */
export function logDataEvent(params: DataEventParams): void {
	const entry: AuditLogEntry = {
		timestamp: new Date().toISOString(),
		type: params.type,
		userId: params.userId,
		workspaceId: params.workspaceId,
		requestId: params.requestId,
		success: true,
		details: {
			resource: params.resource,
			resourceId: params.resourceId,
			...params.details,
		},
	}

	logger.info(formatAuditLog(entry))
}

/**
 * Create an audit logger bound to a specific request context
 */
export function createRequestAuditLogger(context: {
	requestId?: string
	ipAddress?: string
	userAgent?: string
	userId?: string
	workspaceId?: string
}) {
	return {
		logAuth: (params: Omit<AuthEventParams, 'requestId' | 'ipAddress' | 'userAgent'>) =>
			logAuthEvent({
				...params,
				requestId: context.requestId,
				ipAddress: context.ipAddress,
				userAgent: context.userAgent,
			}),
		logApiKey: (params: Omit<ApiKeyEventParams, 'requestId' | 'ipAddress'>) =>
			logApiKeyEvent({
				...params,
				requestId: context.requestId,
				ipAddress: context.ipAddress,
			}),
		logSecurity: (params: Omit<SecurityEventParams, 'requestId' | 'ipAddress' | 'userAgent'>) =>
			logSecurityEvent({
				...params,
				requestId: context.requestId,
				ipAddress: context.ipAddress,
				userAgent: context.userAgent,
				userId: context.userId,
			}),
		logData: (params: Omit<DataEventParams, 'requestId' | 'userId' | 'workspaceId'>) =>
			logDataEvent({
				...params,
				requestId: context.requestId,
				userId: context.userId ?? '',
				workspaceId: context.workspaceId,
			}),
	}
}
