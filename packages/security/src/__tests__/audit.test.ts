import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
	createRequestAuditLogger,
	logApiKeyEvent,
	logAuthEvent,
	logDataEvent,
	logSecurityEvent,
} from '../audit'

describe('Audit Logging', () => {
	let consoleSpy: {
		log: ReturnType<typeof vi.spyOn>
		warn: ReturnType<typeof vi.spyOn>
	}

	beforeEach(() => {
		consoleSpy = {
			log: vi.spyOn(console, 'log').mockImplementation(() => {}),
			warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
		}
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	describe('logAuthEvent', () => {
		it('logs successful login event', () => {
			logAuthEvent({
				type: 'auth.login',
				userId: 'user_123',
				email: 'user@example.com',
				success: true,
				ipAddress: '192.168.1.1',
				userAgent: 'Mozilla/5.0',
				requestId: 'req_abc123',
			})

			expect(consoleSpy.log).toHaveBeenCalledTimes(1)

			const loggedJson = JSON.parse(consoleSpy.log.mock.calls[0]![0] as string)
			expect(loggedJson).toMatchObject({
				type: 'auth.login',
				userId: 'user_123',
				success: true,
				ipAddress: '192.168.1.1',
				userAgent: 'Mozilla/5.0',
				requestId: 'req_abc123',
				details: {
					email: 'user@example.com',
				},
				_type: 'audit_log',
				_version: '1.0',
			})
			expect(loggedJson.timestamp).toBeDefined()
		})

		it('logs failed login event', () => {
			logAuthEvent({
				type: 'auth.login_failed',
				email: 'user@example.com',
				success: false,
				ipAddress: '10.0.0.1',
				reason: 'Invalid credentials',
			})

			expect(consoleSpy.log).toHaveBeenCalledTimes(1)

			const loggedJson = JSON.parse(consoleSpy.log.mock.calls[0]![0] as string)
			expect(loggedJson).toMatchObject({
				type: 'auth.login_failed',
				success: false,
				details: {
					email: 'user@example.com',
					reason: 'Invalid credentials',
				},
			})
		})

		it('logs logout event', () => {
			logAuthEvent({
				type: 'auth.logout',
				userId: 'user_456',
				success: true,
			})

			expect(consoleSpy.log).toHaveBeenCalledTimes(1)

			const loggedJson = JSON.parse(consoleSpy.log.mock.calls[0]![0] as string)
			expect(loggedJson.type).toBe('auth.logout')
			expect(loggedJson.userId).toBe('user_456')
		})

		it('logs password reset event', () => {
			logAuthEvent({
				type: 'auth.password_reset',
				email: 'user@example.com',
				success: true,
				requestId: 'req_reset_123',
			})

			expect(consoleSpy.log).toHaveBeenCalledTimes(1)

			const loggedJson = JSON.parse(consoleSpy.log.mock.calls[0]![0] as string)
			expect(loggedJson.type).toBe('auth.password_reset')
		})

		it('logs password changed event', () => {
			logAuthEvent({
				type: 'auth.password_changed',
				userId: 'user_789',
				success: true,
			})

			const loggedJson = JSON.parse(consoleSpy.log.mock.calls[0]![0] as string)
			expect(loggedJson.type).toBe('auth.password_changed')
		})

		it('logs session expired event', () => {
			logAuthEvent({
				type: 'auth.session_expired',
				userId: 'user_expired',
				success: false,
			})

			const loggedJson = JSON.parse(consoleSpy.log.mock.calls[0]![0] as string)
			expect(loggedJson.type).toBe('auth.session_expired')
		})

		it('logs session revoked event', () => {
			logAuthEvent({
				type: 'auth.session_revoked',
				userId: 'user_revoked',
				success: true,
				reason: 'Revoked by admin',
			})

			const loggedJson = JSON.parse(consoleSpy.log.mock.calls[0]![0] as string)
			expect(loggedJson.type).toBe('auth.session_revoked')
			expect(loggedJson.details.reason).toBe('Revoked by admin')
		})

		it('includes timestamp in ISO format', () => {
			const beforeTime = new Date().toISOString()

			logAuthEvent({
				type: 'auth.login',
				success: true,
			})

			const afterTime = new Date().toISOString()
			const loggedJson = JSON.parse(consoleSpy.log.mock.calls[0]![0] as string)

			expect(loggedJson.timestamp).toBeDefined()
			expect(new Date(loggedJson.timestamp).toISOString()).toBe(loggedJson.timestamp)
			expect(loggedJson.timestamp >= beforeTime).toBe(true)
			expect(loggedJson.timestamp <= afterTime).toBe(true)
		})

		it('handles missing optional fields', () => {
			logAuthEvent({
				type: 'auth.login',
				success: true,
			})

			const loggedJson = JSON.parse(consoleSpy.log.mock.calls[0]![0] as string)
			expect(loggedJson.userId).toBeUndefined()
			expect(loggedJson.ipAddress).toBeUndefined()
			expect(loggedJson.userAgent).toBeUndefined()
		})
	})

	describe('logApiKeyEvent', () => {
		it('logs API key created event', () => {
			logApiKeyEvent({
				type: 'api_key.created',
				apiKeyId: 'key_123',
				userId: 'user_456',
				workspaceId: 'ws_789',
				ipAddress: '192.168.1.1',
			})

			expect(consoleSpy.log).toHaveBeenCalledTimes(1)

			const loggedJson = JSON.parse(consoleSpy.log.mock.calls[0]![0] as string)
			expect(loggedJson).toMatchObject({
				type: 'api_key.created',
				userId: 'user_456',
				workspaceId: 'ws_789',
				success: true,
				details: {
					apiKeyId: 'key_123',
				},
			})
		})

		it('logs API key used event', () => {
			logApiKeyEvent({
				type: 'api_key.used',
				apiKeyId: 'key_abc',
				endpoint: '/api/agents',
				ipAddress: '10.0.0.1',
				requestId: 'req_xyz',
			})

			const loggedJson = JSON.parse(consoleSpy.log.mock.calls[0]![0] as string)
			expect(loggedJson).toMatchObject({
				type: 'api_key.used',
				requestId: 'req_xyz',
				details: {
					apiKeyId: 'key_abc',
					endpoint: '/api/agents',
				},
			})
		})

		it('logs API key revoked event', () => {
			logApiKeyEvent({
				type: 'api_key.revoked',
				apiKeyId: 'key_revoked',
				userId: 'user_admin',
			})

			const loggedJson = JSON.parse(consoleSpy.log.mock.calls[0]![0] as string)
			expect(loggedJson.type).toBe('api_key.revoked')
		})

		it('logs API key expired event', () => {
			logApiKeyEvent({
				type: 'api_key.expired',
				apiKeyId: 'key_expired',
			})

			const loggedJson = JSON.parse(consoleSpy.log.mock.calls[0]![0] as string)
			expect(loggedJson.type).toBe('api_key.expired')
		})

		it('always marks success as true', () => {
			logApiKeyEvent({
				type: 'api_key.used',
				apiKeyId: 'key_123',
			})

			const loggedJson = JSON.parse(consoleSpy.log.mock.calls[0]![0] as string)
			expect(loggedJson.success).toBe(true)
		})
	})

	describe('logSecurityEvent', () => {
		it('logs CSRF failed event', () => {
			logSecurityEvent({
				type: 'security.csrf_failed',
				action: 'POST /api/agents',
				ipAddress: '192.168.1.1',
				userAgent: 'Mozilla/5.0',
				requestId: 'req_csrf',
			})

			// Security events use console.warn
			expect(consoleSpy.warn).toHaveBeenCalledTimes(1)

			const loggedJson = JSON.parse(consoleSpy.warn.mock.calls[0]![0] as string)
			expect(loggedJson).toMatchObject({
				type: 'security.csrf_failed',
				success: false,
				details: {
					action: 'POST /api/agents',
				},
			})
		})

		it('logs rate limit exceeded event', () => {
			logSecurityEvent({
				type: 'security.rate_limit_exceeded',
				action: 'API requests',
				ipAddress: '10.0.0.1',
				userId: 'user_spammer',
				details: {
					limit: 100,
					window: '1m',
				},
			})

			const loggedJson = JSON.parse(consoleSpy.warn.mock.calls[0]![0] as string)
			expect(loggedJson).toMatchObject({
				type: 'security.rate_limit_exceeded',
				userId: 'user_spammer',
				details: {
					action: 'API requests',
					limit: 100,
					window: '1m',
				},
			})
		})

		it('logs invalid input event', () => {
			logSecurityEvent({
				type: 'security.invalid_input',
				action: 'Create agent',
				details: {
					field: 'name',
					error: 'SQL injection attempt detected',
				},
			})

			const loggedJson = JSON.parse(consoleSpy.warn.mock.calls[0]![0] as string)
			expect(loggedJson.type).toBe('security.invalid_input')
			expect(loggedJson.details.field).toBe('name')
		})

		it('logs unauthorized access event', () => {
			logSecurityEvent({
				type: 'security.unauthorized_access',
				action: 'Access workspace',
				userId: 'user_unauthorized',
				details: {
					workspaceId: 'ws_protected',
					requiredRole: 'admin',
				},
			})

			const loggedJson = JSON.parse(consoleSpy.warn.mock.calls[0]![0] as string)
			expect(loggedJson.type).toBe('security.unauthorized_access')
		})

		it('logs suspicious activity event', () => {
			logSecurityEvent({
				type: 'security.suspicious_activity',
				action: 'Multiple failed logins',
				ipAddress: '203.0.113.1',
				details: {
					attempts: 10,
					timeWindow: '5m',
				},
			})

			const loggedJson = JSON.parse(consoleSpy.warn.mock.calls[0]![0] as string)
			expect(loggedJson.type).toBe('security.suspicious_activity')
		})

		it('always marks success as false for security events', () => {
			logSecurityEvent({
				type: 'security.csrf_failed',
				action: 'test',
			})

			const loggedJson = JSON.parse(consoleSpy.warn.mock.calls[0]![0] as string)
			expect(loggedJson.success).toBe(false)
		})
	})

	describe('logDataEvent', () => {
		it('logs data read event', () => {
			logDataEvent({
				type: 'data.read',
				userId: 'user_123',
				resource: 'agent',
				resourceId: 'agent_456',
				workspaceId: 'ws_789',
			})

			expect(consoleSpy.log).toHaveBeenCalledTimes(1)

			const loggedJson = JSON.parse(consoleSpy.log.mock.calls[0]![0] as string)
			expect(loggedJson).toMatchObject({
				type: 'data.read',
				userId: 'user_123',
				workspaceId: 'ws_789',
				success: true,
				details: {
					resource: 'agent',
					resourceId: 'agent_456',
				},
			})
		})

		it('logs data write event', () => {
			logDataEvent({
				type: 'data.write',
				userId: 'user_456',
				resource: 'workspace',
				resourceId: 'ws_new',
				details: {
					operation: 'create',
				},
			})

			const loggedJson = JSON.parse(consoleSpy.log.mock.calls[0]![0] as string)
			expect(loggedJson.type).toBe('data.write')
			expect(loggedJson.details.operation).toBe('create')
		})

		it('logs data delete event', () => {
			logDataEvent({
				type: 'data.delete',
				userId: 'user_789',
				resource: 'agent',
				resourceId: 'agent_deleted',
				requestId: 'req_del_123',
			})

			const loggedJson = JSON.parse(consoleSpy.log.mock.calls[0]![0] as string)
			expect(loggedJson.type).toBe('data.delete')
			expect(loggedJson.requestId).toBe('req_del_123')
		})

		it('always marks success as true', () => {
			logDataEvent({
				type: 'data.read',
				userId: 'user_123',
				resource: 'test',
			})

			const loggedJson = JSON.parse(consoleSpy.log.mock.calls[0]![0] as string)
			expect(loggedJson.success).toBe(true)
		})

		it('handles additional details', () => {
			logDataEvent({
				type: 'data.write',
				userId: 'user_123',
				resource: 'agent',
				details: {
					changedFields: ['name', 'instructions'],
					previousVersion: 1,
					newVersion: 2,
				},
			})

			const loggedJson = JSON.parse(consoleSpy.log.mock.calls[0]![0] as string)
			expect(loggedJson.details.changedFields).toEqual(['name', 'instructions'])
			expect(loggedJson.details.previousVersion).toBe(1)
		})
	})

	describe('createRequestAuditLogger', () => {
		it('creates a logger bound to request context', () => {
			const logger = createRequestAuditLogger({
				requestId: 'req_bound_123',
				ipAddress: '192.168.1.100',
				userAgent: 'TestAgent/1.0',
				userId: 'user_bound',
				workspaceId: 'ws_bound',
			})

			expect(logger).toHaveProperty('logAuth')
			expect(logger).toHaveProperty('logApiKey')
			expect(logger).toHaveProperty('logSecurity')
			expect(logger).toHaveProperty('logData')
		})

		it('logAuth includes bound context', () => {
			const logger = createRequestAuditLogger({
				requestId: 'req_123',
				ipAddress: '10.0.0.1',
				userAgent: 'Mozilla/5.0',
			})

			logger.logAuth({
				type: 'auth.login',
				success: true,
			})

			const loggedJson = JSON.parse(consoleSpy.log.mock.calls[0]![0] as string)
			expect(loggedJson.requestId).toBe('req_123')
			expect(loggedJson.ipAddress).toBe('10.0.0.1')
			expect(loggedJson.userAgent).toBe('Mozilla/5.0')
		})

		it('logApiKey includes bound context', () => {
			const logger = createRequestAuditLogger({
				requestId: 'req_456',
				ipAddress: '172.16.0.1',
			})

			logger.logApiKey({
				type: 'api_key.used',
				apiKeyId: 'key_test',
			})

			const loggedJson = JSON.parse(consoleSpy.log.mock.calls[0]![0] as string)
			expect(loggedJson.requestId).toBe('req_456')
			expect(loggedJson.ipAddress).toBe('172.16.0.1')
		})

		it('logSecurity includes bound context and userId', () => {
			const logger = createRequestAuditLogger({
				requestId: 'req_sec',
				ipAddress: '203.0.113.1',
				userAgent: 'BadBot/1.0',
				userId: 'user_suspicious',
			})

			logger.logSecurity({
				type: 'security.suspicious_activity',
				action: 'Unusual pattern',
			})

			const loggedJson = JSON.parse(consoleSpy.warn.mock.calls[0]![0] as string)
			expect(loggedJson.requestId).toBe('req_sec')
			expect(loggedJson.ipAddress).toBe('203.0.113.1')
			expect(loggedJson.userAgent).toBe('BadBot/1.0')
			expect(loggedJson.userId).toBe('user_suspicious')
		})

		it('logData includes bound context', () => {
			const logger = createRequestAuditLogger({
				requestId: 'req_data',
				userId: 'user_data',
				workspaceId: 'ws_data',
			})

			logger.logData({
				type: 'data.read',
				resource: 'test',
			})

			const loggedJson = JSON.parse(consoleSpy.log.mock.calls[0]![0] as string)
			expect(loggedJson.requestId).toBe('req_data')
			expect(loggedJson.userId).toBe('user_data')
			expect(loggedJson.workspaceId).toBe('ws_data')
		})

		it('handles missing userId in data logger', () => {
			const logger = createRequestAuditLogger({
				requestId: 'req_anon',
			})

			logger.logData({
				type: 'data.read',
				resource: 'public',
			})

			const loggedJson = JSON.parse(consoleSpy.log.mock.calls[0]![0] as string)
			expect(loggedJson.userId).toBe('')
		})

		it('allows overriding userId in individual calls', () => {
			const logger = createRequestAuditLogger({
				requestId: 'req_override',
				userId: 'default_user',
			})

			logger.logAuth({
				type: 'auth.login',
				userId: 'specific_user',
				success: true,
			})

			const loggedJson = JSON.parse(consoleSpy.log.mock.calls[0]![0] as string)
			// Individual call should use specific userId
			expect(loggedJson.userId).toBe('specific_user')
		})
	})

	describe('JSON output format', () => {
		it('produces valid JSON', () => {
			logAuthEvent({
				type: 'auth.login',
				success: true,
				userId: 'user_123',
			})

			const loggedString = consoleSpy.log.mock.calls[0]![0] as string
			expect(() => JSON.parse(loggedString)).not.toThrow()
		})

		it('includes _type and _version metadata', () => {
			logAuthEvent({
				type: 'auth.login',
				success: true,
			})

			const loggedJson = JSON.parse(consoleSpy.log.mock.calls[0]![0] as string)
			expect(loggedJson._type).toBe('audit_log')
			expect(loggedJson._version).toBe('1.0')
		})

		it('handles special characters in strings', () => {
			logAuthEvent({
				type: 'auth.login',
				success: true,
				email: 'user+"special"@example.com',
				reason: 'Test with "quotes" and \\backslashes',
			})

			const loggedString = consoleSpy.log.mock.calls[0]![0] as string
			const loggedJson = JSON.parse(loggedString)
			expect(loggedJson.details.email).toBe('user+"special"@example.com')
		})

		it('handles unicode in strings', () => {
			logAuthEvent({
				type: 'auth.login',
				success: true,
				email: 'user@example.com',
				reason: 'Unicode test: Hello World',
			})

			const loggedString = consoleSpy.log.mock.calls[0]![0] as string
			const loggedJson = JSON.parse(loggedString)
			expect(loggedJson.details.reason).toContain('Hello World')
		})
	})
})
