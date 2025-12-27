/**
 * Security module exports
 * Provides comprehensive security utilities for the Hare platform
 */

// Password validation
export {
	validatePassword,
	calculatePasswordEntropy,
	generateSecurePassword,
	type PasswordValidationResult,
	type PasswordValidationOptions,
} from './password'

// Encryption utilities
export {
	encryptData,
	decryptData,
	hashData,
	generateSecret,
	timingSafeEqual,
} from './encryption'

// CSRF protection
export {
	generateCsrfToken,
	getCsrfToken,
	validateCsrfToken,
	csrfProtection,
	setCsrfCookie,
} from './csrf'

// Audit logging
export {
	logAuthEvent,
	logApiKeyEvent,
	logSecurityEvent,
	logDataEvent,
	createRequestAuditLogger,
	type AuditEventType,
	type AuditLogEntry,
	type AuthEventParams,
	type ApiKeyEventParams,
	type SecurityEventParams,
	type DataEventParams,
} from './audit'

// Request validation
export {
	requestSizeLimit,
	requireContentType,
	blockDangerousHeaders,
	validateJsonBody,
	requestValidation,
	type RequestSizeLimitOptions,
} from './request-validation'
