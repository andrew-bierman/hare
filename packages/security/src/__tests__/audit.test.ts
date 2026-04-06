import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the logger from @hare/config
vi.mock('@hare/config', () => ({
	logger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
	},
}))

import { logger } from '@hare/config'
import {
	createRequestAuditLogger,
	logApiKeyEvent,
	logAuthEvent,
	logDataEvent,
	logSecurityEvent,
} from '../audit'

describe('Audit Logging', () => {
	const loggerSpy = {
		info: logger.info as unknown as ReturnType<typeof vi.fn>,
		warn: logger.warn as unknown as ReturnType<typeof vi.fn>,
	}

	beforeEach(() => {
		vi.clearAllMocks()
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

			expect(loggerSpy.info).toHaveBeenCalledTimes(1)

			const loggedJson = JSON.parse(loggerSpy.info.mock.calls[0]![0] as string)
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

			expect(loggerSpy.info).toHaveBeenCalledTimes(1)

			const loggedJson = JSON.parse(loggerSpy.info.mock.calls[0]![0] as string)
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

			expect(loggerSpy.info).toHaveBeenCalledTimes(1)
			const loggedJson = JSON.parse(loggerSpy.info.mock.calls[0]![0] as string)
			expect(loggedJson.type).toBe('auth.logout')
			expect(loggedJson.userId).toBe('user_456')
		})

		it('logs password reset event', () => {
			logAuthEvent({
				type: 'auth.password_reset',
				email: 'user@example.com',
				success: true,
				ipAddress: '172.16.0.1',
			})

			expect(loggerSpy.info).toHaveBeenCalledTimes(1)
			const loggedJson = JSON.parse(loggerSpy.info.mock.calls[0]![0] as string)
			expect(loggedJson.type).toBe('auth.password_reset')
		})

		it('logs password changed event', () => {
			logAuthEvent({
				type: 'auth.password_changed',
				userId: 'user_789',
				success: true,
			})

			expect(loggerSpy.info).toHaveBeenCalledTimes(1)
			const loggedJson = JSON.parse(loggerSpy.info.mock.calls[0]![0] as string)
			expect(loggedJson.type).toBe('auth.password_changed')
		})

		it('logs session expired event', () => {
			logAuthEvent({
				type: 'auth.session_expired',
				userId: 'user_abc',
				success: true,
			})

			expect(loggerSpy.info).toHaveBeenCalledTimes(1)
			const loggedJson = JSON.parse(loggerSpy.info.mock.calls[0]![0] as string)
			expect(loggedJson.type).toBe('auth.session_expired')
		})

		it('logs session revoked event', () => {
			logAuthEvent({
				type: 'auth.session_revoked',
				userId: 'user_def',
				success: true,
			})

			expect(loggerSpy.info).toHaveBeenCalledTimes(1)
			const loggedJson = JSON.parse(loggerSpy.info.mock.calls[0]![0] as string)
			expect(loggedJson.type).toBe('auth.session_revoked')
		})

		it('includes timestamp in ISO format', () => {
			logAuthEvent({
				type: 'auth.login',
				userId: 'user_123',
				success: true,
			})

			const loggedJson = JSON.parse(loggerSpy.info.mock.calls[0]![0] as string)
			expect(loggedJson.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
		})

		it('handles missing optional fields', () => {
			logAuthEvent({
				type: 'auth.login',
				success: true,
			})

			expect(loggerSpy.info).toHaveBeenCalledTimes(1)
			const loggedJson = JSON.parse(loggerSpy.info.mock.calls[0]![0] as string)
			expect(loggedJson.type).toBe('auth.login')
			expect(loggedJson.success).toBe(true)
		})
	})

	describe('logSecurityEvent', () => {
		it('logs security event with details', () => {
			logSecurityEvent({
				type: 'security.rate_limit_exceeded',
				action: 'rate_limit',
				userId: 'user_123',
				details: { endpoint: '/api/chat', limit: 100 },
				ipAddress: '192.168.1.1',
			})

			expect(loggerSpy.warn).toHaveBeenCalledTimes(1)

			const loggedJson = JSON.parse(loggerSpy.warn.mock.calls[0]![0] as string)
			expect(loggedJson.type).toBe('security.rate_limit_exceeded')
			expect(loggedJson.details.endpoint).toBe('/api/chat')
		})

		it('includes details in security event', () => {
			logSecurityEvent({
				type: 'security.suspicious_activity',
				action: 'suspicious_activity',
				details: { reason: 'multiple failed logins' },
			})

			const loggedJson = JSON.parse(loggerSpy.warn.mock.calls[0]![0] as string)
			expect(loggedJson.type).toBe('security.suspicious_activity')
			expect(loggedJson.details.reason).toBe('multiple failed logins')
		})

		// Security events use logger.warn
		it('uses warn level for security events', () => {
			logSecurityEvent({
				type: 'security.rate_limit_exceeded',
				action: 'rate_limit',
			})

			expect(loggerSpy.warn).toHaveBeenCalledTimes(1)
		})
	})

	describe('logApiKeyEvent', () => {
		it('logs API key creation', () => {
			logApiKeyEvent({
				type: 'api_key.created',
				apiKeyId: 'key_abc',
				userId: 'user_123',
				workspaceId: 'ws_456',
			})

			expect(loggerSpy.info).toHaveBeenCalledTimes(1)
			const loggedJson = JSON.parse(loggerSpy.info.mock.calls[0]![0] as string)
			expect(loggedJson).toMatchObject({
				type: 'api_key.created',
				userId: 'user_123',
				workspaceId: 'ws_456',
			})
		})

		it('logs API key revocation', () => {
			logApiKeyEvent({
				type: 'api_key.revoked',
				apiKeyId: 'key_xyz',
				userId: 'user_123',
				workspaceId: 'ws_456',
			})

			const loggedJson = JSON.parse(loggerSpy.info.mock.calls[0]![0] as string)
			expect(loggedJson.type).toBe('api_key.revoked')
		})

		it('logs API key usage', () => {
			logApiKeyEvent({
				type: 'api_key.used',
				apiKeyId: 'key_abc',
				workspaceId: 'ws_456',
				ipAddress: '10.0.0.1',
			})

			const loggedJson = JSON.parse(loggerSpy.info.mock.calls[0]![0] as string)
			expect(loggedJson.type).toBe('api_key.used')
		})
	})

	describe('logDataEvent', () => {
		it('logs data read event', () => {
			logDataEvent({
				type: 'data.read',
				userId: 'user_123',
				workspaceId: 'ws_456',
				resource: 'conversations',
				details: { format: 'csv', recordCount: 100 },
			})

			expect(loggerSpy.info).toHaveBeenCalledTimes(1)
			const loggedJson = JSON.parse(loggerSpy.info.mock.calls[0]![0] as string)
			expect(loggedJson.type).toBe('data.read')
			expect(loggedJson.workspaceId).toBe('ws_456')
		})

		it('logs data deletion event', () => {
			logDataEvent({
				type: 'data.delete',
				userId: 'user_123',
				workspaceId: 'ws_456',
				resource: 'conversations',
				details: { count: 5 },
			})

			const loggedJson = JSON.parse(loggerSpy.info.mock.calls[0]![0] as string)
			expect(loggedJson.type).toBe('data.delete')
		})
	})

	describe('createRequestAuditLogger', () => {
		it('creates a logger with requestId', () => {
			const requestLogger = createRequestAuditLogger({ requestId: 'req_test_123' })

			requestLogger.logAuth({
				type: 'auth.login',
				userId: 'user_123',
				success: true,
			})

			const loggedJson = JSON.parse(loggerSpy.info.mock.calls[0]![0] as string)
			expect(loggedJson.requestId).toBe('req_test_123')
		})

		it('provides all logging methods', () => {
			const requestLogger = createRequestAuditLogger({ requestId: 'req_abc' })
			expect(requestLogger.logAuth).toBeDefined()
			expect(requestLogger.logSecurity).toBeDefined()
			expect(requestLogger.logApiKey).toBeDefined()
			expect(requestLogger.logData).toBeDefined()
		})
	})
})
