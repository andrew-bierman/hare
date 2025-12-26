/**
 * Security utilities index
 * Centralized export for all security modules
 */

// Password security
export {
	calculatePasswordEntropy,
	checkPasswordBreach,
	generateSecurePassword,
	validatePassword,
	type PasswordValidationResult,
} from './password'

// CSRF protection
export {
	csrfProtection,
	generateCsrfToken,
	getCsrfToken,
	setCsrfCookie,
	validateCsrfToken,
} from './csrf'

// Audit logging
export {
	getAuditLogs,
	logApiKeyEvent,
	logAuditEvent,
	logAuthEvent,
	logDataAccessEvent,
	logSecurityEvent,
	type AuditEvent,
	type AuditEventType,
	type AuditLogQuery,
} from './audit'

// Request validation
export {
	requestSizeLimit,
	requireContentType,
	requireHeaders,
	sanitizeHeaders,
	validateJsonBody,
} from './request-validation'

// Encryption
export {
	decryptData,
	encryptData,
	generateSecret,
	hashData,
	timingSafeEqual,
} from './encryption'
