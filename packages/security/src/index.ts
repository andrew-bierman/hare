/**
 * @hare/security - Security utilities for Hare platform
 *
 * Provides comprehensive security utilities including:
 * - Audit logging for security events
 * - CSRF protection middleware
 * - Encryption/decryption utilities
 * - Password validation and generation
 * - Request validation middleware
 */

// Audit logging
export {
	type ApiKeyEventParams,
	type AuditEventType,
	type AuditLogEntry,
	type AuthEventParams,
	createRequestAuditLogger,
	type DataEventParams,
	logApiKeyEvent,
	logAuthEvent,
	logDataEvent,
	logSecurityEvent,
	type SecurityEventParams,
} from './audit'

// CSRF protection
export {
	csrfProtection,
	generateCsrfToken,
	getCsrfToken,
	setCsrfCookie,
	validateCsrfToken,
} from './csrf'

// Encryption utilities
export {
	decryptData,
	encryptData,
	generateSecret,
	hashData,
	timingSafeEqual,
} from './encryption'

// Password validation
export {
	calculatePasswordEntropy,
	generateSecurePassword,
	type PasswordValidationOptions,
	type PasswordValidationResult,
	validatePassword,
} from './password'

// Request validation
export {
	blockDangerousHeaders,
	type RequestSizeLimitOptions,
	requestSizeLimit,
	requestValidation,
	requireContentType,
	validateJsonBody,
} from './request-validation'
